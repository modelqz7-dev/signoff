const { heroes, items } = window.DATA;
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

function renderGrid(filter) {
  grid.replaceChildren();
  const q = filter.trim().toLowerCase();
  const list = q ? heroes.filter((h) => h.name.toLowerCase().includes(q)) : heroes;
  for (const h of list) {
    const btn = el("button", "hero-btn");
    btn.title = h.name;
    const img = el("img");
    img.src = h.small || h.icon;
    img.alt = h.name;
    btn.append(img, el("span", "", h.name));
    btn.addEventListener("click", () => showHero(h));
    grid.append(btn);
  }
  return list;
}

function showAgainst(h) {
  const box = $("against");
  box.replaceChildren();
  const r = rules[h.name];
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
$("quit").addEventListener("click", () => window.overlay.quit());

window.overlay.onFocusSearch(() => {
  search.focus();
  search.select();
});

renderGrid("");
