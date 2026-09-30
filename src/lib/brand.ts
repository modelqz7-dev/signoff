// The workshop's brand kit for the client portal: one colour in, a readable palette out.
// Shared by the server (portal API) and the browser, so no "use client" here.

export type PortalTheme = "dark" | "light"

export type PortalContacts = {
  phone?: string
  telegram?: string
  instagram?: string
  website?: string
}

/** Colours offered in settings; any other hex works too. */
export const BRAND_PRESETS = [
  "#1f1e1d", "#2f5d8a", "#1e6b52", "#3a7a4a", "#8a5a2b",
  "#b4532a", "#a8323e", "#6b3fa0", "#b08a2e", "#4a5560",
]

const LIGHT_BG = "#f6f5f3"
const DARK_BG = "#171615"
const DARK_TEXT = "#171615"

export function normalizeHex(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().replace(/^#?/, "#").toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(v)) return "#" + [...v.slice(1)].map((c) => c + c).join("")
  return /^#[0-9a-f]{6}$/.test(v) ? v : null
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: number[]) {
  return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")
}

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function mix(hex: string, target: string, amount: number) {
  const a = rgb(hex), b = rgb(target)
  return toHex(a.map((c, i) => c + (b[i] - c) * amount))
}

/** Nudges a colour towards black or white until it reaches the given contrast. */
function reach(hex: string, against: string, min: number, towards: string) {
  let c = hex
  for (let i = 0; i < 20 && contrast(c, against) < min; i++) c = mix(c, towards, 0.08)
  return c
}

/** Text on top of the colour: white or near-black, whichever reads better. */
function onColor(hex: string) {
  return contrast("#ffffff", hex) >= contrast(DARK_TEXT, hex) ? "#ffffff" : DARK_TEXT
}

export type BrandPalette = {
  light: Record<string, string>
  dark: Record<string, string>
  /** The colour had to be darkened for the light theme to stay readable (dark theme tweaks are routine). */
  adjusted: boolean
}

/**
 * CSS variables for both themes from one brand colour. Buttons, focus rings and
 * accents take the colour (kept at 3:1 against the page); pins keep white numbers readable.
 */
export function brandPalette(color: string | null | undefined): BrandPalette | null {
  const base = normalizeHex(color)
  if (!base) return null
  const light = reach(base, LIGHT_BG, 3, "#000000")
  const dark = reach(base, DARK_BG, 3, "#ffffff")
  const pin = reach(base, "#ffffff", 3, "#000000")
  const vars = (c: string) => ({
    "--primary": c, "--primary-foreground": onColor(c),
    "--accent": c, "--accent-foreground": onColor(c),
    "--ring": c, "--pin": pin,
  })
  return { light: vars(light), dark: vars(dark), adjusted: light !== base }
}

/** The palette as a stylesheet for the page: light on :root, dark under .dark. */
export function brandCss(palette: BrandPalette) {
  const block = (vars: Record<string, string>) => Object.entries(vars).map(([k, v]) => `${k}:${v};`).join("")
  return `:root{${block(palette.light)}}.dark{${block(palette.dark)}}`
}

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** Keeps only known, non-empty contact fields. */
export function cleanContacts(value: unknown): PortalContacts {
  const src = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const out: PortalContacts = {}
  for (const key of ["phone", "telegram", "instagram", "website"] as const) {
    const v = clean(src[key])
    if (v) out[key] = v
  }
  return out
}

/** Links for contact fields; handles "@name", bare names and full URLs. */
export function contactHref(kind: keyof PortalContacts, value: string): string | null {
  const v = value.trim()
  const handle = v.replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, "").replace(/\/+$/, "")
  switch (kind) {
    case "phone": {
      const digits = v.replace(/[^\d+]/g, "")
      return digits.length >= 5 ? `tel:${digits}` : null
    }
    case "telegram":
      return /^[\w]{3,}$/.test(handle) ? `https://t.me/${handle}` : null
    case "instagram":
      return /^[\w.]{1,}$/.test(handle) ? `https://instagram.com/${handle}` : null
    case "website": {
      const url = /^https?:\/\//i.test(v) ? v : `https://${v}`
      try {
        const u = new URL(url)
        return u.hostname.includes(".") ? u.toString() : null
      } catch {
        return null
      }
    }
  }
}
