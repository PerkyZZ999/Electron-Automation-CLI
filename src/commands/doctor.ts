import { access, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { Command } from "commander";
import { EXIT_CODE } from "../utils/logger";
import { ensureStateDir } from "../utils/state";
import { getTelemetryLogPaths, initTelemetry } from "../utils/telemetry";

interface DoctorOptions {
	json?: boolean;
}

interface CheckResult {
	name: string;
	status: "ok" | "warn" | "fail";
	detail: string;
}

function hasCommand(command: string): boolean {
	const probe = spawnSync("sh", ["-lc", `command -v ${command}`], {
		stdio: "ignore",
	});
	return probe.status === 0;
}

async function runChecks(): Promise<CheckResult[]> {
	const results: CheckResult[] = [];

	results.push({
		name: "bun-runtime",
		status: process.versions.bun ? "ok" : "fail",
		detail: process.versions.bun
			? `Bun ${process.versions.bun}`
			: "Bun runtime not detected.",
	});

	try {
		await import("playwright");
		results.push({
			name: "dependency-playwright",
			status: "ok",
			detail: "playwright module available.",
		});
	} catch {
		results.push({
			name: "dependency-playwright",
			status: "fail",
			detail: "playwright module missing. Run bun install.",
		});
	}

	try {
		await import("electron/package.json");
		results.push({
			name: "dependency-electron",
			status: "ok",
			detail: "electron module available.",
		});
	} catch {
		results.push({
			name: "dependency-electron",
			status: "fail",
			detail: "electron module missing. Run bun install.",
		});
	}

	const stateDir = await ensureStateDir();
	const writeProbe = resolve(stateDir, ".doctor-write-probe");
	try {
		await writeFile(writeProbe, "ok", "utf8");
		await rm(writeProbe, { force: true });
		results.push({
			name: "state-dir",
			status: "ok",
			detail: `Writable: ${stateDir}`,
		});
	} catch {
		results.push({
			name: "state-dir",
			status: "fail",
			detail: `Unable to write to ${stateDir}`,
		});
	}

	if (process.platform === "linux") {
		if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY) {
			results.push({
				name: "display",
				status: "ok",
				detail: `Display available (${process.env.DISPLAY ?? process.env.WAYLAND_DISPLAY}).`,
			});
		} else if (hasCommand("xvfb-run")) {
			results.push({
				name: "display",
				status: "warn",
				detail: "No DISPLAY set; xvfb-run available for headless mode.",
			});
		} else {
			results.push({
				name: "display",
				status: "fail",
				detail:
					"No DISPLAY and xvfb-run not found. Install xorg-server-xvfb or run in a desktop session.",
			});
		}
	}

	const binaryPath = resolve(process.cwd(), "dist", "e-cli");
	try {
		await access(binaryPath);
		results.push({
			name: "binary",
			status: "ok",
			detail: `Binary exists: ${binaryPath}`,
		});
	} catch {
		results.push({
			name: "binary",
			status: "warn",
			detail: "No compiled binary found. Run bun run build:binary.",
		});
	}

	initTelemetry();
	const logPaths = await getTelemetryLogPaths();
	results.push({
		name: "evlog",
		status: "ok",
		detail:
			logPaths.length > 0
				? `evlog initialized with ${logPaths.length} log file(s).`
				: "evlog initialized. Logs will be written to .state/logs/.",
	});

	return results;
}

function printTextReport(results: CheckResult[]): void {
	for (const result of results) {
		const badge =
			result.status === "ok"
				? "[OK]"
				: result.status === "warn"
					? "[WARN]"
					: "[FAIL]";
		console.log(`${badge} ${result.name} - ${result.detail}`);
	}
}

export function registerDoctorCommand(program: Command): void {
	program
		.command("doctor")
		.option("--json", "print JSON report")
		.description("Run local production preflight checks")
		.action(async (options?: DoctorOptions) => {
			const results = await runChecks();

			if (options?.json) {
				console.log(JSON.stringify(results, null, 2));
			} else {
				printTextReport(results);
			}

			const hasFailure = results.some((result) => result.status === "fail");
			if (hasFailure) {
				process.exitCode = EXIT_CODE.GENERAL;
			}
		});
}
