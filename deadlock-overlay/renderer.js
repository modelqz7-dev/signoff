const { heroes, items } = window.DATA;
for (const h of heroes) h.en = h.name;

async function applyNames() {
  const names = await window.overlay.getNames();
  if (!names) return;
  for (const h of heroes) if (names.heroes[h.id]) h.name = names.heroes[h.id];
  for (const it of Object.values(items)) if (names.items[it.id]) it.name = names.items[it.id];
  heroes.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
const rules = window.RULES || {};

const $ = (id) => document.getElementById(id);
const search = $("search");
const grid = $("grid");
const detail = $("detail");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function itemRow(key, why, extra) {
  const item = items[key];
  if (!item) return null;
  const row = el("div", "item " + (item.slot || ""));
  const img = el("img", "item-img");
  img.src = item.img;
  img.alt = "";
  const body = el("div", "item-body");
  const top = el("div", "item-top");
  top.append(el("span", "item-name", item.name), el("span", "item-cost", `${item.cost} · T${item.tier}`));
  body.append(top);
  if (why) body.append(el("div", "item-why", why));
  if (extra) body.append(el("div", "item-extra", extra));
  row.append(img, body);
  return row;
}

const itemByApiId = new Map(Object.entries(items).map(([key, it]) => [it.id, key]));
const heroStats = new Map();
let baseline = null;
let liveToken = 0;

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

async function loadHeroStats() {
  const res = await window.overlay.api("/v1/analytics/hero-stats", {});
  if (!res.ok) return;
  const by = sumBy(res.data, "hero_id");
  let total = 0;
  for (const v of by.values()) total += v.matches;
  for (const [id, v] of by) {
    if (v.matches < 100) continue;
    heroStats.set(id, {
      wr: Math.round((v.wins / v.matches) * 1000) / 10,
      pick: Math.round((v.matches / total) * 1000) / 10,
    });
  }
  renderGrid(search.value);
}

async function loadLive(h) {
  const box = $("live");
  const token = ++liveToken;
  box.replaceChildren(el("h3", "", "По данным игроков, 30 дней"), el("p", "empty", "Загружаю..."));
  const [base, vs] = await Promise.all([
    baseline ? { ok: true, data: baseline } : window.overlay.api("/v1/analytics/item-stats", {}),
    window.overlay.api("/v1/analytics/item-stats", { enemy_hero_ids: h.id, min_matches: 100 }),
  ]);
  if (token !== liveToken) return;
  box.replaceChildren(el("h3", "", "По данным игроков, 30 дней"));
  if (!base.ok || !vs.ok) {
    box.append(el("p", "empty", (base.ok ? vs.error : base.error) || "Данные недоступны."));
    return;
  }
  baseline = base.data;
  const baseMap = sumBy(baseline, "item_id");
  const rows = [];
  for (const [apiId, v] of sumBy(vs.data, "item_id")) {
    const key = itemByApiId.get(apiId);
    const b = baseMap.get(apiId);
    if (!key || !b || v.matches < 150 || b.matches < 500) continue;
    const wrVs = (v.wins / v.matches) * 100;
    const wrBase = (b.wins / b.matches) * 100;
    rows.push({ key, lift: wrVs - wrBase, wrVs, matches: v.matches });
  }
  rows.sort((a, b) => b.lift - a.lift);
  if (!rows.length) {
    box.append(el("p", "empty", "Мало данных по этому герою."));
    return;
  }
  const line = (r) => `винрейт ${r.wrVs.toFixed(1)}% (${r.lift >= 0 ? "+" : ""}${r.lift.toFixed(1)} к обычному) · ${r.matches} матчей`;
  box.append(el("p", "note", "Что лучше работает против него, чем в среднем:"));
  for (const r of rows.slice(0, 8)) box.append(itemRow(r.key, null, line(r)));
  const worst = rows.slice(-3).reverse();
  box.append(el("p", "note", "Что работает хуже:"));
  for (const r of worst) box.append(itemRow(r.key, null, line(r)));
}

function renderGrid(filter) {
  grid.replaceChildren();
  const q = filter.trim().toLowerCase();
  const list = q ? heroes.filter((h) => `${h.name} ${h.en}`.toLowerCase().includes(q)) : heroes;
  for (const h of list) {
    const btn = el("button", "hero-btn");
    btn.title = h.name;
    const img = el("img");
    img.src = h.small || h.icon;
    img.alt = h.name;
    btn.append(img, el("span", "", h.name));
    const st = heroStats.get(h.id);
    if (st) {
      btn.title = `${h.name}: винрейт ${st.wr}% · пикрейт ${st.pick}%`;
      btn.append(el("span", "wr " + (st.wr >= 50 ? "up" : "down"), `${st.wr}%`));
    }
    btn.addEventListener("click", () => showHero(h));
    grid.append(btn);
  }
  return list;
}

function showAgainst(h) {
  const box = $("against");
  box.replaceChildren();
  const r = rules[h.en];
  if (!r) {
    box.append(el("p", "empty", "Для этого героя правил пока нет. Добавь их в data/rules.js."));
    return;
  }
  if (r.note) box.append(el("p", "note", r.note));
  for (const entry of r.items) {
    const row = itemRow(entry.item, entry.why);
    if (row) box.append(row);
  }
  if (r.draft) box.append(el("p", "draft", "Черновик: проверь советы в игре и поправь в data/rules.js."));
}

function showOwn(h) {
  const box = $("own");
  box.replaceChildren();
  const phases = [["early_game", "Начало"], ["mid_game", "Середина"], ["late_game", "Поздняя игра"]];
  for (const [phase, label] of phases) {
    box.append(el("h3", "", label));
    const list = h.popular[phase] || [];
    if (!list.length) box.append(el("p", "empty", "Нет данных."));
    for (const p of list) {
      const row = itemRow(p.item, null, `выбирают ${p.pick}% · винрейт ${p.wr}%`);
      if (row) box.append(row);
    }
  }
}

function setTab(own) {
  $("against").hidden = own;
  $("live").hidden = own;
  $("own").hidden = !own;
  $("tabAgainst").classList.toggle("active", !own);
  $("tabOwn").classList.toggle("active", own);
}

function showHero(h) {
  detail.hidden = false;
  $("heroImg").src = h.icon || h.small;
  $("heroName").textContent = h.name;
  $("heroMeta").textContent = [h.type, h.gun, (h.tags || []).join(", ")].filter(Boolean).join(" · ");
  showAgainst(h);
  showOwn(h);
  setTab(false);
  loadLive(h);
}

search.addEventListener("input", () => renderGrid(search.value));
search.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const list = renderGrid(search.value);
    if (list.length) showHero(list[0]);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.overlay.hide();
});
$("tabAgainst").addEventListener("click", () => setTab(false));
$("tabOwn").addEventListener("click", () => setTab(true));
$("quit").addEventListener("click", () => window.overlay.hide());

window.overlay.onFocusSearch(() => {
  search.focus();
  search.select();
});

(async () => {
  await applyNames();
  renderGrid("");
  loadHeroStats();
})();
