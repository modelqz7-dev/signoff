const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlay", {
  hide: () => ipcRenderer.send("hide"),
  quit: () => ipcRenderer.send("quit"),
  api: (endpoint, params) => ipcRenderer.invoke("api", endpoint, params),
  onFocusSearch: (cb) => ipcRenderer.on("focus-search", () => cb()),
});
