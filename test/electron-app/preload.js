import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appApi", {
	ping: () => ipcRenderer.invoke("app:ping"),
});
