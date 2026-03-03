import { access, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { _electron as electron } from "playwright";
import type { ElectronSessionState } from "../utils/state";
import { ensureStateDir } from "../utils/state";

export interface LaunchOptions {
	appPath: string;
	headless?: boolean;
}

interface CdpVersionResponse {
	webSocketDebuggerUrl?: string;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolvePromise) => {
		setTimeout(resolvePromise, ms);
	});
}

async function getAvailablePort(): Promise<number> {
	return await new Promise((resolvePromise, rejectPromise) => {
		const server = createServer();

		server.on("error", (error) => {
			rejectPromise(error);
		});

		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				server.close(() => {
					rejectPromise(new Error("Unable to allocate local debugging port."));
				});
				return;
			}

			server.close((closeError) => {
				if (closeError) {
					rejectPromise(closeError);
					return;
				}

				resolvePromise(address.port);
			});
		});
	});
}

async function resolveWsEndpoint(port: number): Promise<string> {
	const endpointUrl = `http://127.0.0.1:${port}/json/version`;
	const maxAttempts = 60;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		try {
			const response = await fetch(endpointUrl);
			if (!response.ok) {
				await sleep(200);
				continue;
			}

			const payload = (await response.json()) as CdpVersionResponse;
			if (
				typeof payload.webSocketDebuggerUrl === "string" &&
				payload.webSocketDebuggerUrl.length > 0
			) {
				return payload.webSocketDebuggerUrl;
			}
		} catch {
			// Continue retrying until maxAttempts is reached.
		}

		await sleep(200);
	}

	throw new Error("Unable to resolve CDP endpoint from Electron process.");
}

async function startMainEvalBridge(
	electronApp: Awaited<ReturnType<typeof electron.launch>>,
	socketPath: string,
): Promise<string> {
	await rm(socketPath, { force: true }).catch(() => {
		// Ignore stale socket cleanup errors.
	});

	return await (
		electronApp as unknown as {
			evaluate: <TArg, TResult>(
				pageFunction: (arg: TArg) => Promise<TResult> | TResult,
				arg: TArg,
			) => Promise<TResult>;
		}
	).evaluate(
		async ({ evalSocketPath }: { evalSocketPath: string }) => {
			const fs = require("node:fs");
			const net = require("node:net");
			const vm = require("node:vm");
			const globalStore = globalThis as Record<string, unknown>;
			type MainBridge = { server: unknown; socketPath: string };
			const existingBridge = globalStore.__eCliMainEvalBridge as
				| MainBridge
				| undefined;

			if (existingBridge?.server) {
				return existingBridge.socketPath;
			}

			try {
				fs.unlinkSync(evalSocketPath);
			} catch {
				// Ignore stale socket file errors.
			}

			const server = net.createServer((socket: unknown) => {
				const activeSocket = socket as {
					on: (
						event: string,
						callback: (chunk: unknown) => void | Promise<void>,
					) => void;
					write: (payload: string) => void;
				};
				let buffered = "";

				activeSocket.on("data", async (chunk: unknown) => {
					buffered += String(chunk);
					const frames = buffered.split("\n");
					buffered = frames.pop() ?? "";

					for (const frame of frames) {
						if (!frame.trim()) {
							continue;
						}

						try {
							const payload = JSON.parse(frame);
							const script = new vm.Script(
								`(async () => (\n${payload.code}\n))()`,
							);
							const value = await script.runInThisContext();
							activeSocket.write(
								`${JSON.stringify({ id: payload.id, ok: true, result: value })}\n`,
							);
						} catch (error) {
							const message =
								error instanceof Error
									? error.message
									: "Unknown eval-main error.";
							activeSocket.write(
								`${JSON.stringify({ id: null, ok: false, error: message })}\n`,
							);
						}
					}
				});
			});

			await new Promise<void>((resolvePromise, rejectPromise) => {
				server.once("error", rejectPromise);
				server.listen(evalSocketPath, () => {
					server.off("error", rejectPromise);
					resolvePromise();
				});
			});

			globalStore.__eCliMainEvalBridge = {
				server,
				socketPath: evalSocketPath,
			};

			return evalSocketPath;
		},
		{ evalSocketPath: socketPath },
	);
}

export async function launchElectron(
	options: LaunchOptions,
): Promise<ElectronSessionState> {
	const resolvedAppPath = resolve(process.cwd(), options.appPath);
	await access(resolvedAppPath);

	const cdpPort = await getAvailablePort();
	const stateDir = await ensureStateDir();
	const evalSocketPath = resolve(
		stateDir,
		`main-eval-${process.pid}-${Date.now()}.sock`,
	);
	const launchArgs = [resolvedAppPath, `--remote-debugging-port=${cdpPort}`];

	if (
		process.platform === "linux" &&
		(options.headless || !process.env.DISPLAY)
	) {
		launchArgs.push("--disable-gpu");
	}

	const electronApp = await electron.launch({ args: launchArgs });
	const pid = electronApp.process()?.pid;

	if (!pid) {
		await electronApp.close();
		throw new Error("Electron launched without a valid process ID.");
	}

	try {
		const wsEndpoint = await resolveWsEndpoint(cdpPort);
		const mainSocketPath = await startMainEvalBridge(
			electronApp,
			evalSocketPath,
		);
		return {
			wsEndpoint,
			pid,
			appPath: resolvedAppPath,
			mainSocketPath,
		};
	} catch (error) {
		await electronApp.close();
		await rm(evalSocketPath, { force: true }).catch(() => {
			// Ignore cleanup failure.
		});
		throw error;
	}
}
