import type { Command } from "commander";
import { resolve } from "node:path";
import { connectCdp } from "../core/cdp";
import { EXIT_CODE, fail, logInfo } from "../utils/logger";
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

export function registerFillCommand(program: Command): void {
	program
		.command("fill")
		.argument("<selector>")
		.argument("<text>")
		.argument("[windowIndex]")
		.description("Fill text into a renderer element by selector")
		.action(async (selector: string, text: string, rawWindowIndex?: string) => {
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

				await cdpSession.page
					.locator(selector)
					.first()
					.fill(text, { timeout: 10_000 });

				const stateDir = await ensureStateDir();
				const screenshotPath = resolve(stateDir, "last-action.png");
				await cdpSession.page.screenshot({
					path: screenshotPath,
					fullPage: true,
				});

				logInfo(`Filled. Screenshot: ${screenshotPath}`);
				await browser.close();
				browserClosed = true;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown fill error.";
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

				if (
					/Timeout|strict mode violation|No node found|waiting for/i.test(
						message,
					)
				) {
					fail(`Error: Selector not found: ${selector}`, EXIT_CODE.ACTION);
					return;
				}

				fail(`Error: Failed to fill selector. ${message}`, EXIT_CODE.ACTION);
			} finally {
				if (!browserClosed && browser) {
					await browser.close().catch(() => {
						// No-op cleanup fallback.
					});
				}
			}
		});
}
