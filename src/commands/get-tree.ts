import type { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { connectCdp } from "../core/cdp";
import { EXIT_CODE, fail } from "../utils/logger";
import {
	clearSessionState,
	ensureStateDir,
	isProcessRunning,
	readSessionState,
} from "../utils/state";

function parseWindowIndex(rawWindowIndex: string | undefined): number {
	if (rawWindowIndex === undefined) {
		return 0;
	}

	const parsed = Number.parseInt(rawWindowIndex, 10);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(
			"Error: Invalid windowIndex. Expected a non-negative integer.",
		);
	}

	return parsed;
}

export function registerGetTreeCommand(program: Command): void {
	program
		.command("get-tree")
		.argument("[windowIndex]")
		.description("Export the accessibility tree for a renderer window")
		.action(async (rawWindowIndex?: string) => {
			let browserClosed = false;
			let browser: Awaited<ReturnType<typeof connectCdp>>["browser"] | null =
				null;

			try {
				const windowIndex = parseWindowIndex(rawWindowIndex);
				const session = await readSessionState();

				if (!isProcessRunning(session.pid)) {
					await clearSessionState();
					fail(
						"Error: Electron process died. Please run e-cli launch again.",
						EXIT_CODE.SESSION,
					);
					return;
				}

				const cdpSession = await connectCdp(session.wsEndpoint, windowIndex);
				browser = cdpSession.browser;

				const client = await cdpSession.page
					.context()
					.newCDPSession(cdpSession.page);
				const tree = await client.send("Accessibility.getFullAXTree");
				await client.detach();
				const stateDir = await ensureStateDir();
				const treePath = resolve(stateDir, "tree.txt");
				await writeFile(treePath, `${JSON.stringify(tree, null, 2)}\n`, "utf8");

				console.log(treePath);
				await browser.close();
				browserClosed = true;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown get-tree error.";
				if (message.startsWith("Error: Invalid windowIndex")) {
					fail(message, EXIT_CODE.INVALID_ARGS);
					return;
				}

				if (message.startsWith("Error: No active session")) {
					fail(message, EXIT_CODE.SESSION);
					return;
				}

				if (
					/ECONNREFUSED|context available|Renderer window index out of range/i.test(
						message,
					)
				) {
					fail(
						"Error: Electron process died. Please run e-cli launch again.",
						EXIT_CODE.SESSION,
					);
					return;
				}

				fail(`Error: Failed to export tree. ${message}`, EXIT_CODE.ACTION);
			} finally {
				if (!browserClosed && browser) {
					await browser.close().catch(() => {
						// No-op cleanup fallback.
					});
				}
			}
		});
}
