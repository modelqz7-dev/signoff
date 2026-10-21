// Runs inside the audited page. Returns plain JSON: meta, scripts, perf, layout.
function collect() {
  const cut = (s, n) => (s || "").toString().replace(/\s+/g, " ").trim().slice(0, n);
  const attr = (el, n) => el.getAttribute(n);

  const metas = [...document.querySelectorAll("meta")].map((m) => ({
    name: attr(m, "name") || attr(m, "property") || attr(m, "http-equiv") || attr(m, "charset"),
    content: cut(attr(m, "content"), 300),
  })).filter((m) => m.name);
  const links = [...document.querySelectorAll("link[rel]")].map((l) => ({ rel: attr(l, "rel"), href: attr(l, "href"), as: attr(l, "as") }));
  const scripts = [...document.scripts].map((s) => ({ src: s.src || null, type: s.type || null, inline: !s.src ? cut(s.textContent, 160) : undefined }));
  const styles = [...document.styleSheets].map((s) => s.href).filter(Boolean);
  const fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`);

  const w = window;
  const globals = {
    next: !!w.__NEXT_DATA__ || !!document.getElementById("__next"),
    nuxt: !!w.__NUXT__ || !!w.$nuxt,
    react: !![...document.querySelectorAll("*")].slice(0, 400).find((e) => Object.keys(e).some((k) => k.startsWith("__reactContainer") || k.startsWith("__reactFiber"))),
    vue: !!w.__VUE__ || !!document.querySelector("[data-v-app]") || !![...document.querySelectorAll("*")].slice(0, 400).find((e) => e.__vue_app__),
    svelte: !!document.querySelector('[class*="svelte-"]'),
    angular: !!document.querySelector("[ng-version]"),
    astro: !!document.querySelector("astro-island"),
    jquery: !!w.jQuery,
    gtag: !!w.gtag || !!w.dataLayer,
    posthog: !!w.posthog,
    sentry: !!w.__SENTRY__,
    tailwindHint: !![...document.querySelectorAll("[class]")].slice(0, 300).find((e) => /\b(flex|grid|px-\d|py-\d|text-(sm|xs|lg)|bg-\w+-\d{2,3})\b/.test(e.className.toString())),
  };

  const nav = performance.getEntriesByType("navigation")[0];
  const paints = Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]));
  const res = performance.getEntriesByType("resource");
  const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
  const cls = performance.getEntriesByType("layout-shift").filter((e) => !e.hadRecentInput).reduce((a, e) => a + e.value, 0);
  const byType = {};
  for (const r of res) {
    const t = r.initiatorType || "other";
    byType[t] = byType[t] || { count: 0, transferKB: 0 };
    byType[t].count++;
    byType[t].transferKB += Math.round((r.transferSize || 0) / 1024);
  }
  const heaviest = [...res].sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 10).map((r) => ({ url: r.name, kb: Math.round((r.transferSize || 0) / 1024), ms: Math.round(r.duration) }));
  const perf = nav ? {
    ttfbMs: Math.round(nav.responseStart),
    domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
    loadMs: Math.round(nav.loadEventEnd),
    transferKB: Math.round((nav.transferSize || 0) / 1024),
    fcpMs: paints["first-contentful-paint"],
    lcpMs: lcpEntries.length ? Math.round(lcpEntries[lcpEntries.length - 1].startTime) : null,
    lcpElement: lcpEntries.length ? cut((lcpEntries[lcpEntries.length - 1].element || {}).outerHTML, 160) : null,
    cls: Math.round(cls * 1000) / 1000,
    requests: res.length,
    byType,
    heaviest,
  } : null;

  const headings = [...document.querySelectorAll("h1,h2,h3")].slice(0, 60).map((h) => ({ tag: h.tagName, text: cut(h.textContent, 90) }));
  const navLinks = [...document.querySelectorAll("nav a, aside a, header a")].slice(0, 60).map((a) => ({ text: cut(a.textContent || attr(a, "aria-label") || attr(a, "title"), 40), href: attr(a, "href") }));

  // Layout tree: visible blocks with exact boxes and key styles.
  const nodes = [];
  const MAX = 700;
  const walk = (el, depth) => {
    if (nodes.length >= MAX || depth > 7) return;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 14) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
    const entry = {
      d: depth, tag: el.tagName.toLowerCase(),
      id: el.id || undefined, cls: cut(el.className && el.className.toString(), 70) || undefined,
      text: cut([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" "), 50) || undefined,
      x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height),
      display: cs.display, position: cs.position === "static" ? undefined : cs.position,
      grid: cs.display.includes("grid") ? cs.gridTemplateColumns : undefined,
      flexDir: cs.display.includes("flex") ? cs.flexDirection : undefined,
      gap: cs.gap !== "normal" ? cs.gap : undefined,
      pad: cs.padding !== "0px" ? cs.padding : undefined,
      radius: cs.borderRadius !== "0px" ? cs.borderRadius : undefined,
      bg: cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? cs.backgroundColor : undefined,
      bgImage: cs.backgroundImage !== "none" ? cut(cs.backgroundImage, 90) : undefined,
      border: cs.borderTopWidth !== "0px" ? `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}` : undefined,
      shadow: cs.boxShadow !== "none" ? cut(cs.boxShadow, 80) : undefined,
      font: cs.fontFamily.split(",")[0].replace(/["']/g, ""), size: cs.fontSize, weight: cs.fontWeight, color: cs.color,
      letterSpacing: cs.letterSpacing !== "normal" ? cs.letterSpacing : undefined,
      transform: cs.textTransform !== "none" ? cs.textTransform : undefined,
    };
    nodes.push(entry);
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(document.body, 0);

  const root = getComputedStyle(document.documentElement);
  const cssVars = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ":root" || rule.selectorText === "html") {
          for (const name of rule.style) if (name.startsWith("--")) cssVars.push([name, cut(rule.style.getPropertyValue(name), 60)]);
        }
      }
    } catch {}
  }

  return {
    url: location.href, title: document.title, lang: document.documentElement.lang,
    viewport: { w: innerWidth, h: innerHeight, pageH: document.documentElement.scrollHeight },
    metas, links, scripts, styles, fonts, globals, perf, headings, navLinks,
    rootFont: root.fontFamily, cssVars: cssVars.slice(0, 120), layout: nodes,
  };
}
if (typeof module !== "undefined") module.exports = { collect };
