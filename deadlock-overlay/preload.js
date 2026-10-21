const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlay", {
  hide: () => ipcRenderer.send("hide"),
  quit: () => ipcRenderer.send("quit"),
  onFocusSearch: (cb) => ipcRenderer.on("focus-search", () => cb()),
});
