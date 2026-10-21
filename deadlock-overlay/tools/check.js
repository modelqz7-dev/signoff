// Проверка данных: каждый предмет в rules.js должен существовать в data.js.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["data/data.js", "data/rules.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), sandbox);
}
const { heroes, items } = sandbox.window.DATA;
const rules = sandbox.window.RULES;
const names = new Set(heroes.map((h) => h.name));
let errors = 0;
for (const [hero, r] of Object.entries(rules)) {
  if (!names.has(hero)) { console.error(`Нет героя в данных: ${hero}`); errors++; }
  for (const { item } of r.items) {
    if (!items[item]) { console.error(`${hero}: нет предмета ${item}`); errors++; }
  }
}
console.log(`heroes=${heroes.length} items=${Object.keys(items).length} rules=${Object.keys(rules).length} errors=${errors}`);
process.exit(errors ? 1 : 0);
