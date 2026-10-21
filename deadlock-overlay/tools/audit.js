// Usage: npx electron tools/audit.js <url> [<url> ...]
// Loads each page in a hidden Electron window and writes audit-out/<host>-<n>.json (+ .png).
const { app, BrowserWindow, session } = require("electron");
const fs = require("fs");
const path = require("path");

const urls = process.argv.slice(2).filter((a) => /^https?:\/\//.test(a));
const collectSrc = fs.readFileSync(path.join(__dirname, "audit-collector.js"), "utf8");
const outDir = path.join(process.cwd(), "audit-out");

const STACK = [
  [/_next\//, "Next.js"], [/_nuxt\//, "Nuxt"], [/astro/i, "Astro"], [/gatsby/i, "Gatsby"], [/remix/i, "Remix"],
  [/googletagmanager\.com/, "Google Tag Manager"], [/google-analytics\.com|gtag\/js/, "Google Analytics"],
  [/plausible\.io/, "Plausible"], [/umami/, "Umami"], [/posthog/, "PostHog"], [/hotjar/, "Hotjar"],
  [/sentry/, "Sentry"], [/cloudflareinsights/, "Cloudflare Web Analytics"], [/vercel-scripts|_vercel/, "Vercel Analytics"],
  [/fonts\.googleapis|fonts\.gstatic/, "Google Fonts"], [/cdn\.jsdelivr|unpkg|cdnjs/, "Public CDN libraries"],
  [/stripe\.com/, "Stripe"], [/paddle/, "Paddle"], [/discord/, "Discord"], [/patreon/, "Patreon"], [/twitch/, "Twitch"],
  [/steamstatic|steamcommunity/, "Steam"], [/adsbygoogle|doubleclick|googlesyndication/, "Google Ads"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function audit(url, index) {
  const requests = [];
  let mainHeaders = {};
  const ses = session.fromPartition(`audit-${index}`);
  ses.webRequest.onHeadersReceived((d, cb) => {
    const h = d.responseHeaders || {};
    if (d.resourceType === "mainFrame" && d.url.split("#")[0] === url.split("#")[0]) mainHeaders = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v.join(", ")]));
    requests.push({ url: d.url, status: d.statusCode, type: d.resourceType, bytes: Number((h["content-length"] || h["Content-Length"] || [0])[0]) || 0 });
    cb({ responseHeaders: h });
  });
  const win = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { session: ses, backgroundThrottling: false, offscreen: false } });
  const t0 = Date.now();
  try {
    await win.loadURL(url);
  } catch (e) {
    console.log(`Load error for ${url}: ${e.message}`);
  }
  const wallMs = Date.now() - t0;
  await sleep(4000);
  await win.webContents.executeJavaScript("(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<h;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,250));}scrollTo(0,0);})()");
  await sleep(1500);
  const data = await win.webContents.executeJavaScript(`${collectSrc.split("if (typeof module")[0]}\ncollect()`);
  const hosts = {};
  for (const r of requests) {
    try {
      const h = new URL(r.url).host;
      hosts[h] = hosts[h] || { requests: 0, kb: 0 };
      hosts[h].requests++;
      hosts[h].kb += Math.round(r.bytes / 1024);
    } catch {}
  }
  const allUrls = [...data.scripts.map((s) => s.src || ""), ...data.styles, ...requests.map((r) => r.url)].join("\n");
  const stack = [...new Set(STACK.filter(([re]) => re.test(allUrls)).map(([, n]) => n))];
  const g = data.globals;
  for (const [k, n] of [["next", "Next.js"], ["nuxt", "Nuxt"], ["react", "React"], ["vue", "Vue"], ["svelte", "Svelte"], ["angular", "Angular"], ["astro", "Astro"], ["jquery", "jQuery"], ["gtag", "Google Analytics/dataLayer"], ["posthog", "PostHog"], ["sentry", "Sentry"], ["tailwindHint", "Tailwind-like utility classes"]]) if (g[k] && !stack.includes(n)) stack.push(n);
  const serverHints = Object.fromEntries(["server", "x-powered-by", "via", "cf-ray", "x-vercel-id", "x-nf-request-id", "cache-control", "content-encoding", "strict-transport-security", "content-security-policy"].filter((k) => mainHeaders[k]).map((k) => [k, String(mainHeaders[k]).slice(0, 160)]));

  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `${new URL(url).hostname}-${index + 1}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ auditedAt: new Date().toISOString(), requestedUrl: url, wallLoadMs: wallMs, stack, serverHints, requestHosts: hosts, requestCount: requests.length, ...data }, null, 1));
  try {
    const bounds = await win.webContents.executeJavaScript("({w:document.documentElement.scrollWidth,h:Math.min(document.documentElement.scrollHeight,6000)})");
    win.setContentSize(bounds.w, bounds.h);
    await sleep(800);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(`${base}.png`, img.toPNG());
  } catch {}
  win.destroy();
  console.log(`OK ${url}\n  -> ${base}.json  (stack: ${stack.join(", ") || "none detected"})`);
}

app.whenReady().then(async () => {
  if (!urls.length) {
    console.log("Usage: npx electron tools/audit.js <url> [<url> ...]");
    return app.quit();
  }
  for (let i = 0; i < urls.length; i++) await audit(urls[i], i);
  console.log(`\nDone. Files are in: ${outDir}`);
  app.quit();
});
