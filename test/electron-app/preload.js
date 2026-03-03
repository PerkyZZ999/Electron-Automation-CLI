const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appApi", {
	ping: () => ipcRenderer.invoke("app:ping"),
});
