const { access, writeFile } = require("node:fs/promises");
const { createServer } = require("node:net");
const { resolve } = require("node:path");
const { _electron: electron } = require("playwright");

function sleep(ms) {
	return new Promise((resolvePromise) => {
		setTimeout(resolvePromise, ms);
	});
}

async function getAvailablePort() {
	return await new Promise((resolvePromise, rejectPromise) => {
		const server = createServer();

		server.on("error", rejectPromise);
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

async function resolveWsEndpoint(port) {
	const endpointUrl = `http://127.0.0.1:${port}/json/version`;
	const maxAttempts = 60;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		try {
			const response = await fetch(endpointUrl);
			if (!response.ok) {
				await sleep(200);
				continue;
			}

			const payload = await response.json();
			if (
				typeof payload.webSocketDebuggerUrl === "string" &&
				payload.webSocketDebuggerUrl.length > 0
			) {
				return payload.webSocketDebuggerUrl;
			}
		} catch {
			// Continue retrying.
		}

		await sleep(200);
	}

	throw new Error("Unable to resolve CDP endpoint from Electron process.");
}

async function main() {
	const appPathArg = process.argv[2];
	const headless = process.argv.includes("--headless");
	if (!appPathArg) {
		throw new Error("Missing appPath argument for node launch helper.");
	}

	const resolvedAppPath = resolve(process.cwd(), appPathArg);
	await access(resolvedAppPath);

	const cdpPort = await getAvailablePort();
	const launchArgs = [resolvedAppPath, `--remote-debugging-port=${cdpPort}`];
	if (process.platform === "linux" && (headless || !process.env.DISPLAY)) {
		launchArgs.push("--disable-gpu");
	}

	const electronApp = await electron.launch({ args: launchArgs });
	const electronProcess = electronApp.process();
	const pid = electronProcess?.pid;
	if (!pid) {
		await electronApp.close();
		throw new Error("Electron launched without a valid process ID.");
	}

	try {
		const wsEndpoint = await resolveWsEndpoint(cdpPort);

		const sessionPath = resolve(process.cwd(), ".electron-session.json");
		await writeFile(
			sessionPath,
			`${JSON.stringify(
				{
					wsEndpoint,
					pid,
					appPath: resolvedAppPath,
				},
				null,
				2,
			)}\n`,
			"utf8",
		);

		process.stdout.write(`${sessionPath}\n`);
		await new Promise((resolvePromise) => {
			electronProcess.once("exit", () => {
				resolvePromise();
			});
		});
	} catch (error) {
		await electronApp.close();
		throw error;
	}
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exit(1);
});
