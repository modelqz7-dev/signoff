const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const fs = require("fs");
const path = require("path");
const api = require("./api");

const TOGGLE_KEY = "F8";
let mainWin;
let overlayWin;

function settingsFile() {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeSettings(next) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2));
}

const webPreferences = () => ({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  preload: path.join(__dirname, "preload.js"),
});

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0e1110",
    title: "Deadlock Tracker",
    autoHideMenuBar: true,
    webPreferences: webPreferences(),
  });
  mainWin.removeMenu();
  mainWin.loadFile("app.html");
  mainWin.on("closed", () => app.quit());
}

function createOverlayWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  overlayWin = new BrowserWindow({
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
    webPreferences: webPreferences(),
  });
  overlayWin.setAlwaysOnTop(true, "screen-saver");
  overlayWin.loadFile("index.html");
}

function showOverlay() {
  overlayWin.show();
  overlayWin.focus();
  overlayWin.webContents.send("focus-search");
}

function toggleOverlay() {
  if (overlayWin.isVisible()) overlayWin.hide();
  else showOverlay();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();
    createOverlayWindow();
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
  ipcMain.handle("settings:get", () => readSettings());
  ipcMain.handle("settings:set", (_e, patch) => {
    const next = { ...readSettings(), ...patch };
    writeSettings(next);
    return next;
  });
  ipcMain.on("overlay:toggle", toggleOverlay);
  ipcMain.on("hide", () => overlayWin && overlayWin.hide());
  ipcMain.on("quit", () => app.quit());

  app.on("will-quit", () => globalShortcut.unregisterAll());
  app.on("window-all-closed", () => app.quit());
}
