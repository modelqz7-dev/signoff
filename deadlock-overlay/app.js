const { heroes, items } = window.DATA;
const heroById = new Map(heroes.map((h) => [h.id, h]));
const itemByApiId = new Map(Object.values(items).map((it) => [it.id, it]));
const SLOT = { weapon: "Оружие", vitality: "Живучесть", spirit: "Дух" };
const OUTCOME = { 1: "win", 2: "loss" };

function matchKind(m) {
  if (OUTCOME[m.player_match_outcome]) return OUTCOME[m.player_match_outcome];
  if (m.player_match_outcome === 5) return "neutral";
  const teams = [0, 1];
  if (teams.includes(m.match_result) && teams.includes(m.player_team)) return m.match_result === m.player_team ? "win" : "loss";
  return "neutral";
}

const view = document.getElementById("view");
const nav = document.getElementById("nav");
let settings = {};
let renderToken = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function img(src, className) {
  const node = el("img", className);
  node.src = src || "";
  node.alt = "";
  return node;
}

const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtDate = (unix) => new Date(unix * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function sumBy(rows, idField) {
  const out = new Map();
  for (const r of rows) {
    const cur = out.get(r[idField]) || { wins: 0, matches: 0 };
    cur.wins += r.wins;
    cur.matches += r.matches;
    out.set(r[idField], cur);
  }
  return out;
}

function message(text, className = "empty") {
  return el("p", className, text);
}

/* ---------- player profile (like the in-game profile) ---------- */

const MODE = { 1: "Обычный матч", 2: "Пользовательский", 3: "Матч с ботами", 4: "Ранговый" };
const PAGE_SIZE = 16;
const STRIP_COUNT = 8;
const PLAYER_TTL = 5 * 60 * 1000;
const playerCache = new Map();
const num = (v) => Math.round(v).toLocaleString("ru-RU");

async function loadPlayer(id) {
  const hit = playerCache.get(id);
  if (hit && Date.now() - hit.at < PLAYER_TTL) return hit.value;
  const [hist, hs] = await Promise.all([
    window.overlay.api(`/v1/players/${id}/match-history`, {}),
    window.overlay.api("/v1/players/hero-stats", { account_ids: id }),
  ]);
  if (!hist.ok) return { ok: false, error: hist.error };
  const value = {
    ok: true,
    matches: [...hist.data].sort((a, b) => b.start_time - a.start_time),
    heroStats: hs.ok ? hs.data : [],
    statsError: hs.ok ? null : hs.error,
  };
  playerCache.set(id, { at: Date.now(), value });
  return value;
}

function matchCard(m, big) {
  const kind = matchKind(m);
  const hero = heroById.get(m.hero_id);
  const card = el("div", `mcard ${kind}${big ? " big" : ""}`);
  card.title = `outcome ${m.player_match_outcome}, result ${m.match_result}, team ${m.player_team}`;
  const top = el("div", "mtop");
  top.append(
    el("span", "mres", kind === "win" ? "Победа" : kind === "loss" ? "Поражение" : "Не учтён"),
    el("span", "mmode", MODE[m.match_mode] || "Матч"),
  );
  const text = el("div", "mtext");
  text.append(
    top,
    el("div", "mhero", hero ? hero.name : `Герой ${m.hero_id}`),
    el("div", "mdur", fmtDuration(m.match_duration_s)),
    el("div", "mkda", `${m.player_kills} / ${m.player_deaths} / ${m.player_assists}`),
    el("div", "mdate", fmtDate(m.start_time)),
  );
  const side = el("div", "mside");
  side.append(img(hero && hero.small, "mhero-img"));
  const worth = el("div", "mworth", `${Math.round(m.net_worth / 1000)} т.`);
  worth.title = "Души";
  side.append(worth);
  card.append(text, side);
  return card;
}

function sumStats(list) {
  const t = { matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0, damage: 0, boss: 0, time: 0, denies: 0, dpmW: 0, npmW: 0, cpmW: 0, accW: 0 };
  for (const s of list) {
    const tp = s.time_played || 0;
    t.matches += s.matches_played;
    t.wins += s.wins;
    t.kills += s.kills;
    t.deaths += s.deaths;
    t.assists += s.assists;
    t.damage += s.total_player_damage;
    t.boss += s.total_boss_damage;
    t.time += tp;
    t.denies += s.denies_per_match * s.matches_played;
    t.dpmW += s.damage_per_min * tp;
    t.npmW += s.networth_per_min * tp;
    t.cpmW += s.creeps_per_min * tp;
    t.accW += s.accuracy * s.matches_played;
  }
  return t;
}

function statCell(label, value) {
  const c = el("div", "stat");
  c.append(el("div", "stat-value", value), el("div", "stat-label", label));
  return c;
}

function statsPanel(heroStats, heroId) {
  const panel = el("div", "stats");
  const list = heroId == null ? heroStats : heroStats.filter((s) => s.hero_id === heroId);
  const t = sumStats(list);
  const hero = heroId == null ? null : heroById.get(heroId);
  panel.append(el("div", "stats-kicker", "Статистика за всё время"), el("div", "stats-title", hero ? hero.name : "Все герои"));
  if (!t.matches) {
    panel.append(message("Нет данных."));
    return panel;
  }
  const secPerMatch = t.time / t.matches;
  const toSeconds = secPerMatch > 300 ? 1 : 60;
  const seconds = t.time * toSeconds;
  const perMin = (w) => (t.time ? w / t.time : 0);
  const acc = t.accW / t.matches;

  const body = el("div", "stats-body");
  const metrics = el("div", "metrics");
  metrics.append(
    statCell("Сыграно матчей", num(t.matches)),
    statCell("Выиграно матчей", num(t.wins)),
    statCell("Винрейт", `${pct(t.wins, t.matches)}%`),
    statCell("Время в игре", `${Math.floor(seconds / 3600)} ч ${Math.floor((seconds % 3600) / 60)} мин`),
    statCell("Урон в минуту", num(perMin(t.dpmW))),
    statCell("Души в минуту", num(perMin(t.npmW))),
    statCell("Добивания в минуту", perMin(t.cpmW).toFixed(1)),
    statCell("Укр. шаров", num(t.denies)),
  );
  const tiles = el("div", "tiles");
  tiles.append(
    statCell("Убийства", num(t.kills)),
    statCell("Помощь", num(t.assists)),
    statCell("Смерти", num(t.deaths)),
    statCell("Урон героям", num(t.damage)),
    statCell("Урон по боссам", num(t.boss)),
    statCell("Точность", `${(acc <= 1 ? acc * 100 : acc).toFixed(1)}%`),
  );
  body.append(metrics, tiles);
  panel.append(body);
  return panel;
}

function heroList(heroStats, selected, onSelect) {
  const list = el("div", "hero-list");
  const rows = [...heroStats].filter((s) => s.matches_played > 0).sort((a, b) => b.matches_played - a.matches_played);
  const max = rows.length ? rows[0].matches_played : 1;
  const mk = (id, name, icon, color, count) => {
    const b = el("button", `hero-row${selected === id ? " active" : ""}`);
    const bar = el("span", "hero-bar");
    bar.style.width = id == null ? "0%" : `${Math.max(6, (count / max) * 100)}%`;
    const label = el("span", "hero-row-label");
    if (icon) label.append(img(icon, "hero-row-img"));
    label.append(el("span", "", name), el("span", "muted small", id == null ? "" : String(count)));
    b.append(bar, label);
    b.addEventListener("click", () => onSelect(id));
    return b;
  };
  list.append(mk(null, "Все герои", null, null, 0));
  for (const s of rows) {
    const h = heroById.get(s.hero_id);
    list.append(mk(s.hero_id, h ? h.name : `Герой ${s.hero_id}`, h && h.small, h && h.color, s.matches_played));
  }
  return list;
}

async function renderPlayer(container, account) {
  const token = ++renderToken;
  container.replaceChildren(message("Загружаю профиль..."));
  const data = await loadPlayer(account.account_id);
  if (token !== renderToken) return;
  if (!data.ok) return container.replaceChildren(message(data.error, "error"));
  drawProfile(container, account, data, { hero: null });
}

function profileHead(account) {
  const head = el("div", "profile");
  head.append(img(account.avatarfull || account.avatar, "avatar"));
  const info = el("div");
  info.append(el("div", "name", account.personaname || `ID ${account.account_id}`), el("div", "muted small", `ID ${account.account_id}`));
  head.append(info);
  return head;
}

function drawProfile(container, account, data, state) {
  container.replaceChildren(profileHead(account));
  if (!data.matches.length) return container.append(message("Матчей не найдено."));
  const ageDays = (Date.now() / 1000 - data.matches[0].start_time) / 86400;
  if (ageDays > 7) {
    container.append(message(
      `Последний матч в данных API: ${fmtDate(data.matches[0].start_time)}. Свежие матчи API получает только если аккаунт добавлен в друзья его боту или матчи загружены через их Data Ingest на deadlock-api.com.`,
      "notice",
    ));
  }

  const bar = el("div", "section-bar");
  const full = el("button", "link", "Полная история матчей →");
  full.addEventListener("click", () => drawFullHistory(container, account, data, { filter: "all", page: 0 }));
  bar.append(el("h2", "", "История матчей"), full);
  const strip = el("div", "strip");
  for (const m of data.matches.slice(0, STRIP_COUNT)) strip.append(matchCard(m, false));
  container.append(bar, strip);

  if (data.statsError) return container.append(message(data.statsError, "error"));
  const split = el("div", "split");
  const right = el("div", "right");
  const draw = () => {
    split.replaceChildren(heroList(data.heroStats, state.hero, (id) => { state.hero = id; draw(); }), right);
    right.replaceChildren(statsPanel(data.heroStats, state.hero));
  };
  container.append(split);
  draw();
}

function drawFullHistory(container, account, data, state) {
  const filtered = data.matches.filter((m) => state.filter === "all" || matchKind(m) === state.filter);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages - 1);

  const back = el("button", "link", "← Профиль");
  back.addEventListener("click", () => drawProfile(container, account, data, { hero: null }));
  const select = el("select");
  for (const [value, label] of [["all", "Все матчи"], ["win", "Победы"], ["loss", "Поражения"]]) {
    const o = el("option", "", label);
    o.value = value;
    o.selected = value === state.filter;
    select.append(o);
  }
  select.addEventListener("change", () => drawFullHistory(container, account, data, { filter: select.value, page: 0 }));
  const bar = el("div", "section-bar");
  bar.append(el("h1", "", "История матчей"), select);

  const grid = el("div", "mgrid");
  for (const m of filtered.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE)) grid.append(matchCard(m, true));
  if (!filtered.length) grid.append(message("Нет матчей."));

  const prev = el("button", "ghost", "Назад");
  const next = el("button", "ghost", "След.");
  prev.disabled = state.page === 0;
  next.disabled = state.page >= pages - 1;
  prev.addEventListener("click", () => drawFullHistory(container, account, data, { ...state, page: state.page - 1 }));
  next.addEventListener("click", () => drawFullHistory(container, account, data, { ...state, page: state.page + 1 }));
  const pager = el("div", "pager");
  pager.append(prev, el("span", "muted", `Страница ${state.page + 1} из ${pages} · ${filtered.length} матчей`), next);

  container.replaceChildren(profileHead(account), back, bar, grid, pager);
}

/* ---------- player search (shared by Player page and Settings) ---------- */

function searchBox(placeholder, onPick, pickLabel) {
  const wrap = el("div");
  const field = el("div", "field");
  const input = el("input");
  input.type = "text";
  input.placeholder = placeholder;
  const go = el("button", "ghost", "Найти");
  field.append(input, go);
  const results = el("div", "results");
  wrap.append(field, results);

  async function run() {
    const q = input.value.trim();
    if (!q) return;
    results.replaceChildren(message("Ищу..."));
    const res = await window.overlay.api("/v1/players/steam-search", { search_query: q, limit: 10, min_matches_played_last_30d: 0 });
    results.replaceChildren();
    if (!res.ok) return results.append(message(res.error, "error"));
    if (!res.data.length) return results.append(message("Ничего не найдено."));
    for (const p of res.data) {
      const row = el("button", "result-row");
      row.append(img(p.avatar, "avatar"), el("span", "pname", p.personaname), el("span", "muted small", `ID ${p.account_id}`));
      if (pickLabel) row.append(el("span", "muted small", pickLabel));
      row.addEventListener("click", () => onPick(p));
      results.append(row);
    }
  }
  go.addEventListener("click", run);
  input.addEventListener("keydown", (e) => e.key === "Enter" && run());
  return wrap;
}

/* ---------- pages ---------- */

const pages = {
  home() {
    view.replaceChildren(el("h1", "", "Главная"));
    if (!settings.account) {
      view.append(message("Профиль не привязан. Привяжи свой профиль в настройках, и здесь появятся твои матчи."));
      const btn = el("button", "ghost", "Открыть настройки");
      btn.addEventListener("click", () => go("settings"));
      view.append(btn);
      return;
    }
    const box = el("div");
    view.append(box);
    renderPlayer(box, settings.account);
  },

  player() {
    view.replaceChildren(el("h1", "", "Игрок"));
    const out = el("div");
    view.append(searchBox("Ник или ID игрока", (p) => renderPlayer(out, p)), out);
  },

  settings() {
    view.replaceChildren(el("h1", "", "Настройки"));

    const acc = el("div", "settings-block");
    acc.append(el("h2", "", "Профиль"));
    const line = el("div", "profile");
    if (settings.account) {
      line.append(img(settings.account.avatar, "avatar"));
      const info = el("div");
      info.append(el("div", "name", settings.account.personaname), el("div", "muted small", `ID ${settings.account.account_id}`));
      line.append(info);
      const off = el("button", "ghost", "Отвязать");
      off.addEventListener("click", async () => {
        settings = await window.overlay.setSettings({ account: null });
        pages.settings();
      });
      line.append(off);
    } else {
      line.append(message("Не привязан."));
    }
    acc.append(line, el("p", "muted small", "Найди себя по нику или ID (код дружбы из игры) и нажми на строку."));
    acc.append(searchBox("Ник или ID", async (p) => {
      settings = await window.overlay.setSettings({ account: { account_id: p.account_id, personaname: p.personaname, avatar: p.avatar, avatarfull: p.avatarfull } });
      pages.settings();
    }, "Привязать"));
    view.append(acc);

    const ov = el("div", "settings-block");
    ov.append(el("h2", "", "Оверлей"));
    ov.append(el("p", "", "Горячая клавиша: F8 (показать и скрыть). Оверлей виден поверх игры только в режиме «окно без рамки»."));
    view.append(ov);

    const about = el("div", "settings-block");
    about.append(el("h2", "", "О программе"));
    about.append(el("p", "muted", "Данные: deadlock-api.com. Проект не связан с Valve и не одобрен ею."));
    view.append(about);
  },

  heroes() {
    view.replaceChildren(el("h1", "", "Герои"));
    const body = el("div");
    view.append(body);
    metaHeroes(body);
  },

  items() {
    view.replaceChildren(el("h1", "", "Предметы"));
    const body = el("div");
    view.append(body);
    metaItems(body);
  },
};

/* ---------- meta tables ---------- */

function sortableTable(container, columns, rows, defaultSort) {
  let sort = { key: defaultSort, dir: -1 };
  function draw() {
    const sorted = [...rows].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      return (typeof x === "string" ? x.localeCompare(y, "ru") : x - y) * sort.dir;
    });
    const table = el("table");
    const tr = el("tr");
    for (const c of columns) {
      const th = el("th", (c.num ? "num " : "") + (sort.key === c.key ? "sorted" : ""), c.label);
      th.addEventListener("click", () => {
        sort = { key: c.key, dir: sort.key === c.key ? -sort.dir : c.num ? -1 : 1 };
        draw();
      });
      tr.append(th);
    }
    const thead = el("thead");
    thead.append(tr);
    table.append(thead);
    const tbody = el("tbody");
    for (const r of sorted) {
      const row = el("tr");
      for (const c of columns) {
        const td = el("td", c.num ? "num" : "");
        td.append(c.render(r));
        row.append(td);
      }
      tbody.append(row);
    }
    table.append(tbody);
    container.replaceChildren(table);
  }
  draw();
}

const wrCell = (r) => el("span", r.wr >= 50 ? "up" : "down", `${r.wr}%`);

async function metaHeroes(container) {
  container.replaceChildren(message("Загружаю..."));
  const res = await window.overlay.api("/v1/analytics/hero-stats", {});
  if (!res.ok) return container.replaceChildren(message(res.error, "error"));
  const by = sumBy(res.data, "hero_id");
  let total = 0;
  for (const v of by.values()) total += v.matches;
  const rows = [...by]
    .filter(([id, v]) => heroById.has(id) && v.matches >= 100)
    .map(([id, v]) => ({ name: heroById.get(id).name, icon: heroById.get(id).small, wr: pct(v.wins, v.matches), pick: pct(v.matches, total), matches: v.matches }));
  const text = (v) => { const s = el("span"); s.textContent = v; return s; };
  sortableTable(container, [
    { key: "name", label: "Герой", render: (r) => { const c = el("div", "cell"); c.append(img(r.icon), text(r.name)); return c; } },
    { key: "wr", label: "Винрейт", num: true, render: wrCell },
    { key: "pick", label: "Пикрейт", num: true, render: (r) => text(`${r.pick}%`) },
    { key: "matches", label: "Матчи", num: true, render: (r) => text(String(r.matches)) },
  ], rows, "wr");
}

async function metaItems(container) {
  container.replaceChildren(message("Загружаю..."));
  const res = await window.overlay.api("/v1/analytics/item-stats", {});
  if (!res.ok) return container.replaceChildren(message(res.error, "error"));
  const rows = [...sumBy(res.data, "item_id")]
    .filter(([id, v]) => itemByApiId.has(id) && v.matches >= 500)
    .map(([id, v]) => { const it = itemByApiId.get(id); return { name: it.name, icon: it.img, slot: SLOT[it.slot] || "", tier: it.tier, wr: pct(v.wins, v.matches), matches: v.matches }; });
  const text = (v) => { const s = el("span"); s.textContent = v; return s; };
  sortableTable(container, [
    { key: "name", label: "Предмет", render: (r) => { const c = el("div", "cell"); c.append(img(r.icon), text(r.name)); return c; } },
    { key: "slot", label: "Слот", render: (r) => text(r.slot) },
    { key: "tier", label: "Тир", num: true, render: (r) => text(`T${r.tier}`) },
    { key: "wr", label: "Винрейт", num: true, render: wrCell },
    { key: "matches", label: "Матчи", num: true, render: (r) => text(String(r.matches)) },
  ], rows, "wr");
}

/* ---------- navigation ---------- */

function go(name) {
  renderToken++;
  nav.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.page === name));
  pages[name]();
}

nav.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-page]");
  if (b) go(b.dataset.page);
});
document.getElementById("openOverlay").addEventListener("click", () => window.overlay.toggleOverlay());

(async () => {
  settings = await window.overlay.getSettings();
  go("home");
})();
