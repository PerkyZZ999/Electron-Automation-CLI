import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	clearSessionState,
	hasSessionState,
	isProcessRunning,
	readSessionState,
	updateSessionState,
	writeSessionState,
	type ElectronSessionState,
} from "../src/utils/state";
const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "e-cli-test-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	for (const dir of tempDirs.splice(0, tempDirs.length)) {
		await rm(dir, { recursive: true, force: true });
	}
});

describe("session state", () => {
	it("writes and reads session state", async () => {
		const cwd = await makeTempDir();
		const state: ElectronSessionState = {
			wsEndpoint: "ws://127.0.0.1:9222/devtools/browser/test",
			pid: 1234,
			appPath: "/tmp/app.js",
			mainSocketPath: "/tmp/main.sock",
		};

		const path = await writeSessionState(state, cwd);
		expect(path.endsWith(".electron-session.json")).toBe(true);

		const loaded = await readSessionState(cwd);
		expect(loaded).toEqual(state);
	});

	it("returns false when session file is absent", async () => {
		const cwd = await makeTempDir();
		expect(await hasSessionState(cwd)).toBe(false);
	});

	it("clears session state", async () => {
		const cwd = await makeTempDir();
		await writeSessionState(
			{
				wsEndpoint: "ws://127.0.0.1:9222/devtools/browser/test",
				pid: 1234,
				appPath: "/tmp/app.js",
			},
			cwd,
		);

		expect(await hasSessionState(cwd)).toBe(true);
		await clearSessionState(cwd);
		expect(await hasSessionState(cwd)).toBe(false);
	});

	it("throws on missing session", async () => {
		const cwd = await makeTempDir();
		expect(async () => readSessionState(cwd)).toThrow(
			"Error: No active session. Run e-cli launch <appPath> first.",
		);
	});

	it("reports current process as running", () => {
		expect(isProcessRunning(process.pid)).toBe(true);
	});

	it("supports route, tracing, and video metadata", async () => {
		const cwd = await makeTempDir();
		const state: ElectronSessionState = {
			wsEndpoint: "ws://127.0.0.1:9222/devtools/browser/test",
			pid: 1234,
			appPath: "/tmp/app.js",
			routeRules: [{ pattern: "**/*.png", action: "abort" }],
			tracing: {
				active: true,
				outputPath: "/tmp/trace.zip",
			},
			videoRecording: {
				active: true,
				framesDir: "/tmp/frames",
				manifestPath: "/tmp/frames/manifest.jsonl",
			},
		};

		await writeSessionState(state, cwd);
		const loaded = await readSessionState(cwd);
		expect(loaded).toEqual(state);
	});

	it("throws when route metadata is invalid", async () => {
		const cwd = await makeTempDir();
		const badPath = resolve(cwd, ".electron-session.json");
		await writeFile(
			badPath,
			JSON.stringify({
				wsEndpoint: "ws://127.0.0.1:9222/devtools/browser/test",
				pid: 1234,
				appPath: "/tmp/app.js",
				routeRules: [{ pattern: "**/*.png", action: "rewrite" }],
			}),
			"utf8",
		);

		expect(async () => readSessionState(cwd)).toThrow(
			"Error: Session file is invalid. Run e-cli launch again.",
		);
	});

	it("updates persisted session state with updater", async () => {
		const cwd = await makeTempDir();
		await writeSessionState(
			{
				wsEndpoint: "ws://127.0.0.1:9222/devtools/browser/test",
				pid: 1234,
				appPath: "/tmp/app.js",
			},
			cwd,
		);

		await updateSessionState(
			(state) => ({
				...state,
				routeRules: [{ pattern: "**/api/**", action: "continue" }],
			}),
			cwd,
		);

		const loaded = await readSessionState(cwd);
		expect(loaded.routeRules).toEqual([
			{ pattern: "**/api/**", action: "continue" },
		]);
	});
});
