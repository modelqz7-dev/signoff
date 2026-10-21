const { heroes, items } = window.DATA;
const heroById = new Map(heroes.map((h) => [h.id, h]));
const itemByApiId = new Map(Object.values(items).map((it) => [it.id, it]));
const SLOT = { weapon: "Оружие", vitality: "Живучесть", spirit: "Дух" };
const OUTCOME = { 1: "win", 2: "loss" };

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

/* ---------- player (matches + stats) ---------- */

async function renderPlayer(container, account) {
  const token = ++renderToken;
  container.replaceChildren();

  const head = el("div", "profile");
  head.append(img(account.avatarfull || account.avatar, "avatar"));
  const info = el("div");
  info.append(el("div", "name", account.personaname || `ID ${account.account_id}`), el("div", "muted small", `ID ${account.account_id}`));
  head.append(info);
  container.append(head, message("Загружаю матчи...", "empty"));

  const res = await window.overlay.api(`/v1/players/${account.account_id}/match-history`, {});
  if (token !== renderToken) return;
  container.lastChild.remove();
  if (!res.ok) return container.append(message(res.error, "error"));
  const list = [...res.data].sort((a, b) => b.start_time - a.start_time);
  if (!list.length) return container.append(message("Матчей не найдено."));

  const scored = list.filter((m) => OUTCOME[m.player_match_outcome]);
  const wins = scored.filter((m) => m.player_match_outcome === 1).length;
  const sum = (f) => scored.reduce((acc, m) => acc + m[f], 0);
  const deaths = Math.max(1, sum("player_deaths"));
  const cards = el("div", "cards");
  for (const [label, value] of [
    ["Матчи", scored.length],
    ["Победы", wins],
    ["Винрейт", `${pct(wins, scored.length)}%`],
    ["KDA", ((sum("player_kills") + sum("player_assists")) / deaths).toFixed(2)],
  ]) {
    const card = el("div", "card");
    card.append(el("div", "label", label), el("div", "value", String(value)));
    cards.append(card);
  }
  container.append(cards, el("p", "muted small", `Статистика по последним ${scored.length} учтённым матчам`));

  container.append(el("h2", "", "Последние матчи"));
  const box = el("div", "matches");
  for (const m of list.slice(0, 20)) {
    const kind = OUTCOME[m.player_match_outcome] || "neutral";
    const hero = heroById.get(m.hero_id);
    const row = el("div", `match ${kind}`);
    row.append(
      el("div", "bar"),
      img(hero && hero.small, ""),
      el("div", "hero", hero ? hero.name : `Герой ${m.hero_id}`),
      el("div", "result", kind === "win" ? "Победа" : kind === "loss" ? "Поражение" : "Не учтён"),
      el("div", "kda", `${m.player_kills} / ${m.player_deaths} / ${m.player_assists}`),
      el("div", "when", `${fmtDuration(m.match_duration_s)} · ${fmtDate(m.start_time)}`),
    );
    box.append(row);
  }
  container.append(box);
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

  meta() {
    view.replaceChildren(el("h1", "", "Мета"));
    const tabs = el("div", "tabs");
    const body = el("div");
    const defs = [["Герои", metaHeroes], ["Предметы", metaItems]];
    defs.forEach(([label, fn], i) => {
      const b = el("button", i === 0 ? "active" : "", label);
      b.addEventListener("click", () => {
        tabs.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        fn(body);
      });
      tabs.append(b);
    });
    view.append(tabs, body);
    metaHeroes(body);
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
