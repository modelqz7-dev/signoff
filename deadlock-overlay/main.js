const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const path = require("path");
const api = require("./api");

const TOGGLE_KEY = "F8";
let win;

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: 420,
    height: 720,
    x: width - 440,
    y: 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.loadFile("index.html");
  win.once("ready-to-show", showOverlay);
}

function showOverlay() {
  win.show();
  win.focus();
  win.webContents.send("focus-search");
}

function toggleOverlay() {
  if (win.isVisible()) win.hide();
  else showOverlay();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createWindow();
    if (!globalShortcut.register(TOGGLE_KEY, toggleOverlay)) {
      console.error(`Could not register global shortcut ${TOGGLE_KEY}`);
    }
  });
  ipcMain.handle("api", async (_e, endpoint, params) => {
    try {
      return { ok: true, data: await api.call(endpoint, params) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  ipcMain.on("hide", () => win && win.hide());
  ipcMain.on("quit", () => app.quit());
  app.on("will-quit", () => globalShortcut.unregisterAll());
  app.on("window-all-closed", () => app.quit());
}
