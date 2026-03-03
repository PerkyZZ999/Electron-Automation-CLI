import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { EXIT_CODE, fail, logInfo } from "../utils/logger";
import {
	clearTelemetryLogs,
	flushTelemetry,
	getTelemetryLogPaths,
} from "../utils/telemetry";

interface LogsOptions {
	tail?: string;
	json?: boolean;
}

function parseTailCount(rawTail: string | undefined): number {
	if (!rawTail) {
		return 100;
	}

	const parsed = Number.parseInt(rawTail, 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error("Error: Invalid tail value. Expected a positive integer.");
	}

	return parsed;
}

export function registerLogsCommands(program: Command): void {
	program
		.command("logs")
		.option("--tail <count>", "number of lines to show", "100")
		.option("--json", "parse and pretty-print JSON log lines")
		.description("Show local evlog artifacts from .state/logs")
		.action(async (options?: LogsOptions) => {
			try {
				const tailCount = parseTailCount(options?.tail);
				await flushTelemetry().catch(() => {
					// Best-effort flush before read.
				});

				const paths = await getTelemetryLogPaths();
				if (paths.length === 0) {
					console.log("[]");
					return;
				}

				const selectedPath = paths[paths.length - 1];
				if (!selectedPath) {
					console.log("[]");
					return;
				}
				const raw = await readFile(selectedPath, "utf8");
				const lines = raw
					.split("\n")
					.filter((line) => line.trim().length > 0)
					.slice(-tailCount);

				if (options?.json) {
					const parsed = lines.map((line) => {
						try {
							return JSON.parse(line);
						} catch {
							return { malformed: line };
						}
					});
					console.log(JSON.stringify(parsed, null, 2));
					return;
				}

				console.log(lines.join("\n"));
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown logs error.";
				if (message.startsWith("Error:")) {
					fail(message, EXIT_CODE.INVALID_ARGS);
					return;
				}

				fail(`Error: Failed to read logs. ${message}`, EXIT_CODE.GENERAL);
			}
		});

	program
		.command("logs-clear")
		.description("Clear local evlog artifact files from .state/logs")
		.action(async () => {
			try {
				await clearTelemetryLogs();
				logInfo("Logs cleared: .state/logs");
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown logs-clear error.";
				fail(`Error: Failed to clear logs. ${message}`, EXIT_CODE.GENERAL);
			}
		});
}
