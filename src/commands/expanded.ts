import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Command } from "commander";
import { EXIT_CODE, fail, logInfo } from "../utils/logger";
import { ensureStateDir } from "../utils/state";
import {
	mapAutomationError,
	parseNumberArg,
	parseWindowIndex,
	withRendererContext,
} from "./shared";

interface FileOption {
	filename?: string;
}

interface DomainOption {
	domain?: string;
}

function handleError(error: unknown, fallbackMessage: string): void {
	const mapped = mapAutomationError(error, fallbackMessage);
	fail(mapped.message, mapped.code);
}

function resolveOptionalWindowIndex(
	selectorOrIndex: string | undefined,
	windowIndex: string | undefined,
): { selector?: string; windowIndex?: string } {
	if (
		selectorOrIndex &&
		windowIndex === undefined &&
		/^\d+$/.test(selectorOrIndex)
	) {
		return {
			windowIndex: selectorOrIndex,
		};
	}

	return {
		selector: selectorOrIndex,
		windowIndex,
	};
}

async function resolveArtifactPath(
	filename: string | undefined,
	defaultFileName: string,
): Promise<string> {
	if (filename) {
		return resolve(process.cwd(), filename);
	}

	const stateDir = await ensureStateDir();
	return resolve(stateDir, defaultFileName);
}

export function registerExpandedCommands(program: Command): void {
	program
		.command("goto")
		.argument("<url>")
		.argument("[windowIndex]")
		.description("Navigate active renderer page to a URL")
		.action(async (url: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.goto(url, {
						waitUntil: "domcontentloaded",
						timeout: 15_000,
					});
					logInfo(`Navigated: ${page.url()}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to navigate.");
			}
		});

	program
		.command("go-back")
		.argument("[windowIndex]")
		.description("Navigate back in renderer history")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.goBack({ timeout: 10_000 });
					logInfo(`Page: ${page.url()}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to go back.");
			}
		});

	program
		.command("go-forward")
		.argument("[windowIndex]")
		.description("Navigate forward in renderer history")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.goForward({ timeout: 10_000 });
					logInfo(`Page: ${page.url()}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to go forward.");
			}
		});

	program
		.command("reload")
		.argument("[windowIndex]")
		.description("Reload current renderer page")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
					logInfo(`Reloaded: ${page.url()}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to reload page.");
			}
		});

	program
		.command("type")
		.argument("<text>")
		.argument("[windowIndex]")
		.description("Type text through active keyboard focus")
		.action(async (text: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.keyboard.type(text);
					logInfo("Typed text.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to type text.");
			}
		});

	program
		.command("dblclick")
		.argument("<selector>")
		.argument("[windowIndex]")
		.description("Double-click an element")
		.action(async (selector: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.locator(selector).first().dblclick({ timeout: 10_000 });
					logInfo("Double-clicked.");
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error.";
				if (
					/Timeout|strict mode violation|No node found|waiting for/i.test(
						message,
					)
				) {
					fail(`Error: Selector not found: ${selector}`, EXIT_CODE.ACTION);
					return;
				}
				handleError(error, "Error: Failed to double-click selector.");
			}
		});

	program
		.command("hover")
		.argument("<selector>")
		.argument("[windowIndex]")
		.description("Hover over an element")
		.action(async (selector: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.locator(selector).first().hover({ timeout: 10_000 });
					logInfo("Hovered.");
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error.";
				if (
					/Timeout|strict mode violation|No node found|waiting for/i.test(
						message,
					)
				) {
					fail(`Error: Selector not found: ${selector}`, EXIT_CODE.ACTION);
					return;
				}
				handleError(error, "Error: Failed to hover selector.");
			}
		});

	program
		.command("check")
		.argument("<selector>")
		.argument("[windowIndex]")
		.description("Check checkbox/radio by selector")
		.action(async (selector: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.locator(selector).first().check({ timeout: 10_000 });
					logInfo("Checked.");
				});
			} catch (error) {
				handleError(error, `Error: Selector not found: ${selector}`);
			}
		});

	program
		.command("uncheck")
		.argument("<selector>")
		.argument("[windowIndex]")
		.description("Uncheck checkbox by selector")
		.action(async (selector: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.locator(selector).first().uncheck({ timeout: 10_000 });
					logInfo("Unchecked.");
				});
			} catch (error) {
				handleError(error, `Error: Selector not found: ${selector}`);
			}
		});

	program
		.command("select")
		.argument("<selector>")
		.argument("<value>")
		.argument("[windowIndex]")
		.description("Select option value on a <select> element")
		.action(
			async (selector: string, value: string, rawWindowIndex?: string) => {
				try {
					await withRendererContext(rawWindowIndex, async ({ page }) => {
						await page
							.locator(selector)
							.first()
							.selectOption(value, { timeout: 10_000 });
						logInfo("Selected option.");
					});
				} catch (error) {
					handleError(
						error,
						`Error: Failed to select value for selector ${selector}.`,
					);
				}
			},
		);

	program
		.command("resize")
		.argument("<width>")
		.argument("<height>")
		.argument("[windowIndex]")
		.description("Resize renderer viewport")
		.action(
			async (widthRaw: string, heightRaw: string, rawWindowIndex?: string) => {
				try {
					const width = Math.max(
						1,
						Math.floor(parseNumberArg("width", widthRaw)),
					);
					const height = Math.max(
						1,
						Math.floor(parseNumberArg("height", heightRaw)),
					);
					await withRendererContext(rawWindowIndex, async ({ page }) => {
						await page.setViewportSize({ width, height });
						logInfo(`Viewport: ${width}x${height}`);
					});
				} catch (error) {
					handleError(error, "Error: Failed to resize viewport.");
				}
			},
		);

	program
		.command("press")
		.argument("<key>")
		.argument("[windowIndex]")
		.description("Press a keyboard key")
		.action(async (key: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.keyboard.press(key);
					logInfo("Key pressed.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to press key.");
			}
		});

	program
		.command("keydown")
		.argument("<key>")
		.argument("[windowIndex]")
		.description("Send keyboard keydown")
		.action(async (key: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.keyboard.down(key);
					logInfo("Key down sent.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to send keydown.");
			}
		});

	program
		.command("keyup")
		.argument("<key>")
		.argument("[windowIndex]")
		.description("Send keyboard keyup")
		.action(async (key: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.keyboard.up(key);
					logInfo("Key up sent.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to send keyup.");
			}
		});

	program
		.command("mousemove")
		.argument("<x>")
		.argument("<y>")
		.argument("[windowIndex]")
		.description("Move mouse to viewport coordinates")
		.action(async (xRaw: string, yRaw: string, rawWindowIndex?: string) => {
			try {
				const x = parseNumberArg("x", xRaw);
				const y = parseNumberArg("y", yRaw);
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.mouse.move(x, y);
					logInfo(`Mouse moved: ${x},${y}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to move mouse.");
			}
		});

	program
		.command("mousedown")
		.argument("[button]")
		.argument("[windowIndex]")
		.description("Send mouse down")
		.action(async (buttonRaw?: string, rawWindowIndex?: string) => {
			try {
				const button =
					(buttonRaw as "left" | "right" | "middle" | undefined) ?? "left";
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.mouse.down({ button });
					logInfo(`Mouse down: ${button}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to send mousedown.");
			}
		});

	program
		.command("mouseup")
		.argument("[button]")
		.argument("[windowIndex]")
		.description("Send mouse up")
		.action(async (buttonRaw?: string, rawWindowIndex?: string) => {
			try {
				const button =
					(buttonRaw as "left" | "right" | "middle" | undefined) ?? "left";
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.mouse.up({ button });
					logInfo(`Mouse up: ${button}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to send mouseup.");
			}
		});

	program
		.command("mousewheel")
		.argument("<dx>")
		.argument("<dy>")
		.argument("[windowIndex]")
		.description("Scroll mouse wheel")
		.action(async (dxRaw: string, dyRaw: string, rawWindowIndex?: string) => {
			try {
				const dx = parseNumberArg("dx", dxRaw);
				const dy = parseNumberArg("dy", dyRaw);
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.mouse.wheel(dx, dy);
					logInfo(`Mouse wheel: ${dx},${dy}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to send mousewheel.");
			}
		});

	program
		.command("screenshot")
		.argument("[selectorOrWindowIndex]")
		.argument("[windowIndex]")
		.option("--filename <filename>")
		.description("Capture screenshot of page or selected element")
		.action(
			async (
				selectorOrWindowIndex?: string,
				rawWindowIndex?: string,
				options?: FileOption,
			) => {
				const resolved = resolveOptionalWindowIndex(
					selectorOrWindowIndex,
					rawWindowIndex,
				);
				try {
					const outputPath = await resolveArtifactPath(
						options?.filename,
						`last-action-${Date.now()}.png`,
					);
					await withRendererContext(resolved.windowIndex, async ({ page }) => {
						if (resolved.selector) {
							await page
								.locator(resolved.selector)
								.first()
								.screenshot({ path: outputPath });
						} else {
							await page.screenshot({ path: outputPath, fullPage: true });
						}
						console.log(outputPath);
					});
				} catch (error) {
					handleError(error, "Error: Failed to capture screenshot.");
				}
			},
		);

	program
		.command("pdf")
		.argument("[windowIndex]")
		.option("--filename <filename>")
		.description("Save current renderer page as PDF")
		.action(async (rawWindowIndex?: string, options?: FileOption) => {
			try {
				const outputPath = await resolveArtifactPath(
					options?.filename,
					`page-${Date.now()}.pdf`,
				);
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.pdf({ path: outputPath, printBackground: true });
					console.log(outputPath);
				});
			} catch (error) {
				handleError(error, "Error: Failed to create PDF.");
			}
		});

	program
		.command("snapshot")
		.argument("[windowIndex]")
		.option("--filename <filename>")
		.description("Capture renderer snapshot and accessibility tree")
		.action(async (rawWindowIndex?: string, options?: FileOption) => {
			try {
				const outputPath = await resolveArtifactPath(
					options?.filename,
					`snapshot-${Date.now()}.txt`,
				);
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const client = await page.context().newCDPSession(page);
					const tree = await client.send("Accessibility.getFullAXTree");
					await client.detach();
					const title = await page.title();
					const content = [
						"### Page",
						`- Page URL: ${page.url()}`,
						`- Page Title: ${title}`,
						"### Snapshot",
						JSON.stringify(tree, null, 2),
					].join("\n");
					await Bun.write(outputPath, `${content}\n`);
					console.log(outputPath);
				});
			} catch (error) {
				handleError(error, "Error: Failed to create snapshot.");
			}
		});

	program
		.command("eval")
		.argument("<expression>")
		.argument("[windowIndex]")
		.description("Evaluate JavaScript in renderer context")
		.action(async (expression: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const result = await page.evaluate((code) => {
						const rendererFunction = new Function(`return (${code});`);
						return rendererFunction();
					}, expression);
					const serialized =
						typeof result === "string"
							? result
							: (JSON.stringify(result, null, 0) ?? String(result));
					logInfo(
						`Result: ${serialized.length > 240 ? `${serialized.slice(0, 240)}…(truncated)` : serialized}`,
					);
				});
			} catch (error) {
				handleError(error, "Error: Failed to evaluate expression in renderer.");
			}
		});

	program
		.command("tab-list")
		.description("List current renderer tabs/windows")
		.action(async () => {
			try {
				await withRendererContext(undefined, async ({ page }) => {
					const pages = page.context().pages();
					const summary = pages.map((entry, index) => ({
						index,
						url: entry.url(),
					}));
					console.log(JSON.stringify(summary, null, 2));
				});
			} catch (error) {
				handleError(error, "Error: Failed to list tabs.");
			}
		});

	program
		.command("tab-new")
		.argument("[url]")
		.description("Open a new tab in current renderer context")
		.action(async (url?: string) => {
			try {
				await withRendererContext(undefined, async ({ page }) => {
					const context = page.context();
					const tab = await context.newPage();
					if (url) {
						await tab.goto(url, {
							waitUntil: "domcontentloaded",
							timeout: 15_000,
						});
					}
					await tab.bringToFront();
					const index = context.pages().indexOf(tab);
					logInfo(`Tab opened: ${index}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to open new tab.");
			}
		});

	program
		.command("tab-close")
		.argument("[index]")
		.description("Close a tab by index (default 0)")
		.action(async (rawIndex?: string) => {
			try {
				const index = rawIndex ? parseWindowIndex(rawIndex) : 0;
				await withRendererContext(undefined, async ({ page }) => {
					const pages = page.context().pages();
					const target = pages[index];
					if (!target) {
						throw new Error(`Error: Invalid tab index: ${index}`);
					}
					await target.close();
					logInfo(`Tab closed: ${index}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to close tab.");
			}
		});

	program
		.command("tab-select")
		.argument("<index>")
		.description("Bring tab to front by index")
		.action(async (rawIndex: string) => {
			try {
				const index = parseWindowIndex(rawIndex);
				await withRendererContext(undefined, async ({ page }) => {
					const pages = page.context().pages();
					const target = pages[index];
					if (!target) {
						throw new Error(`Error: Invalid tab index: ${index}`);
					}
					await target.bringToFront();
					logInfo(`Tab selected: ${index}`);
				});
			} catch (error) {
				handleError(error, "Error: Failed to select tab.");
			}
		});

	program
		.command("state-save")
		.argument("[filename]")
		.description("Save storage state for current renderer context")
		.action(async (filename?: string) => {
			try {
				const outputPath = await resolveArtifactPath(
					filename,
					"storage-state.json",
				);
				await withRendererContext(undefined, async ({ page }) => {
					await page.context().storageState({ path: outputPath });
					console.log(outputPath);
				});
			} catch (error) {
				handleError(error, "Error: Failed to save storage state.");
			}
		});

	program
		.command("state-load")
		.argument("<filename>")
		.description("Load storage state into current renderer context")
		.action(async (filename: string) => {
			try {
				const sourcePath = resolve(process.cwd(), filename);
				const raw = await readFile(sourcePath, "utf8");
				const parsed = JSON.parse(raw) as {
					cookies?: Array<Record<string, unknown>>;
					origins?: Array<{
						origin: string;
						localStorage?: Array<{ name: string; value: string }>;
					}>;
				};

				await withRendererContext(undefined, async ({ page }) => {
					const context = page.context();
					if (parsed.cookies?.length) {
						await context.addCookies(
							parsed.cookies as Array<{
								name: string;
								value: string;
								domain?: string;
								path?: string;
								expires?: number;
								httpOnly?: boolean;
								secure?: boolean;
								sameSite?: "Strict" | "Lax" | "None";
								url?: string;
							}>,
						);
					}

					if (parsed.origins?.length) {
						for (const origin of parsed.origins) {
							if (!origin.origin || !origin.localStorage) {
								continue;
							}
							const tempPage = await context.newPage();
							try {
								await tempPage.goto(origin.origin, {
									waitUntil: "domcontentloaded",
									timeout: 10_000,
								});
								await tempPage.evaluate((entries) => {
									localStorage.clear();
									for (const entry of entries) {
										localStorage.setItem(entry.name, entry.value);
									}
								}, origin.localStorage);
							} finally {
								await tempPage.close();
							}
						}
					}

					logInfo("Storage state loaded.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to load storage state.");
			}
		});

	program
		.command("cookie-list")
		.argument("[windowIndex]")
		.option("--domain <domain>")
		.description("List cookies")
		.action(async (rawWindowIndex?: string, options?: DomainOption) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const cookies = await page.context().cookies();
					const filtered = options?.domain
						? cookies.filter((cookie) =>
								cookie.domain.includes(options.domain as string),
							)
						: cookies;
					console.log(JSON.stringify(filtered, null, 2));
				});
			} catch (error) {
				handleError(error, "Error: Failed to list cookies.");
			}
		});

	program
		.command("cookie-get")
		.argument("<name>")
		.argument("[windowIndex]")
		.description("Get a cookie by name")
		.action(async (name: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const cookie = (await page.context().cookies()).find(
						(entry) => entry.name === name,
					);
					if (!cookie) {
						throw new Error(`Error: Cookie not found: ${name}`);
					}
					console.log(JSON.stringify(cookie, null, 2));
				});
			} catch (error) {
				handleError(error, `Error: Failed to get cookie ${name}.`);
			}
		});

	program
		.command("cookie-set")
		.argument("<name>")
		.argument("<value>")
		.argument("[windowIndex]")
		.description("Set a cookie on current page URL")
		.action(async (name: string, value: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const url = page.url();
					if (!/^https?:\/\//.test(url)) {
						throw new Error(
							"Error: Current page URL is not http(s); cannot set cookie.",
						);
					}
					await page.context().addCookies([{ name, value, url }]);
					logInfo("Cookie set.");
				});
			} catch (error) {
				handleError(error, `Error: Failed to set cookie ${name}.`);
			}
		});

	program
		.command("cookie-delete")
		.argument("<name>")
		.argument("[windowIndex]")
		.description("Delete cookies by name")
		.action(async (name: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const context = page.context();
					const cookies = await context.cookies();
					await context.clearCookies();
					const remaining = cookies.filter((entry) => entry.name !== name);
					if (remaining.length > 0) {
						await context.addCookies(remaining);
					}
					logInfo("Cookie deleted.");
				});
			} catch (error) {
				handleError(error, `Error: Failed to delete cookie ${name}.`);
			}
		});

	program
		.command("cookie-clear")
		.argument("[windowIndex]")
		.description("Clear all cookies")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.context().clearCookies();
					logInfo("Cookies cleared.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to clear cookies.");
			}
		});

	program
		.command("localstorage-list")
		.argument("[windowIndex]")
		.description("List localStorage entries")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const entries = await page.evaluate(() => {
						return Object.fromEntries(Object.entries(localStorage));
					});
					console.log(JSON.stringify(entries, null, 2));
				});
			} catch (error) {
				handleError(error, "Error: Failed to list localStorage.");
			}
		});

	program
		.command("localstorage-get")
		.argument("<key>")
		.argument("[windowIndex]")
		.description("Get localStorage value")
		.action(async (key: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const value = await page.evaluate(
						(k) => localStorage.getItem(k),
						key,
					);
					logInfo(`Value: ${value ?? "null"}`);
				});
			} catch (error) {
				handleError(error, `Error: Failed to read localStorage key ${key}.`);
			}
		});

	program
		.command("localstorage-set")
		.argument("<key>")
		.argument("<value>")
		.argument("[windowIndex]")
		.description("Set localStorage value")
		.action(async (key: string, value: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.evaluate(
						(payload) => localStorage.setItem(payload.key, payload.value),
						{ key, value },
					);
					logInfo("localStorage updated.");
				});
			} catch (error) {
				handleError(error, `Error: Failed to set localStorage key ${key}.`);
			}
		});

	program
		.command("localstorage-delete")
		.argument("<key>")
		.argument("[windowIndex]")
		.description("Delete localStorage key")
		.action(async (key: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.evaluate((k) => localStorage.removeItem(k), key);
					logInfo("localStorage key removed.");
				});
			} catch (error) {
				handleError(error, `Error: Failed to delete localStorage key ${key}.`);
			}
		});

	program
		.command("localstorage-clear")
		.argument("[windowIndex]")
		.description("Clear localStorage")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.evaluate(() => localStorage.clear());
					logInfo("localStorage cleared.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to clear localStorage.");
			}
		});

	program
		.command("sessionstorage-list")
		.argument("[windowIndex]")
		.description("List sessionStorage entries")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const entries = await page.evaluate(() => {
						return Object.fromEntries(Object.entries(sessionStorage));
					});
					console.log(JSON.stringify(entries, null, 2));
				});
			} catch (error) {
				handleError(error, "Error: Failed to list sessionStorage.");
			}
		});

	program
		.command("sessionstorage-get")
		.argument("<key>")
		.argument("[windowIndex]")
		.description("Get sessionStorage value")
		.action(async (key: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					const value = await page.evaluate(
						(k) => sessionStorage.getItem(k),
						key,
					);
					logInfo(`Value: ${value ?? "null"}`);
				});
			} catch (error) {
				handleError(error, `Error: Failed to read sessionStorage key ${key}.`);
			}
		});

	program
		.command("sessionstorage-set")
		.argument("<key>")
		.argument("<value>")
		.argument("[windowIndex]")
		.description("Set sessionStorage value")
		.action(async (key: string, value: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.evaluate(
						(payload) => sessionStorage.setItem(payload.key, payload.value),
						{ key, value },
					);
					logInfo("sessionStorage updated.");
				});
			} catch (error) {
				handleError(error, `Error: Failed to set sessionStorage key ${key}.`);
			}
		});

	program
		.command("sessionstorage-delete")
		.argument("<key>")
		.argument("[windowIndex]")
		.description("Delete sessionStorage key")
		.action(async (key: string, rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.evaluate((k) => sessionStorage.removeItem(k), key);
					logInfo("sessionStorage key removed.");
				});
			} catch (error) {
				handleError(
					error,
					`Error: Failed to delete sessionStorage key ${key}.`,
				);
			}
		});

	program
		.command("sessionstorage-clear")
		.argument("[windowIndex]")
		.description("Clear sessionStorage")
		.action(async (rawWindowIndex?: string) => {
			try {
				await withRendererContext(rawWindowIndex, async ({ page }) => {
					await page.evaluate(() => sessionStorage.clear());
					logInfo("sessionStorage cleared.");
				});
			} catch (error) {
				handleError(error, "Error: Failed to clear sessionStorage.");
			}
		});
}
