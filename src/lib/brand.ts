// The workshop's details for the client portal: its welcome message and contacts.
// Shared by the server (portal API) and the browser, so no "use client" here.

export type PortalContacts = {
  phone?: string
  telegram?: string
  instagram?: string
  website?: string
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
