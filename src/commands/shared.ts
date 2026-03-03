import { appendFile, mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Browser, Page } from "playwright";
import { connectCdp } from "../core/cdp";
import { EXIT_CODE } from "../utils/logger";
import {
	clearSessionState,
	ensureStateDir,
	isProcessRunning,
	readSessionState,
	type ElectronSessionState,
	type RouteRule,
} from "../utils/state";

interface RendererContext {
	browser: Browser;
	page: Page;
	session: ElectronSessionState;
	windowIndex: number;
}

interface ConsoleEntry {
	timestamp: string;
	windowIndex: number;
	type: string;
	text: string;
}

interface NetworkEntry {
	timestamp: string;
	windowIndex: number;
	url: string;
	method: string;
	status: number | null;
	success: boolean;
	errorText?: string;
}

async function applyStoredRoutes(
	page: Page,
	routeRules: RouteRule[],
): Promise<void> {
	for (const routeRule of routeRules) {
		await page.route(routeRule.pattern, async (route) => {
			if (routeRule.action === "continue") {
				await route.continue();
				return;
			}

			await route.abort();
		});
	}
}

async function persistJsonl(
	filePath: string,
	entries: unknown[],
): Promise<void> {
	if (entries.length === 0) {
		return;
	}

	const payload = `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
	await appendFile(filePath, payload, "utf8");
}

async function captureVideoFrameIfEnabled(
	page: Page,
	session: ElectronSessionState,
	windowIndex: number,
): Promise<void> {
	const recording = session.videoRecording;
	if (!recording?.active) {
		return;
	}

	await mkdir(recording.framesDir, { recursive: true });
	const stamp = new Date().toISOString().replaceAll(":", "-");
	const framePath = resolve(
		recording.framesDir,
		`frame-${stamp}-${Date.now()}.png`,
	);
	await page.screenshot({ path: framePath, fullPage: true });

	const frameEntry = {
		timestamp: new Date().toISOString(),
		windowIndex,
		framePath,
		name: basename(framePath),
		pageUrl: page.url(),
	};
	await appendFile(
		recording.manifestPath,
		`${JSON.stringify(frameEntry)}\n`,
		"utf8",
	);
}

export function parseWindowIndex(rawWindowIndex: string | undefined): number {
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

export function parseNumberArg(name: string, raw: string): number {
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) {
		throw new Error(`Error: Invalid ${name}. Expected a number.`);
	}
	return parsed;
}

export async function withRendererContext<T>(
	rawWindowIndex: string | undefined,
	action: (context: RendererContext) => Promise<T>,
): Promise<T> {
	const windowIndex = parseWindowIndex(rawWindowIndex);
	const session = await readSessionState();

	if (!isProcessRunning(session.pid)) {
		await clearSessionState();
		throw new Error(
			"Error: Electron process died. Please run e-cli launch again.",
		);
	}

	const cdpSession = await connectCdp(session.wsEndpoint, windowIndex);
	const consoleEntries: ConsoleEntry[] = [];
	const networkEntries: NetworkEntry[] = [];

	const onConsole = (message: { type: () => string; text: () => string }) => {
		consoleEntries.push({
			timestamp: new Date().toISOString(),
			windowIndex,
			type: message.type(),
			text: message.text(),
		});
	};

	const onRequestFinished = async (request: {
		url: () => string;
		method: () => string;
		response: () => Promise<{ status: () => number } | null>;
	}) => {
		const response = await request.response();
		networkEntries.push({
			timestamp: new Date().toISOString(),
			windowIndex,
			url: request.url(),
			method: request.method(),
			status: response?.status() ?? null,
			success: true,
		});
	};

	const onRequestFailed = (request: {
		url: () => string;
		method: () => string;
		failure: () => { errorText: string } | null;
	}) => {
		networkEntries.push({
			timestamp: new Date().toISOString(),
			windowIndex,
			url: request.url(),
			method: request.method(),
			status: null,
			success: false,
			errorText: request.failure()?.errorText,
		});
	};

	cdpSession.page.on("console", onConsole);
	cdpSession.page.on("requestfinished", onRequestFinished);
	cdpSession.page.on("requestfailed", onRequestFailed);

	if (session.routeRules?.length) {
		await applyStoredRoutes(cdpSession.page, session.routeRules);
	}

	try {
		const result = await action({
			browser: cdpSession.browser,
			page: cdpSession.page,
			session,
			windowIndex,
		});

		await captureVideoFrameIfEnabled(
			cdpSession.page,
			session,
			windowIndex,
		).catch(() => {
			// Best-effort video frame capture.
		});

		return result;
	} finally {
		cdpSession.page.off("console", onConsole);
		cdpSession.page.off("requestfinished", onRequestFinished);
		cdpSession.page.off("requestfailed", onRequestFailed);

		const stateDir = await ensureStateDir();
		await persistJsonl(
			resolve(stateDir, "console.jsonl"),
			consoleEntries,
		).catch(() => {
			// Best-effort artifact persistence.
		});
		await persistJsonl(
			resolve(stateDir, "network.jsonl"),
			networkEntries,
		).catch(() => {
			// Best-effort artifact persistence.
		});

		await cdpSession.browser.close().catch(() => {
			// Best-effort cleanup.
		});
	}
}

export function mapAutomationError(
	error: unknown,
	fallbackMessage: string,
): { code: number; message: string } {
	const message =
		error instanceof Error ? error.message : "Unknown automation error.";

	if (
		message.startsWith("Error: Invalid windowIndex") ||
		message.startsWith("Error: Invalid ")
	) {
		return { code: EXIT_CODE.INVALID_ARGS, message };
	}

	if (
		message.startsWith("Error: No active session") ||
		message.startsWith("Error: Session")
	) {
		return { code: EXIT_CODE.SESSION, message };
	}

	if (
		/ECONNREFUSED|ENOENT|EPIPE|No renderer context available|Renderer window index out of range|Electron process died/i.test(
			message,
		)
	) {
		return {
			code: EXIT_CODE.SESSION,
			message: "Error: Electron process died. Please run e-cli launch again.",
		};
	}

	if (message.startsWith("Error:")) {
		return { code: EXIT_CODE.ACTION, message };
	}

	return { code: EXIT_CODE.ACTION, message: `${fallbackMessage} ${message}` };
}
