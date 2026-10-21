const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlay", {
  hide: () => ipcRenderer.send("hide"),
  quit: () => ipcRenderer.send("quit"),
  toggleOverlay: () => ipcRenderer.send("overlay:toggle"),
  api: (endpoint, params) => ipcRenderer.invoke("api", endpoint, params),
  getNames: () => ipcRenderer.invoke("names"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),
  onFocusSearch: (cb) => ipcRenderer.on("focus-search", () => cb()),
});
