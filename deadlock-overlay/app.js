const { heroes, items } = window.DATA;
for (const h of heroes) h.en = h.name;
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

async function applyNames() {
  const names = await window.overlay.getNames();
  if (!names) return;
  for (const h of heroes) if (names.heroes[h.id]) h.name = names.heroes[h.id];
  for (const h of heroes) {
    const d = names.desc && names.desc[h.id];
    if (d) {
      h.role = d.role || h.role;
      h.playstyle = d.playstyle || h.playstyle;
      h.lore = d.lore || h.lore;
    }
  }
  for (const h of heroes) {
    for (const ab of h.abilities || []) {
      const r = names.abil && names.abil[ab.id];
      if (!r) continue;
      ab.name = r.name || ab.name;
      ab.desc = r.desc || ab.desc;
      ab.tiers = r.t || ab.tiers;
      for (const t of ab.tiles) if (r.labels && r.labels[t.prop]) t.label = r.labels[t.prop];
    }
  }
  for (const it of itemByApiId.values()) if (names.items[it.id]) it.name = names.items[it.id];
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
  const rankBox = el("div", "rank-card");
  container.append(rankBox);
  loadRank(rankBox, account.account_id);
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


/* ---------- rank badge ---------- */

let ranksPromise = null;
function getRanks() {
  if (!ranksPromise) {
    ranksPromise = window.overlay.api("/v1/assets/ranks", { language: "russian" }).then((res) => {
      if (!res.ok) ranksPromise = null;
      return res.ok ? res.data : [];
    });
  }
  return ranksPromise;
}

async function loadRank(box, accountId) {
  const [res, ranks] = await Promise.all([window.overlay.api(`/v1/players/${accountId}/rank`, {}), getRanks()]);
  if (!res.ok || !res.data || !res.data.rank) return box.remove();
  const def = ranks.find((r) => r.tier === res.data.rank);
  const sub = res.data.subrank;
  const src = def && def.images && (def.images[`large_subrank${sub}_webp`] || def.images.large_webp || def.images.large);
  box.append(img(src, "rank-img"));
  const info = el("div");
  info.append(el("div", "rank-name", `${def ? def.name : `Ранг ${res.data.rank}`}${sub ? ` ${sub}` : ""}`), el("div", "muted small", "Ранг по последнему рейтинговому матчу"));
  box.append(info);
}

/* ---------- player search (shared by Player page and Settings) ---------- */

function svgIcon(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  for (const d of paths) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}

function playerRow(p, pickLabel, onPick) {
  const row = el("button", "result-row");
  const info = el("div", "result-info");
  info.append(el("div", "pname", p.personaname || `ID ${p.account_id}`), el("div", "muted small", `ID ${p.account_id}`));
  row.append(img(p.avatar, "avatar"), info);
  if (typeof p.matches_played_last_30d === "number") row.append(el("span", "muted small", `${p.matches_played_last_30d} матчей за 30 дней`));
  if (pickLabel) row.append(el("span", "pick", pickLabel));
  row.addEventListener("click", () => onPick(p));
  return row;
}

function searchBox(placeholder, onPick, pickLabel, big) {
  const wrap = el("div", big ? "search-big" : "search-compact");
  const field = el("div", "sfield");
  field.append(svgIcon(["M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z", "m20 20-4.9-4.9"]));
  const input = el("input");
  input.type = "text";
  input.placeholder = placeholder;
  const go = el("button", "sgo", "Найти");
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
    if (!res.data.length) return results.append(message("Ничего не найдено. Попробуй ID (код дружбы) вместо ника."));
    for (const p of res.data) results.append(playerRow(p, pickLabel, onPick));
  }
  go.addEventListener("click", run);
  input.addEventListener("keydown", (e) => e.key === "Enter" && run());
  setTimeout(() => input.focus(), 0);
  return wrap;
}

/* ---------- pages ---------- */

const pages = {
  home() {
    view.replaceChildren();
    const top = el("section", "home-hero");
    const left = el("div", "home-left");
    left.append(
      el("div", "kicker", "Deadlock"),
      el("h1", "home-title", "Трекер матчей и меты"),
      el("p", "home-lead", "Статистика героев и предметов, профили игроков, лидерборд и оверлей, который подсказывает, что покупать против врага."),
      searchBox("Ник или ID игрока", openProfile, null, true),
    );
    const actions = el("div", "home-actions");
    for (const [label, page] of [["Мой профиль", "me"], ["Герои", "heroes"], ["Предметы", "items"]]) {
      const b = el("button", "ghost", label);
      b.addEventListener("click", () => go(page));
      actions.append(b);
    }
    const ov = el("button", "ghost", "Открыть оверлей");
    ov.addEventListener("click", () => window.overlay.toggleOverlay());
    actions.append(ov);
    left.append(actions);
    const live = el("div", "live-card");
    top.append(left, live);

    const lower = el("div", "home-lower");
    const lb = el("div", "panel-card");
    const meta = el("div");
    lower.append(lb, meta);
    view.append(top, lower);
    loadLive(live);
    loadLeaderboard(lb, "Europe");
    metaHome(meta, true);
  },

  me() {
    view.replaceChildren(el("h1", "", "Мой профиль"));
    if (!settings.account) {
      const banner = el("div", "banner");
      banner.append(el("span", "", "Профиль не привязан. Найди себя по нику или ID в настройках."));
      const btn = el("button", "ghost", "Открыть настройки");
      btn.addEventListener("click", () => go("settings"));
      banner.append(btn);
      view.append(banner);
      return;
    }
    const box = el("div");
    view.append(box);
    renderPlayer(box, settings.account);
  },

  player() {
    const remember = async (p) => {
      const recent = [{ account_id: p.account_id, personaname: p.personaname, avatar: p.avatar, avatarfull: p.avatarfull }]
        .concat((settings.recent || []).filter((r) => r.account_id !== p.account_id))
        .slice(0, 6);
      settings = await window.overlay.setSettings({ recent });
    };

    const showProfile = (p) => {
      remember(p);
      view.replaceChildren();
      const top = searchBox("Ник или ID игрока", showProfile, null, false);
      const out = el("div", "profile-out");
      view.append(top, out);
      renderPlayer(out, p);
    };

    if (pendingProfile) {
      const p = pendingProfile;
      pendingProfile = null;
      return showProfile(p);
    }
    view.replaceChildren();
    const page = el("div", "search-page");
    const hero = el("div", "search-hero");
    hero.append(el("div", "kicker", "Deadlock"), el("h1", "search-title", "Поиск игрока"), el("p", "muted", "Найди профиль по нику или ID: код дружбы из игры тоже подходит."));
    const box = searchBox("Ник или ID игрока", showProfile, null, true);
    page.append(hero, box);

    const quick = el("div", "quick");
    if (settings.account) {
      quick.append(el("div", "quick-label", "Мой профиль"));
      quick.append(playerRow(settings.account, null, showProfile));
    }
    if ((settings.recent || []).length) {
      quick.append(el("div", "quick-label", "Недавние"));
      for (const r of settings.recent) quick.append(playerRow(r, null, showProfile));
    }
    if (quick.children.length) page.append(quick);
    view.append(page);
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
    heroesPage();
  },

  sounds() {
    soundsPage();
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


/* ---------- meta dashboard (home without a linked profile) ---------- */

function dashPanel(title, rows, linkText, page) {
  const card = el("div", "dash-card");
  card.append(el("h2", "", title));
  for (const r of rows) {
    const row = el("div", "dash-row");
    row.append(img(r.icon, "dash-img"), el("span", "dash-name", r.name), el("span", `dash-val ${r.cls || ""}`, r.value));
    card.append(row);
  }
  const link = el("button", "link", linkText);
  link.addEventListener("click", () => go(page));
  card.append(link);
  return card;
}

async function metaHome(container, stacked) {
  container.replaceChildren(message("Загружаю мету..."));
  const [hs, is] = await Promise.all([
    window.overlay.api("/v1/analytics/hero-stats", {}),
    window.overlay.api("/v1/analytics/item-stats", {}),
  ]);
  if (!hs.ok) return container.replaceChildren(message(hs.error, "error"));
  const by = sumBy(hs.data, "hero_id");
  let total = 0;
  for (const v of by.values()) total += v.matches;
  const heroRows = [...by]
    .filter(([id, v]) => heroById.has(id) && v.matches >= 300)
    .map(([id, v]) => ({ hero: heroById.get(id), wr: pct(v.wins, v.matches), pick: pct(v.matches, total) }));
  const toRow = (r, value, cls) => ({ icon: r.hero.small, name: r.hero.name, value, cls });
  const best = [...heroRows].sort((a, b) => b.wr - a.wr).slice(0, 8).map((r) => toRow(r, `${r.wr}%`, r.wr >= 50 ? "up" : "down"));
  const popular = [...heroRows].sort((a, b) => b.pick - a.pick).slice(0, 8).map((r) => toRow(r, `${r.pick}%`));
  const grid = el("div", stacked ? "dash stack" : "dash");
  grid.append(dashPanel("Лучшие герои по винрейту", best, "Все герои →", "heroes"), dashPanel("Самые популярные герои", popular, "Все герои →", "heroes"));
  if (is.ok) {
    const itemRows = [...sumBy(is.data, "item_id")]
      .filter(([id, v]) => itemByApiId.has(id) && v.matches >= 2000)
      .map(([id, v]) => ({ it: itemByApiId.get(id), wr: pct(v.wins, v.matches) }))
      .sort((a, b) => b.wr - a.wr)
      .slice(0, 8)
      .map((r) => ({ icon: r.it.img, name: r.it.name, value: `${r.wr}%`, cls: r.wr >= 50 ? "up" : "down" }));
    grid.append(dashPanel("Лучшие предметы", itemRows, "Все предметы →", "items"));
  }
  container.replaceChildren(grid);
}


/* ---------- home: live matches, leaderboard ---------- */

let pendingProfile = null;
const REGIONS = [["Europe", "Европа"], ["NAmerica", "Сев. Америка"], ["Asia", "Азия"], ["SAmerica", "Юж. Америка"], ["Oceania", "Океания"]];
const MODE_RU = { Ranked: "Ранговый", Unranked: "Обычный", PrivateLobby: "Пользовательский", CoopBot: "С ботами" };
const kfmt = (n) => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n || 0));

async function loadLive(container) {
  container.replaceChildren(message("Загружаю матчи..."));
  const res = await window.overlay.api("/v1/matches/active", {});
  if (!res.ok) return container.replaceChildren(message(res.error, "error"));
  const list = res.data.filter((m) => m.players && m.players.length).sort((a, b) => (b.start_time || 0) - (a.start_time || 0));
  const head = el("div", "live-head");
  head.append(el("span", "live-dot"), el("span", "live-tag", "Сейчас"), el("span", "live-title", `${list.length} матчей в игре`));
  container.replaceChildren(head);
  for (const m of list.slice(0, 7)) {
    const row = el("div", "live-row");
    const t0 = (m.team_stats || []).find((t) => t.team === 0);
    const t1 = (m.team_stats || []).find((t) => t.team === 1);
    row.append(
      el("span", "live-time", fmtDuration(m.duration_s || 0)),
      el("span", "live-score", `${kfmt(m.net_worth_team_0 ?? (t0 && t0.net_worth))} — ${kfmt(m.net_worth_team_1 ?? (t1 && t1.net_worth))}`),
      el("span", "muted", MODE_RU[m.match_mode_parsed] || m.match_mode_parsed || "Матч"),
      el("span", "muted small live-spec", m.spectators ? `${m.spectators} зрителей` : ""),
    );
    container.append(row);
  }
  if (!list.length) container.append(message("Сейчас нет данных о текущих матчах."));
  container.append(el("p", "muted small", "Показаны матчи из вкладки просмотра игры (топ-200)."));
}

async function loadLeaderboard(container, region) {
  const body = el("div", "lb-body");
  const chips = el("div", "chips");
  for (const [id, label] of REGIONS) {
    const c = el("button", `chip${id === region ? " active" : ""}`, label);
    c.addEventListener("click", () => loadLeaderboard(container, id));
    chips.append(c);
  }
  container.replaceChildren(el("div", "lb-head"), chips, body);
  container.firstChild.append(el("h2", "", "Топ игроков"), el("span", "muted small", "рейтинг в игре"));
  body.append(message("Загружаю..."));
  const res = await window.overlay.api(`/v1/leaderboard/${region}`, {});
  body.replaceChildren();
  if (!res.ok) return body.append(message(res.error, "error"));
  const entries = (Array.isArray(res.data) ? res.data : res.data.entries || []).filter((e) => e.rank).sort((a, b) => a.rank - b.rank).slice(0, 10);
  if (!entries.length) return body.append(message("Нет данных."));
  for (const e of entries) {
    const row = el("div", "lb-row");
    row.append(el("span", "lb-rank", String(e.rank)), el("span", "lb-name", e.account_name || "Скрыт"));
    const heroesBox = el("span", "lb-heroes");
    for (const id of (e.top_hero_ids || []).slice(0, 3)) {
      const hh = heroById.get(id);
      if (hh) heroesBox.append(img(hh.small, "lb-hero"));
    }
    row.append(heroesBox);
    body.append(row);
  }
}

function openProfile(p) {
  pendingProfile = p;
  go("player");
}



/* ---------- heroes: card grid + hero page ---------- */

const TYPE_RU = { brawler: "Боец", marksman: "Стрелок", assassin: "Ассасин", mystic: "Мистик" };
let heroStatsPromise = null;

function getHeroStats() {
  if (!heroStatsPromise) {
    heroStatsPromise = window.overlay.api("/v1/analytics/hero-stats", {}).then((res) => {
      const map = new Map();
      if (!res.ok) {
        heroStatsPromise = null;
        return { error: res.error, map };
      }
      const by = sumBy(res.data, "hero_id");
      let total = 0;
      for (const v of by.values()) total += v.matches;
      for (const [id, v] of by) if (v.matches >= 100) map.set(id, { wr: pct(v.wins, v.matches), pick: pct(v.matches, total), matches: v.matches });
      return { map };
    });
  }
  return heroStatsPromise;
}

function nameArt(h, className) {
  const wrap = el("span", className);
  if (h.nameImg) {
    const im = img(h.nameImg, "name-img");
    im.alt = h.name;
    im.addEventListener("error", () => wrap.replaceChildren(document.createTextNode(h.name)));
    wrap.append(im);
  } else {
    wrap.append(document.createTextNode(h.name));
  }
  return wrap;
}

function heroCard(h, st, index) {
  const card = el("button", "hcard");
  card.append(img(h.art || h.icon, "hcard-art"));
  if (st) card.append(el("span", `hcard-tag ${st.wr >= 50 ? "up" : "down"}`, `${st.wr}% побед`));
  const foot = el("div", "hcard-foot");
  foot.append(el("div", "hcard-role", TYPE_RU[h.type] || h.type || ""), nameArt(h, "hcard-name"));
  if (st) {
    const bar = el("div", "hcard-bar");
    const fill = el("span", st.wr >= 50 ? "up" : "down");
    const w = Math.min(50, (Math.abs(st.wr - 50) / 12) * 100);
    fill.style.width = `${w}%`;
    fill.style.left = st.wr >= 50 ? "50%" : `${50 - w}%`;
    bar.append(el("i", "hcard-mid"), fill);
    const nums = el("div", "hcard-nums");
    nums.append(el("span", "", `${st.pick}% выбор`), el("span", "", `${num(st.matches)} матчей`));
    foot.append(bar, nums);
  }
  card.append(foot);
  card.addEventListener("click", () => showHeroPage(h));
  return card;
}

async function heroesPage() {
  const token = ++renderToken;
  view.replaceChildren();
  const head = el("div", "page-head");
  const titles = el("div");
  titles.append(el("h1", "", "Герои"), el("p", "muted", "Винрейт и выбор героев за последние 30 дней."));
  const q = el("input");
  q.type = "text";
  q.placeholder = "Поиск героя";
  q.className = "mini-search";
  head.append(titles, q);

  const state = { sort: "name", q: "" };
  const controls = el("div", "controls");
  controls.append(el("span", "controls-label", "Сортировка"));
  const sorts = [["name", "А–Я"], ["wr", "Винрейт"], ["pick", "Выбор"], ["matches", "Матчи"]];
  const grid = el("div", "hero-cards");
  const stats = await getHeroStats();
  if (token !== renderToken) return;

  const draw = () => {
    const needle = state.q.trim().toLowerCase();
    const list = heroes.filter((h) => !needle || `${h.name} ${h.en}`.toLowerCase().includes(needle));
    list.sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "ru");
      const sa = stats.map.get(a.id), sb = stats.map.get(b.id);
      return ((sb && sb[state.sort]) || 0) - ((sa && sa[state.sort]) || 0);
    });
    grid.replaceChildren(...list.map((h, i) => heroCard(h, stats.map.get(h.id), i)));
  };
  for (const [key, label] of sorts) {
    const b = el("button", `chip${state.sort === key ? " active" : ""}`, label);
    b.addEventListener("click", () => {
      state.sort = key;
      controls.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b));
      draw();
    });
    controls.append(b);
  }
  q.addEventListener("input", () => { state.q = q.value; draw(); });
  view.append(head, controls);
  if (stats.error) view.append(message(stats.error, "error"));
  view.append(grid);
  draw();
}

function paragraphs(text, className) {
  const box = el("div");
  for (const part of String(text || "").split(/<br\s*\/?>/i)) {
    const clean = part.replace(/<[^>]+>/g, "").trim();
    if (clean) box.append(el("p", className, clean));
  }
  return box;
}

function chip(text) {
  return el("span", "tag", text);
}

function itemLine(key, extra) {
  const it = items[key];
  if (!it) return null;
  const row = el("div", "dash-row");
  row.append(img(it.img, "dash-img"), el("span", "dash-name", it.name), el("span", "muted small", extra));
  return row;
}


function plainText(html) {
  return String(html || "").replace(/<[^>]+>/g, "");
}

function richText(html, className) {
  const p = el("p", className);
  for (const part of String(html || "").split(/(<span class="highlight">.*?<\/span>)/)) {
    if (!part) continue;
    if (part.startsWith('<span class="highlight">')) p.append(el("strong", "", plainText(part)));
    else p.append(document.createTextNode(plainText(part)));
  }
  return p;
}

const unit = (v) => String(v == null ? "" : v).replace(/(\d)\.0(?=\D|$)/g, "$1").replace(/(\d)s$/, "$1 с").replace(/(\d)m$/, "$1 м");

function abilitiesBlock(h) {
  const list = h.abilities || [];
  const box = el("div", "abil");
  if (!list.length) return { row: message("Нет данных о способностях."), panel: el("div") };
  const row = el("div", "abil-row");
  const panel = el("div", "abil-panel");
  let sel = 0;
  const draw = () => {
    row.replaceChildren(...list.map((a, i) => {
      const b = el("button", `abil-btn${i === sel ? " active" : ""}`);
      const icon = el("span", "abil-icon");
      icon.append(img(a.img), el("span", "abil-num", String(i + 1)));
      b.append(icon, el("span", "abil-name", a.name));
      b.addEventListener("click", () => { sel = i; draw(); });
      return b;
    }));
    const a = list[sel];
    const head = el("div", "abil-head");
    head.append(el("h3", "abil-title", a.name));
    if (a.cooldown) head.append(el("span", "pill", `Перезарядка ${unit(a.cooldown)}`));
    panel.replaceChildren(head, richText(a.desc, "abil-desc"));
    if (a.tiles && a.tiles.length) {
      const tiles = el("div", "abil-tiles");
      for (const t of a.tiles) {
        const c = el("div", "abil-tile");
        c.append(el("div", "abil-val", unit(t.value)), el("div", "abil-label", t.label));
        tiles.append(c);
      }
      panel.append(tiles);
    }
    const tiers = el("div", "abil-tiers");
    (a.tiers || []).forEach((t, i) => {
      if (!t) return;
      const c = el("div", "abil-tier");
      c.append(el("div", "abil-tier-head", `Улучшение ${i + 1} · ${[1, 2, 5][i]} ${i === 0 ? "очко" : i === 1 ? "очка" : "очков"}`), el("div", "", plainText(t)));
      tiers.append(c);
    });
    if (tiers.children.length) panel.append(tiers);
  };
  draw();
  return { row, panel };
}

function statRank(key, value, lowerIsBetter) {
  if (value == null) return "";
  let better = 0;
  for (const x of heroes) {
    const v = x.stats && x.stats[key];
    if (v == null) continue;
    if (lowerIsBetter ? v < value : v > value) better++;
  }
  return `#${better + 1}`;
}

function statsBlock(h) {
  const s = h.stats || {};
  const wrap = el("div", "stat-cards");
  const card = (title, big, rows) => {
    const c = el("div", "stat-card");
    const head = el("div", "stat-card-head");
    head.append(el("span", "", title), el("span", "stat-card-big", big));
    c.append(head);
    for (const [label, value, key, low] of rows) {
      if (value == null || value === "") continue;
      const r = el("div", "stat-row");
      r.append(el("span", "stat-row-label", label), el("span", "stat-row-val", String(value)), el("span", "stat-row-rank", key ? statRank(key, s[key], low) : ""));
      c.append(r);
    }
    return c;
  };
  const f = (v, d = 1) => (v == null ? null : Number(v).toFixed(d).replace(/\.0+$/, ""));
  wrap.append(
    card("Оружие", s.dps != null ? `${f(s.dps)} DPS` : "", [
      ["Урон пули", f(s.bulletDamage), "bulletDamage"],
      ["Пуль в секунду", f(s.bps, 2), "bps"],
      ["Боезапас", s.ammo, "ammo"],
      ["Перезарядка", s.reload != null ? `${f(s.reload, 2)} с` : null, "reload", true],
      ["Лёгкий удар", f(s.lightMelee), "lightMelee"],
      ["Тяжёлый удар", f(s.heavyMelee), "heavyMelee"],
    ]),
    card("Живучесть", s.health != null ? `${f(s.health)} HP` : "", [
      ["Здоровье", f(s.health), "health"],
      ["Регенерация", s.regen != null ? `${f(s.regen)} /с` : null, "regen"],
      ["Скорость", s.moveSpeed != null ? `${f(s.moveSpeed)} м/с` : null, "moveSpeed"],
      ["Прибавка спринта", s.sprint != null ? `${f(s.sprint)} м/с` : null, "sprint"],
      ["Выносливость", s.stamina, "stamina"],
    ]),
  );
  return wrap;
}

const blobCache = new Map();
const treeCache = new Map();

const glbInfoCache = new Map();

function glbInfo(bytes) {
  const size = `${Math.round(bytes.byteLength / 1024)} КБ`;
  if (bytes.byteLength < 24) return { ok: false, text: `файл слишком мал (${bytes.byteLength} Б)` };
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) {
    const head = new TextDecoder().decode(bytes.subarray(0, 40)).replace(/\s+/g, " ");
    return { ok: false, text: `это не GLB (${size}), начало: "${head}"` };
  }
  try {
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + dv.getUint32(12, true))));
    const ext = (json.extensionsUsed || []).join(", ") || "нет";
    return { ok: true, text: `GLB ${size}; сцен: ${(json.scenes || []).length}, мешей: ${(json.meshes || []).length}, анимаций: ${(json.animations || []).length}; расширения: ${ext}` };
  } catch (e) {
    return { ok: false, text: `GLB ${size}, заголовок не читается` };
  }
}

async function assetBlobUrl(url, type) {
  if (blobCache.has(url)) return blobCache.get(url);
  const res = await window.overlay.asset(url);
  if (!res.ok) throw new Error(res.error);
  const bytes = res.data instanceof Uint8Array ? res.data : new Uint8Array(res.data && res.data.buffer ? res.data.buffer : Object.values(res.data || {}));
  if (type === "model/gltf-binary") {
    const info = glbInfo(bytes);
    glbInfoCache.set(url, info.text);
    if (!info.ok) throw new Error(info.text);
  }
  const blob = URL.createObjectURL(new Blob([bytes], { type }));
  blobCache.set(url, blob);
  return blob;
}

async function assetList(kind) {
  if (!treeCache.has(kind)) {
    treeCache.set(kind, window.overlay.api(`/v1/assets/${kind}`, {}).then((res) => (res.ok ? flattenTree(res.data, "", []) : [])));
  }
  return treeCache.get(kind);
}

function buildStage(h) {
  const box = el("div", "stage-box");
  const stage = el("div", "stage");
  const holder = el("div", "stage-holder");
  const controls = el("div", "stage-controls");
  const picker = el("div", "stage-picker");
  picker.hidden = true;
  const state = { art: h.art, model: h.model };

  const show = (mode) => {
    holder.replaceChildren();
    controls.querySelectorAll("button[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    if (mode === "3d" && state.model) {
      const status = el("div", "stage-status", "Загружаю 3D-модель...");
      const mv = document.createElement("model-viewer");
      mv.className = "mv";
      for (const [k, v] of Object.entries({
        "camera-controls": "", "camera-orbit": "0deg 78deg auto", "field-of-view": "28deg", "shadow-intensity": "0",
        exposure: "1.1", "interaction-prompt": "none", autoplay: "", loading: "eager", alt: h.name,
      })) mv.setAttribute(k, v);
      const fail = (why) => {
        const info = glbInfoCache.get(state.model);
        status.textContent = `Не удалось показать 3D-модель (${why}).${info && !String(why).includes(info) ? ` Файл: ${info}.` : ""} Показываю арт.`;
        status.classList.add("stage-error");
        setTimeout(() => show("art"), 9000);
      };
      mv.addEventListener("load", () => status.remove());
      mv.addEventListener("error", (e) => {
        const src = e.detail && e.detail.sourceError;
        fail(src ? String(src.message || src).replace(/\s+/g, " ").slice(0, 140) : "файл не прочитан");
      });
      holder.append(mv, status);
      assetBlobUrl(state.model, "model/gltf-binary").then((u) => mv.setAttribute("src", u)).catch((e) => fail(e.message));
    } else if (state.art) {
      holder.append(img(state.art, "stage-art"));
    }
  };

  for (const [mode, label] of [["3d", "3D"], ["art", "Арт"]]) {
    if (mode === "3d" && !h.model) continue;
    const b = el("button", "chip", label);
    b.dataset.mode = mode;
    b.addEventListener("click", () => show(mode));
    controls.append(b);
  }
  const more = el("button", "chip", "Варианты");
  more.addEventListener("click", async () => {
    picker.hidden = !picker.hidden;
    more.classList.toggle("active", !picker.hidden);
    if (!picker.hidden && !picker.dataset.ready) {
      picker.dataset.ready = "1";
      picker.replaceChildren(message("Ищу изображения и 3D-позы героя..."));
      const needles = [h.code, (h.en || "").toLowerCase().replace(/[^a-z0-9]+/g, "")].filter((n) => n && n.length > 2);
      const match = (s) => needles.some((n) => `${s.path} ${s.url}`.toLowerCase().includes(n));
      const [images, models] = await Promise.all([assetList("images"), assetList("models")]);
      const imgs = images.filter((s) => /\.(png|webp|jpg|jpeg)(\?|$)/i.test(s.url) && match(s)).slice(0, 80);
      const poses = models.filter((s) => /\.glb(\?|$)/i.test(s.url) && match(s)).slice(0, 40);
      picker.replaceChildren(el("h2", "", `3D-позы (${poses.length})`));
      const poseBox = el("div", "pose-list");
      for (const s of poses) {
        const b = el("button", "chip", s.path.split("/").slice(-2).join("/"));
        b.title = s.path;
        b.addEventListener("click", () => { state.model = s.url; show("3d"); });
        poseBox.append(b);
      }
      if (!poses.length) poseBox.append(message("3D-поз не найдено."));
      picker.append(poseBox, el("h2", "", `Изображения (${imgs.length})`));
      const grid = el("div", "pick-grid");
      for (const s of imgs) {
        const b = el("button", "pick");
        b.title = s.path;
        b.append(img(s.url, "pick-img"), el("span", "pick-path", s.path.split("/").slice(-2).join("/")));
        b.addEventListener("click", () => { state.art = s.url; show("art"); });
        grid.append(b);
      }
      if (!imgs.length) grid.append(message("Изображений не найдено."));
      picker.append(grid);
    }
  });
  controls.append(more);
  stage.append(holder, controls, nameArt(h, "stage-name"));
  box.append(stage, picker);
  show(h.model ? "3d" : "art");
  return box;
}

async function showHeroPage(h) {
  const token = ++renderToken;
  view.replaceChildren();
  const bar = el("div", "hero-head-bar");
  const back = el("button", "link", "← Все герои");
  back.addEventListener("click", () => heroesPage());
  const tabs = el("div", "tabs inline");
  const body = el("div");
  const defs = [["Обзор", () => overview(body)], ["Винрейт и предметы", () => perf(body)]];
  defs.forEach(([label, fn], i) => {
    const b = el("button", i === 0 ? "active" : "", label);
    b.addEventListener("click", () => {
      tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      fn();
    });
    tabs.append(b);
  });
  bar.append(back, tabs);
  view.append(bar, body);

  const stats = await getHeroStats();
  if (token !== renderToken) return;
  const st = stats.map.get(h.id);

  function overview(container) {
    container.replaceChildren();
    const wrap = el("div", "stage-wrap");
    if (h.bg) wrap.append(img(h.bg, "stage-bg"));
    wrap.append(el("div", "stage-shade"));
    const grid = el("div", "hero-stage");

    const left = el("div", "hs-left");
    const row = (label, node) => {
      const r = el("div", "info-row");
      r.append(el("span", "info-label", label), node);
      return r;
    };
    const dots = el("span", "dots");
    for (let i = 1; i <= 3; i++) dots.append(el("i", i <= (h.complexity || 0) ? "on" : ""));
    dots.append(el("span", "", ` ${h.complexity || 0} из 3`));
    const tagBox = el("div", "tags");
    for (const t of h.tags || []) tagBox.append(chip(t));
    left.append(row("Тип", chip(TYPE_RU[h.type] || h.type || "—")), row("Сложность", dots));
    if (h.gun) left.append(row("Оружие", chip(h.gun)));
    left.append(row("Теги", tagBox));
    const nums = el("div", "hs-nums");
    for (const [label, value] of [["Винрейт", st ? `${st.wr}%` : "—"], ["Выбор", st ? `${st.pick}%` : "—"], ["Матчей", st ? num(st.matches) : "—"]]) {
      const c = el("div");
      c.append(el("div", "hs-num", value), el("div", "hs-num-label", label));
      nums.append(c);
    }
    left.append(nums);
    if (h.role) left.append(el("h2", "hero-role", h.role));
    if (h.playstyle) left.append(paragraphs(h.playstyle, "hero-text"));
    if (h.lore) {
      const lore = el("div", "lore-box");
      lore.append(el("h2", "", "История"), paragraphs(h.lore, "hero-text muted"));
      left.append(lore);
    }

    const parts = abilitiesBlock(h);
    const center = el("div", "hs-center");
    center.append(buildStage(h), parts.row);
    const right = el("div", "hs-right");
    right.append(parts.panel);
    grid.append(left, center, right);
    wrap.append(grid);
    container.append(wrap, el("h2", "section-gap", "Характеристики"), statsBlock(h));
  }

  async function perf(container) {
    container.replaceChildren(message("Загружаю..."));
    const res = await window.overlay.api("/v1/analytics/hero-counter-stats", {});
    if (token !== renderToken) return;
    container.replaceChildren();
    const grid = el("div", "dash");
    const phases = [["early_game", "Начало игры"], ["mid_game", "Середина"], ["late_game", "Поздняя игра"]];
    for (const [phase, label] of phases) {
      const card = el("div", "dash-card");
      card.append(el("h2", "", `Предметы: ${label.toLowerCase()}`));
      const list = (h.popular && h.popular[phase]) || [];
      if (!list.length) card.append(message("Нет данных."));
      for (const p of list) {
        const row = itemLine(p.item, `${p.pick}% · ${p.wr}%`);
        if (row) card.append(row);
      }
      grid.append(card);
    }
    container.append(grid);
    if (!res.ok) return container.append(message(res.error, "error"));
    const rows = res.data
      .filter((r) => r.hero_id === h.id && r.matches_played >= 200 && heroById.has(r.enemy_hero_id))
      .map((r) => ({ enemy: heroById.get(r.enemy_hero_id), wr: pct(r.wins, r.matches_played), n: r.matches_played }));
    const duel = el("div", "dash two");
    const col = (title, list) => {
      const card = el("div", "dash-card");
      card.append(el("h2", "", title));
      for (const r of list) {
        const row = el("div", "dash-row");
        row.append(img(r.enemy.small, "dash-img"), el("span", "dash-name", r.enemy.name), el("span", `dash-val ${r.wr >= 50 ? "up" : "down"}`, `${r.wr}%`), el("span", "muted small", `${r.n}`));
        card.append(row);
      }
      if (!list.length) card.append(message("Мало данных."));
      return card;
    };
    duel.append(col("Сильнее всего против", [...rows].sort((a, b) => b.wr - a.wr).slice(0, 6)), col("Слабее всего против", [...rows].sort((a, b) => a.wr - b.wr).slice(0, 6)));
    container.append(el("h2", "section-gap", "Матчапы"), duel);
  }



  overview(body);
}


/* ---------- sounds explorer ---------- */

let soundsPromise = null;
let audio = null;

function flattenTree(node, prefix, out) {
  if (typeof node === "string") {
    if (/^https?:/.test(node)) out.push({ path: prefix, url: node });
    return out;
  }
  if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) flattenTree(v, prefix ? `${prefix}/${k}` : k, out);
  return out;
}

function getSounds() {
  if (!soundsPromise) {
    soundsPromise = window.overlay.api("/v1/assets/sounds", {}).then((res) => {
      if (!res.ok) {
        soundsPromise = null;
        return { error: res.error, list: [] };
      }
      return { list: flattenTree(res.data, "", []) };
    });
  }
  return soundsPromise;
}

async function soundsPage() {
  const token = ++renderToken;
  view.replaceChildren(el("h1", "", "Звуки"), message("Загружаю список звуков..."));
  const data = await getSounds();
  if (token !== renderToken) return;
  view.replaceChildren(el("h1", "", "Звуки"));
  if (data.error) return view.append(message(data.error, "error"));
  view.append(el("p", "muted", `Всего файлов: ${num(data.list.length)}. Введи часть названия (например, имя героя) и нажми на звук, чтобы прослушать.`));
  const input = el("input");
  input.type = "text";
  input.placeholder = "Поиск по названию, например abrams";
  input.className = "mini-search wide";
  const results = el("div", "results sounds");
  view.append(input, results);
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    results.replaceChildren();
    if (!q) return results.append(message("Начни вводить название."));
    const hits = data.list.filter((s) => s.path.toLowerCase().includes(q)).slice(0, 120);
    if (!hits.length) return results.append(message("Ничего не найдено."));
    for (const s of hits) {
      const row = el("button", "result-row");
      row.append(el("span", "sound-play", "▶"), el("span", "pname sound-path", s.path));
      row.addEventListener("click", () => {
        if (audio) audio.pause();
        audio = new Audio(s.url);
        audio.volume = 0.6;
        audio.play().catch(() => row.querySelector(".sound-path").append(" (не удалось воспроизвести)"));
      });
      results.append(row);
    }
  };
  input.addEventListener("input", draw);
  draw();
  input.focus();
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
  await applyNames();
  go("home");
})();
