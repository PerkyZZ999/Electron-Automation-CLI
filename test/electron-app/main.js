const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

function createWindow() {
	const window = new BrowserWindow({
		width: 1100,
		height: 760,
		show: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	window.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("app:ping", () => {
	return {
		ok: true,
		timestamp: new Date().toISOString(),
		platform: process.platform,
	};
});

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
