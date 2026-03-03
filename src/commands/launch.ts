import { spawn, spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import type { Command } from "commander";
import { launchElectron } from "../core/launcher";
import { EXIT_CODE, fail, logInfo } from "../utils/logger";
import {
	clearSessionState,
	hasSessionState,
	isProcessRunning,
	readSessionState,
	writeSessionState,
} from "../utils/state";

interface LaunchCommandOptions {
	headless?: boolean;
}

function shouldUseXvfb(options: LaunchCommandOptions): boolean {
	return (
		process.platform === "linux" &&
		(options.headless === true || !process.env.DISPLAY) &&
		process.env.ECLI_XVFB_ACTIVE !== "1"
	);
}

async function runUnderXvfb(): Promise<number> {
	const probe = spawnSync("xvfb-run", ["--help"], { stdio: "ignore" });
	if (probe.status !== 0) {
		throw new Error(
			"Error: xvfb-run is required for Linux headless mode. Install xorg-server-xvfb and retry.",
		);
	}

	return await new Promise<number>((resolvePromise, rejectPromise) => {
		const child = spawn(
			"xvfb-run",
			["-a", process.execPath, ...process.argv.slice(1)],
			{
				stdio: "inherit",
				env: {
					...process.env,
					ECLI_XVFB_ACTIVE: "1",
				},
			},
		);

		child.once("error", rejectPromise);
		child.once("exit", (code) => {
			resolvePromise(code ?? EXIT_CODE.GENERAL);
		});
	});
}

function shouldUseNodeLaunchFallback(): boolean {
	return process.env.ECLI_DISABLE_NODE_LAUNCH !== "1";
}

async function launchViaNodeHelper(
	appPath: string,
	options: LaunchCommandOptions,
): Promise<string> {
	const helperPath = resolve(
		process.cwd(),
		"scripts",
		"node-electron-launch.cjs",
	);
	await access(helperPath);

	return await new Promise<string>((resolvePromise, rejectPromise) => {
		const args = [helperPath, appPath];
		if (options.headless) {
			args.push("--headless");
		}

		const child = spawn("node", args, {
			detached: true,
			stdio: ["ignore", "pipe", "pipe"],
			env: {
				...process.env,
			},
		});

		let stdout = "";
		let stderr = "";
		let settled = false;

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString("utf8");
			if (settled) {
				return;
			}

			const sessionPath = stdout
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.at(-1);

			if (sessionPath) {
				settled = true;
				child.unref();
				resolvePromise(sessionPath);
			}
		});

		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString("utf8");
		});

		child.once("error", rejectPromise);
		child.once("exit", (code) => {
			if (settled) {
				return;
			}

			const message =
				stderr.trim() ||
				stdout.trim() ||
				`Node launch helper failed with exit code ${code ?? "unknown"}.`;
			settled = true;
			rejectPromise(new Error(message));
		});
	});
}

export function registerLaunchCommand(program: Command): void {
	program
		.command("launch")
		.argument("<appPath>")
		.option("--headless")
		.description("Launch an Electron app and persist the CLI session")
		.action(async (appPath: string, options: LaunchCommandOptions) => {
			try {
				if (shouldUseXvfb(options)) {
					const code = await runUnderXvfb();
					process.exit(code);
				}

				if (await hasSessionState()) {
					const existing = await readSessionState();
					if (isProcessRunning(existing.pid)) {
						fail(
							"Error: Active session already exists. Run e-cli close first.",
							EXIT_CODE.SESSION,
						);
						return;
					}

					await clearSessionState();
				}

				if (shouldUseNodeLaunchFallback()) {
					const sessionPath = await launchViaNodeHelper(appPath, options);
					logInfo(`Session created: ${sessionPath}`);
					process.exit(EXIT_CODE.SUCCESS);
					return;
				}

				const session = await launchElectron({
					appPath,
					headless: options.headless,
				});

				const sessionPath = await writeSessionState(session);
				logInfo(`Session created: ${sessionPath}`);
				process.exit(EXIT_CODE.SUCCESS);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown launch error.";
				if (message.startsWith("Error:")) {
					fail(message, EXIT_CODE.GENERAL);
					return;
				}

				fail(
					`Error: Failed to launch Electron app. ${message}`,
					EXIT_CODE.GENERAL,
				);
			}
		});
}
