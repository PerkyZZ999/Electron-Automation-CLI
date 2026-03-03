const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("fixtureMeta", {
	name: "basic-electron-app",
	version: "1.0.0",
});
