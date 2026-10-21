const BASE = "https://api.deadlock-api.com";
const ALLOWED = [
  /^\/v1\/analytics\/item-stats$/,
  /^\/v1\/analytics\/hero-stats$/,
  /^\/v1\/analytics\/hero-counter-stats$/,
  /^\/v1\/assets\/(heroes|items)$/,
  /^\/v1\/matches\/active$/,
  /^\/v1\/leaderboard\/(Europe|Asia|NAmerica|SAmerica|Oceania)$/,
  /^\/v1\/players\/steam-search$/,
  /^\/v1\/players\/hero-stats$/,
  /^\/v1\/players\/\d{1,10}\/match-history$/,
];
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

async function call(endpoint, params = {}) {
  if (!ALLOWED.some((re) => re.test(endpoint))) throw new Error(`Endpoint not allowed: ${endpoint}`);
  const url = new URL(BASE + endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const key = url.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const res = await fetch(key, { signal: AbortSignal.timeout(25000), headers: { accept: "application/json" } });
  if (res.status === 503) {
    const wait = res.headers.get("retry-after");
    throw new Error(`Сервер данных занят, повтори через ${wait || "несколько"} сек.`);
  }
  if (!res.ok) throw new Error(`Ошибка API ${res.status}`);
  const data = await res.json();
  cache.set(key, { at: Date.now(), data });
  return data;
}

module.exports = { call };
