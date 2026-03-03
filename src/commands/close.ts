import { rm } from "node:fs/promises";
import type { Command } from "commander";
import { EXIT_CODE, fail, logInfo } from "../utils/logger";
import {
	clearSessionState,
	isProcessRunning,
	readSessionState,
} from "../utils/state";

function sleep(ms: number): Promise<void> {
	return new Promise((resolvePromise) => {
		setTimeout(resolvePromise, ms);
	});
}

async function terminateProcess(pid: number): Promise<void> {
	if (!isProcessRunning(pid)) {
		return;
	}

	try {
		process.kill(pid, "SIGTERM");
	} catch {
		return;
	}

	const maxChecks = 20;
	for (let check = 0; check < maxChecks; check += 1) {
		if (!isProcessRunning(pid)) {
			return;
		}

		await sleep(100);
	}

	if (isProcessRunning(pid)) {
		process.kill(pid, "SIGKILL");
	}
}

export function registerCloseCommand(program: Command): void {
	program
		.command("close")
		.description("Close the active Electron automation session")
		.action(async () => {
			try {
				const session = await readSessionState();

				if (!isProcessRunning(session.pid)) {
					await clearSessionState();
					fail(
						"Error: Electron process died. Please run e-cli launch again.",
						EXIT_CODE.SESSION,
					);
					return;
				}

				await terminateProcess(session.pid);
				await clearSessionState();
				if (session.mainSocketPath) {
					await rm(session.mainSocketPath, { force: true }).catch(() => {
						// Ignore stale socket cleanup failures.
					});
				}
				logInfo("Session closed.");
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown close error.";
				if (message.startsWith("Error: No active session")) {
					fail(message, EXIT_CODE.SESSION);
					return;
				}

				fail(
					`Error: Failed to close active session. ${message}`,
					EXIT_CODE.GENERAL,
				);
			}
		});
}
