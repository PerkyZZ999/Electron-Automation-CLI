import { spawn, spawnSync } from "node:child_process";
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
