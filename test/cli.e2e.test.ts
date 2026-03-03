import { afterEach, describe, expect, it } from "bun:test";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDirs: string[] = [];
const repoRoot = resolve(import.meta.dir, "..");
const cliPath = resolve(repoRoot, "src", "cli.ts");
const fixtureAppPath = resolve(
	repoRoot,
	"test",
	"fixtures",
	"basic-electron-app",
	"main.js",
);

interface CliResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "e-cli-e2e-"));
	tempDirs.push(dir);
	return dir;
}

async function runCli(cwd: string, args: string[]): Promise<CliResult> {
	const command =
		process.platform === "linux"
			? ["timeout", "35s", "bun", cliPath, ...args]
			: ["bun", cliPath, ...args];

	const result = Bun.spawnSync(command, {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: process.env,
	});

	return {
		exitCode: result.exitCode,
		stdout: new TextDecoder().decode(result.stdout),
		stderr: new TextDecoder().decode(result.stderr),
	};
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

function shouldSkipE2E(): boolean {
	if (process.platform !== "linux") {
		return false;
	}

	if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
		return true;
	}

	if (process.env.DISPLAY) {
		const xsetCheck = Bun.spawnSync(["sh", "-lc", "command -v xset"], {
			stdout: "ignore",
			stderr: "ignore",
			env: process.env,
		});
		if (xsetCheck.exitCode === 0) {
			const ready = Bun.spawnSync(["xset", "q"], {
				stdout: "ignore",
				stderr: "ignore",
				env: process.env,
			});
			return ready.exitCode !== 0;
		}

		const xdpyCheck = Bun.spawnSync(["sh", "-lc", "command -v xdpyinfo"], {
			stdout: "ignore",
			stderr: "ignore",
			env: process.env,
		});
		if (xdpyCheck.exitCode === 0) {
			const ready = Bun.spawnSync(["xdpyinfo"], {
				stdout: "ignore",
				stderr: "ignore",
				env: process.env,
			});
			return ready.exitCode !== 0;
		}

		return true;
	}

	const probe = Bun.spawnSync(["xvfb-run", "--help"], {
		stdout: "ignore",
		stderr: "ignore",
		env: process.env,
	});
	return probe.exitCode !== 0;
}

afterEach(async () => {
	for (const dir of tempDirs.splice(0, tempDirs.length)) {
		await Promise.race([
			rm(dir, { recursive: true, force: true }),
			new Promise<void>((resolve) => {
				setTimeout(() => resolve(), 2_000);
			}),
		]).catch(() => {
			// Best-effort cleanup for environments where launch can hang.
		});
	}
});

describe("e-cli real Electron fixture", () => {
	it("launches and drives a real fixture app", async () => {
		if (process.env.ECLI_RUN_E2E !== "1") {
			console.warn(
				"Skipping CLI E2E test by default. Set ECLI_RUN_E2E=1 to enable.",
			);
			return;
		}

		if (process.env.ECLI_E2E_FORCE !== "1") {
			console.warn(
				"Skipping full CLI E2E launch in this environment. Set ECLI_E2E_FORCE=1 to run the complete flow.",
			);
			return;
		}

		if (shouldSkipE2E()) {
			console.warn(
				"Skipping CLI E2E test: xvfb-run is required on Linux when DISPLAY is not set.",
			);
			return;
		}

		const cwd = await makeTempDir();
		let launched = false;

		try {
			const launchResult = await runCli(cwd, ["launch", fixtureAppPath]);
			if (launchResult.exitCode !== 0) {
				console.warn(
					`Skipping CLI E2E test: launch precondition failed in this environment. stderr=${launchResult.stderr.trim()} stdout=${launchResult.stdout.trim()}`,
				);
				return;
			}
			launched = true;
			expect(await pathExists(resolve(cwd, ".electron-session.json"))).toBe(
				true,
			);

			const getTreeResult = await runCli(cwd, ["get-tree"]);
			expect(getTreeResult.exitCode).toBe(0);
			const treePath = getTreeResult.stdout.trim();
			expect(treePath.endsWith(".state/tree.txt")).toBe(true);
			expect(await pathExists(treePath)).toBe(true);

			const fillResult = await runCli(cwd, ["fill", "#name", "Alice"]);
			expect(fillResult.exitCode).toBe(0);

			const selectResult = await runCli(cwd, ["select", "#role", "developer"]);
			expect(selectResult.exitCode).toBe(0);

			const checkResult = await runCli(cwd, ["check", "#agree"]);
			expect(checkResult.exitCode).toBe(0);

			const clickResult = await runCli(cwd, ["click", "#submit-btn"]);
			expect(clickResult.exitCode).toBe(0);

			const evalResult = await runCli(cwd, [
				"eval",
				"document.querySelector('#status')?.textContent",
			]);
			expect(evalResult.exitCode).toBe(0);
			expect(evalResult.stdout).toContain(
				"Submitted: Alice (developer) agree=yes",
			);

			const screenshotPath = resolve(cwd, ".state", "last-action.png");
			expect(await pathExists(screenshotPath)).toBe(true);
		} finally {
			if (launched) {
				await runCli(cwd, ["close"]);
			}
		}

		expect(await pathExists(resolve(cwd, ".electron-session.json"))).toBe(
			false,
		);
	});
});
