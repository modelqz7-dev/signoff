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

const NAMES_TTL = 7 * 24 * 3600 * 1000;

async function loadNames() {
  const file = path.join(app.getPath("userData"), "names-ru-3.json");
  try {
    const cached = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Date.now() - cached.at < NAMES_TTL) return cached.names;
  } catch {}
  const [heroes, items] = await Promise.all([
    api.call("/v1/assets/heroes", { language: "russian" }),
    api.call("/v1/assets/items", { language: "russian" }),
  ]);
  const names = { heroes: {}, items: {}, desc: {}, abil: {} };
  for (const h of heroes) if (h.name) names.heroes[h.id] = h.name;
  for (const h of heroes) if (h.description) names.desc[h.id] = h.description;
  for (const i of items) if (i.name) names.items[i.id] = i.name;
  for (const i of items) {
    if (i.type !== "ability" || !i.description || !i.description.desc) continue;
    const labels = {};
    for (const [k, v] of Object.entries(i.properties || {})) if (v && v.label) labels[k] = v.label;
    names.abil[i.id] = { name: i.name, desc: i.description.desc, t: [i.description.t1_desc, i.description.t2_desc, i.description.t3_desc], labels };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ at: Date.now(), names }));
  return names;
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
  let namesPromise = null;
  ipcMain.handle("names", () => {
    if (!namesPromise) namesPromise = loadNames().catch(() => null);
    return namesPromise;
  });
  ipcMain.handle("asset", async (_e, url) => {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" || u.hostname !== "assets-bucket.deadlock-api.com") throw new Error("host not allowed");
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true, data: new Uint8Array(await res.arrayBuffer()) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  const portraitFile = (id) => path.join(app.getPath("userData"), "portraits", `${Number(id)}-v1.png`);
  ipcMain.handle("portrait:get", (_e, id) => {
    try {
      return fs.readFileSync(portraitFile(id));
    } catch {
      return null;
    }
  });
  ipcMain.handle("portrait:save", (_e, id, bytes) => {
    try {
      fs.mkdirSync(path.dirname(portraitFile(id)), { recursive: true });
      fs.writeFileSync(portraitFile(id), Buffer.from(bytes));
      return true;
    } catch {
      return false;
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
