import { appendFile, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { DrainContext } from "evlog";
import { initLogger, log } from "evlog";
import { createDrainPipeline } from "evlog/pipeline";
import { ensureStateDir } from "./state";

const LOGS_DIR_NAME = "logs";
const EVENTS_FILE_NAME = "events.jsonl";
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_ARCHIVES = 8;

const pipeline = createDrainPipeline<DrainContext>({
	batch: {
		size: 25,
		intervalMs: 1500,
	},
	retry: {
		maxAttempts: 2,
		backoff: "fixed",
		initialDelayMs: 500,
		maxDelayMs: 2000,
	},
});

const drain = pipeline(async (batch) => {
	const logsDir = await getLogsDirPath();
	const eventsPath = resolve(logsDir, EVENTS_FILE_NAME);
	await rotateIfNeeded(eventsPath, logsDir);
	const payload = `${batch
		.map((entry) => JSON.stringify(entry.event))
		.join("\n")}\n`;
	await appendFile(eventsPath, payload, "utf8");
});

let initialized = false;

async function getLogsDirPath(): Promise<string> {
	const stateDir = await ensureStateDir();
	const logsDir = resolve(stateDir, LOGS_DIR_NAME);
	await mkdir(logsDir, { recursive: true });
	return logsDir;
}

async function rotateIfNeeded(
	eventsPath: string,
	logsDir: string,
): Promise<void> {
	let currentSize = 0;
	try {
		const details = await stat(eventsPath);
		currentSize = details.size;
	} catch {
		return;
	}

	if (currentSize < DEFAULT_MAX_BYTES) {
		return;
	}

	const archivePath = resolve(logsDir, `events-${Date.now()}.jsonl`);
	await rename(eventsPath, archivePath);

	const files = await readdir(logsDir);
	const archives = files
		.filter((name) => /^events-\d+\.jsonl$/.test(name))
		.sort((left, right) => right.localeCompare(left));

	for (const stale of archives.slice(MAX_ARCHIVES)) {
		await rm(resolve(logsDir, stale), { force: true });
	}
}

function resolveEnvironment(): string {
	if (process.env.NODE_ENV && process.env.NODE_ENV.length > 0) {
		return process.env.NODE_ENV;
	}

	return "development";
}

export function initTelemetry(): void {
	if (initialized) {
		return;
	}

	initLogger({
		console: false,
		env: {
			service: "electron-automation-cli",
			environment: resolveEnvironment(),
		},
		drain,
	});

	initialized = true;

	process.on("beforeExit", () => {
		void drain.flush().catch(() => {
			// Best-effort flush.
		});
	});
}

export function emitTelemetry(
	level: "info" | "warn" | "error" | "debug",
	message: string,
	context?: Record<string, unknown>,
): void {
	initTelemetry();
	const payload = {
		message,
		source: "e-cli",
		...context,
	};

	if (level === "info") {
		log.info(payload);
		return;
	}

	if (level === "warn") {
		log.warn(payload);
		return;
	}

	if (level === "debug") {
		log.debug(payload);
		return;
	}

	log.error(payload);
}

export async function flushTelemetry(): Promise<void> {
	initTelemetry();
	await drain.flush();
}

export async function getTelemetryLogPaths(): Promise<string[]> {
	const logsDir = await getLogsDirPath();
	const files = await readdir(logsDir);
	const paths = files
		.filter((name) => name.endsWith(".jsonl"))
		.sort((left, right) => left.localeCompare(right))
		.map((name) => resolve(logsDir, name));

	return paths;
}

export async function clearTelemetryLogs(): Promise<void> {
	const logsDir = await getLogsDirPath();
	await rm(logsDir, { recursive: true, force: true });
	await mkdir(logsDir, { recursive: true });
}
