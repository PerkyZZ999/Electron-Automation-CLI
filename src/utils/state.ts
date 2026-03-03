import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type RouteAction = "abort" | "continue";

export interface RouteRule {
	pattern: string;
	action: RouteAction;
}

export interface TracingMetadata {
	active: boolean;
	outputPath?: string;
}

export interface VideoRecordingMetadata {
	active: boolean;
	framesDir: string;
	manifestPath: string;
}

export interface ElectronSessionState {
	wsEndpoint: string;
	pid: number;
	appPath: string;
	mainSocketPath?: string;
	routeRules?: RouteRule[];
	tracing?: TracingMetadata;
	videoRecording?: VideoRecordingMetadata;
}

export const SESSION_FILE = ".electron-session.json";
export const STATE_DIR = ".state";

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isRouteRule(value: unknown): value is RouteRule {
	if (!isObject(value)) {
		return false;
	}

	return (
		typeof value.pattern === "string" &&
		value.pattern.length > 0 &&
		(value.action === "abort" || value.action === "continue")
	);
}

function isTracingMetadata(value: unknown): value is TracingMetadata {
	if (!isObject(value)) {
		return false;
	}

	return (
		typeof value.active === "boolean" &&
		(value.outputPath === undefined ||
			(typeof value.outputPath === "string" && value.outputPath.length > 0))
	);
}

function isVideoRecordingMetadata(
	value: unknown,
): value is VideoRecordingMetadata {
	if (!isObject(value)) {
		return false;
	}

	return (
		typeof value.active === "boolean" &&
		typeof value.framesDir === "string" &&
		value.framesDir.length > 0 &&
		typeof value.manifestPath === "string" &&
		value.manifestPath.length > 0
	);
}

function isValidSessionState(value: unknown): value is ElectronSessionState {
	if (!isObject(value)) {
		return false;
	}

	return (
		typeof value.wsEndpoint === "string" &&
		value.wsEndpoint.length > 0 &&
		typeof value.pid === "number" &&
		Number.isInteger(value.pid) &&
		value.pid > 0 &&
		typeof value.appPath === "string" &&
		value.appPath.length > 0 &&
		(value.mainSocketPath === undefined ||
			(typeof value.mainSocketPath === "string" &&
				value.mainSocketPath.length > 0)) &&
		(value.routeRules === undefined ||
			(Array.isArray(value.routeRules) &&
				value.routeRules.every(isRouteRule))) &&
		(value.tracing === undefined || isTracingMetadata(value.tracing)) &&
		(value.videoRecording === undefined ||
			isVideoRecordingMetadata(value.videoRecording))
	);
}

export function getSessionFilePath(cwd = process.cwd()): string {
	return resolve(cwd, SESSION_FILE);
}

export function getStateDirPath(cwd = process.cwd()): string {
	return resolve(cwd, STATE_DIR);
}

export async function ensureStateDir(cwd = process.cwd()): Promise<string> {
	const dirPath = getStateDirPath(cwd);
	await mkdir(dirPath, { recursive: true });
	return dirPath;
}

export async function writeSessionState(
	state: ElectronSessionState,
	cwd = process.cwd(),
): Promise<string> {
	const sessionPath = getSessionFilePath(cwd);
	const payload = JSON.stringify(state, null, 2);
	await writeFile(sessionPath, `${payload}\n`, "utf8");
	return sessionPath;
}

export async function readSessionState(
	cwd = process.cwd(),
): Promise<ElectronSessionState> {
	const sessionPath = getSessionFilePath(cwd);

	let raw: string;
	try {
		raw = await readFile(sessionPath, "utf8");
	} catch {
		throw new Error(
			"Error: No active session. Run e-cli launch <appPath> first.",
		);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(
			"Error: Session file is corrupted. Run e-cli launch again.",
		);
	}

	if (!isValidSessionState(parsed)) {
		throw new Error("Error: Session file is invalid. Run e-cli launch again.");
	}

	return parsed;
}

export async function clearSessionState(cwd = process.cwd()): Promise<void> {
	const sessionPath = getSessionFilePath(cwd);
	await rm(sessionPath, { force: true });
}

export async function updateSessionState(
	updater: (state: ElectronSessionState) => ElectronSessionState,
	cwd = process.cwd(),
): Promise<ElectronSessionState> {
	const current = await readSessionState(cwd);
	const updated = updater(current);
	await writeSessionState(updated, cwd);
	return updated;
}

export async function hasSessionState(cwd = process.cwd()): Promise<boolean> {
	try {
		await access(getSessionFilePath(cwd), constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export function isProcessRunning(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		const errno = error as NodeJS.ErrnoException;
		return errno.code === "EPERM";
	}
}
