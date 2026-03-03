import type { Command } from "commander";
import { createConnection } from "node:net";
import { EXIT_CODE, fail, logInfo } from "../utils/logger";
import {
	clearSessionState,
	isProcessRunning,
	readSessionState,
} from "../utils/state";

interface EvalMainOptions {
	allowUnsafe?: boolean;
}

function hasUnsafePermission(options?: EvalMainOptions): boolean {
	return options?.allowUnsafe === true || process.env.ECLI_ALLOW_UNSAFE === "1";
}

interface EvalBridgeResponse {
	id: number | null;
	ok: boolean;
	result?: unknown;
	error?: string;
}

function summarizeResult(value: unknown): string {
	const serialized =
		typeof value === "string"
			? value
			: (JSON.stringify(value, null, 0) ?? String(value));

	if (serialized.length <= 240) {
		return serialized;
	}

	return `${serialized.slice(0, 240)}…(truncated)`;
}

async function evaluateInMain(
	socketPath: string,
	code: string,
): Promise<EvalBridgeResponse> {
	return await new Promise((resolvePromise, rejectPromise) => {
		const socket = createConnection(socketPath);
		const requestId = Date.now();
		let buffered = "";

		socket.once("connect", () => {
			socket.write(`${JSON.stringify({ id: requestId, code })}\n`);
		});

		socket.on("data", (chunk) => {
			buffered += chunk.toString("utf8");
			const frames = buffered.split("\n");
			buffered = frames.pop() ?? "";

			for (const frame of frames) {
				if (!frame.trim()) {
					continue;
				}

				try {
					const payload = JSON.parse(frame) as EvalBridgeResponse;
					resolvePromise(payload);
					socket.end();
					return;
				} catch (error) {
					rejectPromise(error);
					socket.destroy();
					return;
				}
			}
		});

		socket.once("error", (error) => {
			rejectPromise(error);
		});
	});
}

export function registerEvalMainCommand(program: Command): void {
	program
		.command("eval-main")
		.argument("<jsCode>")
		.option(
			"--allow-unsafe",
			"acknowledge privileged main-process code execution",
		)
		.description("Evaluate JavaScript in the Electron main process")
		.action(async (jsCode: string, options?: EvalMainOptions) => {
			try {
				if (!hasUnsafePermission(options)) {
					fail(
						"Error: eval-main is unsafe by design. Re-run with --allow-unsafe or set ECLI_ALLOW_UNSAFE=1.",
						EXIT_CODE.INVALID_ARGS,
					);
					return;
				}

				const session = await readSessionState();
				if (!isProcessRunning(session.pid)) {
					await clearSessionState();
					fail(
						"Error: Electron process died. Please run e-cli launch again.",
						EXIT_CODE.SESSION,
					);
					return;
				}

				if (!session.mainSocketPath) {
					fail(
						"Error: Main-process bridge unavailable in session. Please run e-cli launch again.",
						EXIT_CODE.SESSION,
					);
					return;
				}

				const response = await evaluateInMain(session.mainSocketPath, jsCode);
				if (!response.ok) {
					fail(
						`Error: eval-main failed. ${response.error ?? "Unknown error."}`,
						EXIT_CODE.ACTION,
					);
					return;
				}

				logInfo(`Result: ${summarizeResult(response.result)}`);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown eval-main error.";
				if (message.startsWith("Error: No active session")) {
					fail(message, EXIT_CODE.SESSION);
					return;
				}

				if (/ENOENT|ECONNREFUSED|EPIPE/i.test(message)) {
					fail(
						"Error: Electron process died. Please run e-cli launch again.",
						EXIT_CODE.SESSION,
					);
					return;
				}

				fail(`Error: eval-main failed. ${message}`, EXIT_CODE.ACTION);
			}
		});
}
