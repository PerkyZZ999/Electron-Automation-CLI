const path = require("node:path");
const { app, BrowserWindow } = require("electron");

function createWindow() {
	const window = new BrowserWindow({
		width: 980,
		height: 760,
		show: true,
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
		},
	});

	window.loadFile(path.join(__dirname, "renderer", "index.html"));
}

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
