import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Command } from "commander";
import { EXIT_CODE, fail, logInfo } from "../utils/logger";
import {
	clearSessionState,
	type ElectronSessionState,
	ensureStateDir,
	isProcessRunning,
	readSessionState,
	writeSessionState,
	type RouteAction,
} from "../utils/state";
import { mapAutomationError, withRendererContext } from "./shared";

interface RouteOptions {
	action?: RouteAction;
}

interface UnsafeOptions {
	allowUnsafe?: boolean;
}

function hasUnsafePermission(options?: UnsafeOptions): boolean {
	return options?.allowUnsafe === true || process.env.ECLI_ALLOW_UNSAFE === "1";
}

function handleError(error: unknown, fallbackMessage: string): void {
	const mapped = mapAutomationError(error, fallbackMessage);
	fail(mapped.message, mapped.code);
}

async function requireActiveSession(): Promise<ElectronSessionState> {
	const session = await readSessionState();
	if (!isProcessRunning(session.pid)) {
		await clearSessionState();
		throw new Error(
			"Error: Electron process died. Please run e-cli launch again.",
		);
	}

	return session;
}

async function readJsonLines(filePath: string): Promise<unknown[]> {
	try {
		const content = await readFile(filePath, "utf8");
		return content
			.split("\n")
			.filter((line) => line.trim().length > 0)
			.map((line) => JSON.parse(line));
	} catch {
		return [];
	}
}

export function registerDevtoolsCommands(program: Command): void {
	program
		.command("route")
		.argument("<pattern>")
		.option("--action <action>", "abort or continue", "abort")
		.description("Persist a network route rule for subsequent commands")
		.action(async (pattern: string, options?: RouteOptions) => {
			try {
				const action = (options?.action ?? "abort") as RouteAction;
				if (action !== "abort" && action !== "continue") {
					fail(
						"Error: Invalid action. Use abort or continue.",
						EXIT_CODE.INVALID_ARGS,
					);
					return;
				}

				const session = await requireActiveSession();

				const existing = session.routeRules ?? [];
				const filtered = existing.filter((entry) => entry.pattern !== pattern);
				session.routeRules = [...filtered, { pattern, action }];
				await writeSessionState(session);
				logInfo(`Route added: ${pattern} (${action})`);
			} catch (error) {
				handleError(error, "Error: Failed to add route.");
			}
		});

	program
		.command("route-list")
		.description("List persisted route rules")
		.action(async () => {
			try {
				const session = await requireActiveSession();
				console.log(JSON.stringify(session.routeRules ?? [], null, 2));
			} catch (error) {
				handleError(error, "Error: Failed to list routes.");
			}
		});

	program
		.command("unroute")
		.argument("[pattern]")
		.description("Remove a route pattern or clear all routes")
		.action(async (pattern?: string) => {
			try {
				const session = await requireActiveSession();
				if (!pattern) {
					session.routeRules = [];
					await writeSessionState(session);
					logInfo("All routes removed.");
					return;
				}

				session.routeRules = (session.routeRules ?? []).filter(
					(entry) => entry.pattern !== pattern,
				);
				await writeSessionState(session);
				logInfo(`Route removed: ${pattern}`);
			} catch (error) {
				handleError(error, "Error: Failed to remove route.");
			}
		});

	program
		.command("console")
		.argument("[minLevel]")
		.description("List captured console entries")
		.action(async (minLevel?: string) => {
			try {
				const levelOrder = ["debug", "log", "info", "warning", "error"];
				const threshold = minLevel ? levelOrder.indexOf(minLevel) : -1;
				if (minLevel && threshold === -1) {
					fail(
						"Error: Invalid minLevel. Use debug|log|info|warning|error.",
						EXIT_CODE.INVALID_ARGS,
					);
					return;
				}

				const stateDir = await ensureStateDir();
				const entries = await readJsonLines(resolve(stateDir, "console.jsonl"));
				const filtered =
					threshold >= 0
						? entries.filter((entry) => {
								const type = (entry as { type?: string }).type ?? "log";
								const index = levelOrder.indexOf(type);
								return index >= threshold;
							})
						: entries;
				console.log(JSON.stringify(filtered, null, 2));
			} catch (error) {
				handleError(error, "Error: Failed to read console log.");
			}
		});

	program
		.command("network")
		.description("List captured network events")
		.action(async () => {
			try {
				const stateDir = await ensureStateDir();
				const entries = await readJsonLines(resolve(stateDir, "network.jsonl"));
				console.log(JSON.stringify(entries, null, 2));
			} catch (error) {
				handleError(error, "Error: Failed to read network log.");
			}
		});

	program
		.command("run-code")
		.argument("<code>")
		.argument("[windowIndex]")
		.option("--allow-unsafe", "acknowledge raw renderer code execution")
		.description("Run Playwright snippet with page/context/browser objects")
		.action(
			async (
				code: string,
				rawWindowIndex?: string,
				options?: UnsafeOptions,
			) => {
				try {
					if (!hasUnsafePermission(options)) {
						fail(
							"Error: run-code is unsafe by design. Re-run with --allow-unsafe or set ECLI_ALLOW_UNSAFE=1.",
							EXIT_CODE.INVALID_ARGS,
						);
						return;
					}

					await withRendererContext(
						rawWindowIndex,
						async ({ page, browser }) => {
							const AsyncFunction = Object.getPrototypeOf(async () => undefined)
								.constructor as new (
								...args: string[]
							) => (...args: unknown[]) => Promise<unknown>;
							const fn = new AsyncFunction("page", "context", "browser", code);
							const result = await fn(page, page.context(), browser);
							const serialized =
								typeof result === "string"
									? result
									: (JSON.stringify(result, null, 0) ?? String(result));
							logInfo(
								`Result: ${serialized.length > 240 ? `${serialized.slice(0, 240)}…(truncated)` : serialized}`,
							);
						},
					);
				} catch (error) {
					handleError(error, "Error: Failed to run Playwright code.");
				}
			},
		);

	program
		.command("tracing-start")
		.argument("[filename]")
		.description("Start Playwright tracing for current context")
		.action(async (filename?: string) => {
			try {
				const outputPath = filename
					? resolve(process.cwd(), filename)
					: resolve(await ensureStateDir(), `trace-${Date.now()}.zip`);
				await withRendererContext(undefined, async ({ page, session }) => {
					await page
						.context()
						.tracing.start({ screenshots: true, snapshots: true });
					session.tracing = { active: true, outputPath };
					await writeSessionState(session);
					logInfo(`Tracing started: ${outputPath}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to start tracing.");
			}
		});

	program
		.command("tracing-stop")
		.argument("[filename]")
		.description("Stop tracing and write trace artifact")
		.action(async (filename?: string) => {
			try {
				const session = await requireActiveSession();
				if (!session.tracing?.active) {
					fail(
						"Error: Tracing is not active. Run e-cli tracing-start first.",
						EXIT_CODE.ACTION,
					);
					return;
				}

				const outputPath = filename
					? resolve(process.cwd(), filename)
					: (session.tracing.outputPath ??
						resolve(await ensureStateDir(), `trace-${Date.now()}.zip`));
				await withRendererContext(undefined, async ({ page }) => {
					await page.context().tracing.stop({ path: outputPath });
				});
				session.tracing = undefined;
				await writeSessionState(session);
				console.log(outputPath);
			} catch (error) {
				handleError(error, "Error: Failed to stop tracing.");
			}
		});

	program
		.command("video-start")
		.argument("[dirname]")
		.description("Start frame-based video capture (artifact parity mode)")
		.action(async (dirname?: string) => {
			try {
				const session = await requireActiveSession();

				const stateDir = await ensureStateDir();
				const framesDir = dirname
					? resolve(process.cwd(), dirname)
					: resolve(stateDir, `video-frames-${Date.now()}`);
				const manifestPath = resolve(
					stateDir,
					`video-manifest-${Date.now()}.jsonl`,
				);
				await mkdir(framesDir, { recursive: true });
				await writeFile(manifestPath, "", "utf8");

				session.videoRecording = {
					active: true,
					framesDir,
					manifestPath,
				};
				await writeSessionState(session);
				logInfo(`Video capture started: ${framesDir}`);
			} catch (error) {
				handleError(error, "Error: Failed to start video capture.");
			}
		});

	program
		.command("video-stop")
		.argument("[filename]")
		.description("Stop frame capture and write summary artifact")
		.action(async (filename?: string) => {
			try {
				const session = await requireActiveSession();
				const video = session.videoRecording;
				if (!video?.active) {
					fail(
						"Error: Video capture is not active. Run e-cli video-start first.",
						EXIT_CODE.ACTION,
					);
					return;
				}

				const summaryPath = filename
					? resolve(process.cwd(), filename)
					: resolve(await ensureStateDir(), `video-summary-${Date.now()}.txt`);

				let frameCount = 0;
				try {
					const manifest = await readJsonLines(video.manifestPath);
					frameCount = manifest.length;
				} catch {
					frameCount = 0;
				}

				const summary = [
					"Frame-Based Video Capture Summary",
					`framesDir=${video.framesDir}`,
					`manifest=${video.manifestPath}`,
					`frameCount=${frameCount}`,
				].join("\n");
				await writeFile(summaryPath, `${summary}\n`, "utf8");

				session.videoRecording = undefined;
				await writeSessionState(session);
				console.log(summaryPath);
			} catch (error) {
				handleError(error, "Error: Failed to stop video capture.");
			}
		});
}
