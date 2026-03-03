import { emitTelemetry, initTelemetry } from "./telemetry";

export const EXIT_CODE = {
	SUCCESS: 0,
	GENERAL: 1,
	INVALID_ARGS: 2,
	SESSION: 3,
	ACTION: 4,
} as const;

export function logInfo(message: string): void {
	initTelemetry();
	console.log(message);
	emitTelemetry("info", message);
}

export function logError(message: string): void {
	initTelemetry();
	console.error(message);
	emitTelemetry("error", message);
}

export function fail(message: string, code: number): void {
	initTelemetry();
	logError(message);
	process.exitCode = code;
}
