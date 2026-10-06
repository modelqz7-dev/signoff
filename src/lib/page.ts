// The workshop's public page (a "link in bio" page): what it holds and how it is checked.
// Shared by the server (public page, request API) and the browser (editor), so no "use client".

export type PageContacts = {
  instagram?: string
  telegram?: string
  viber?: string
  whatsapp?: string
  phone?: string
  email?: string
  website?: string
}

export type PageService = { name: string; price: string }

export type PageTheme = "light" | "dark"

export type PageData = {
  title: string
  tagline: string
  bio: string
  avatar_url: string | null
  banner_url: string | null
  theme: PageTheme
  accent: string
  contacts: PageContacts
  services: PageService[]
  portfolio: string[]
  /** Whether visitors can leave a request from the page. */
  requests: boolean
  cta: string
}

export type ShopPage = { shop_id: string; slug: string; published: boolean; data: PageData; updated_at?: string }

export const CONTACT_KEYS = ["instagram", "telegram", "viber", "whatsapp", "phone", "email", "website"] as const

/** Accent colours offered in the editor; the page only accepts these. */
export const ACCENTS = ["#1f1e1d", "#7a5a3c", "#2f5d50", "#8b3a3a", "#36557f", "#6b4f8a"] as const

export const MAX_SERVICES = 12
export const MAX_PORTFOLIO = 12

/** Addresses taken by the site itself. */
const RESERVED = new Set([
  "admin", "api", "app", "dashboard", "orders", "requests", "link", "login", "signup", "logout", "portal", "p",
  "terms", "privacy", "refund", "help", "support", "settings", "billing", "nodly", "www", "mail", "blog", "about",
  "pricing", "forgot-password", "reset-password", "static", "assets", "_next",
])

export function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_-]/g, "")
}

/** null when the address is fine, otherwise the reason (an i18n key). */
export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return "At least 3 characters"
  if (slug.length > 30) return "At most 30 characters"
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) return "Latin letters, digits, - and _ only"
  if (RESERVED.has(slug)) return "This address is reserved"
  return null
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const url = (v: unknown) => {
  const s = text(v, 600)
  return /^https?:\/\//.test(s) ? s : null
}

/** Keeps only known fields within their limits; used on save and when reading. */
export function cleanPage(value: unknown, fallbackTitle = ""): PageData {
  const src = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const contactsSrc = (src.contacts && typeof src.contacts === "object" ? src.contacts : {}) as Record<string, unknown>
  const contacts: PageContacts = {}
  for (const key of CONTACT_KEYS) {
    const v = text(contactsSrc[key], 120)
    if (v) contacts[key] = v
  }
  const services = (Array.isArray(src.services) ? src.services : [])
    .map((s) => ({ name: text((s as PageService)?.name, 80), price: text((s as PageService)?.price, 40) }))
    .filter((s) => s.name)
    .slice(0, MAX_SERVICES)
  const portfolio = (Array.isArray(src.portfolio) ? src.portfolio : [])
    .map(url).filter((u): u is string => !!u).slice(0, MAX_PORTFOLIO)
  const accent = typeof src.accent === "string" && (ACCENTS as readonly string[]).includes(src.accent) ? src.accent : ACCENTS[0]
  return {
    title: text(src.title, 80) || fallbackTitle,
    tagline: text(src.tagline, 120),
    bio: text(src.bio, 600),
    avatar_url: url(src.avatar_url),
    banner_url: url(src.banner_url),
    theme: src.theme === "dark" ? "dark" : "light",
    accent,
    contacts,
    services,
    portfolio,
    requests: src.requests !== false,
    cta: text(src.cta, 40),
  }
}

/** A fresh page for a workshop that has none yet. */
export function emptyPage(title: string, logoUrl?: string | null): PageData {
  return cleanPage({ title, avatar_url: logoUrl ?? null, requests: true }, title)
}

/** Link for a contact; handles "@name", bare names, numbers and full URLs. */
export function pageContactHref(kind: keyof PageContacts, value: string): string | null {
  const v = value.trim()
  const handle = v.replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, "").replace(/\/+$/, "")
  const digits = v.replace(/[^\d+]/g, "")
  switch (kind) {
    case "instagram": return /^[\w.]+$/.test(handle) ? `https://instagram.com/${handle}` : null
    case "telegram": return /^\w{3,}$/.test(handle) ? `https://t.me/${handle}` : null
    case "whatsapp": return digits.replace(/\D/g, "").length >= 7 ? `https://wa.me/${digits.replace(/\D/g, "")}` : null
    case "viber": return digits.replace(/\D/g, "").length >= 7 ? `viber://chat?number=${encodeURIComponent(digits.startsWith("+") ? digits : `+${digits}`)}` : null
    case "phone": return digits.length >= 5 ? `tel:${digits}` : null
    case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : null
    case "website": {
      try {
        const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
        return u.hostname.includes(".") ? u.toString() : null
      } catch {
        return null
      }
    }
  }
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", є: "ye", ё: "e", ж: "zh", з: "z", и: "i", і: "i", ї: "yi",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
}

/** A page address made from the workshop's name (Cyrillic is spelled in Latin letters). */
export function suggestSlug(name: string) {
  const latin = name.toLowerCase().split("").map((ch) => TRANSLIT[ch] ?? ch).join("")
  return latin.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30)
}

/** The page's public address. */
export function pagePath(slug: string) {
  return `/@${slug}`
}
