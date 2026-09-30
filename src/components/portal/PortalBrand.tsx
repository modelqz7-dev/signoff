"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogoMark } from "@/components/Logo"
import { AtSignIcon, GlobeIcon, PhoneIcon, SendIcon } from "lucide-react"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { THEME_STORAGE_KEY } from "@/lib/theme-script"
import { brandCss, brandPalette, contactHref, type PortalContacts, type PortalTheme } from "@/lib/brand"

export type PortalBrand = {
  shopName: string
  logoUrl: string | null
  badge: boolean
  /** Brand kit (Pro); empty on other plans. */
  color?: string | null
  theme?: PortalTheme | null
  welcome?: string
  contacts?: PortalContacts
}

/** Workshop name, logo and badge setting for an order's portal (see /api/portal/[id]). */
export function usePortalBrand(orderId: string) {
  const [brand, setBrand] = useState<PortalBrand | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/portal/${orderId}`)
      .then((r) => r.json())
      .then((b: PortalBrand) => { if (!cancelled) setBrand(b) })
      .catch(() => { if (!cancelled) setBrand({ shopName: "", logoUrl: null, badge: true }) })
    return () => { cancelled = true }
  }, [orderId])
  return brand
}

/**
 * Puts the workshop's colour on the portal (buttons, focus rings, pins) and, when the
 * client hasn't picked a theme themselves, opens the portal in the workshop's theme.
 */
export function BrandStyle({ brand }: { brand: PortalBrand | null }) {
  const palette = brandPalette(brand?.color)
  const theme = brand?.theme
  useEffect(() => {
    if (!theme) return
    let saved: string | null = null
    try { saved = localStorage.getItem(THEME_STORAGE_KEY) } catch {}
    if (!saved) document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])
  if (!palette) return null
  return <style>{brandCss(palette)}</style>
}

/** The workshop's greeting on the portal's sign-in screen. */
export function PortalWelcome({ brand, className }: { brand: PortalBrand | null; className?: string }) {
  if (!brand?.welcome) return null
  return <p className={cn("whitespace-pre-line rounded-lg bg-muted/60 px-3 py-2.5 text-left text-sm text-foreground", className)}>{brand.welcome}</p>
}

const CONTACT_ICONS = { phone: PhoneIcon, telegram: SendIcon, instagram: AtSignIcon, website: GlobeIcon }

/** "Questions? Contact the workshop" with their phone and links. */
export function PortalContactCard({ brand, className }: { brand: PortalBrand | null; className?: string }) {
  const { t } = useT()
  const entries = Object.entries(brand?.contacts ?? {}) as [keyof PortalContacts, string][]
  const links = entries.map(([kind, value]) => ({ kind, value, href: contactHref(kind, value) })).filter((l) => l.href)
  if (!links.length) return null
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border/60 p-4", className)}>
      <div>
        <p className="text-sm font-medium text-foreground">{t("Questions about the design?")}</p>
        <p className="text-xs text-muted-foreground">
          {brand?.shopName ? t("Contact {shop} directly:", { shop: brand.shopName }) : t("Contact the workshop directly:")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map(({ kind, value, href }) => {
          const Icon = CONTACT_ICONS[kind]
          return (
            <a
              key={kind}
              href={href!}
              target={kind === "phone" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{value}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

/** The workshop's logo (paid plans) or name, shown at the top of the portal. */
export function BrandMark({ brand, className }: { brand: PortalBrand | null; className?: string }) {
  if (!brand?.logoUrl && !brand?.shopName) return null
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      {brand.logoUrl && (
        <img src={brand.logoUrl} alt={brand.shopName} className="h-7 max-w-[140px] object-contain" />
      )}
      {!brand.logoUrl && brand.shopName && (
        <span className="truncate text-sm font-medium text-foreground">{brand.shopName}</span>
      )}
    </span>
  )
}

/**
 * Nodly's own mark on Free-plan portals, where the client always sees it: at the top of the
 * sign-in card and at the start of the portal's header. Paid plans replace it with the
 * workshop's logo.
 */
export function NodlyMark({ brand, full, className }: { brand: PortalBrand | null; full?: boolean; className?: string }) {
  const { t } = useT()
  if (!brand?.badge) return null
  return (
    <Link
      href="/?ref=portal"
      target="_blank"
      title={t("Client portal by Nodly")}
      className={cn("flex w-fit shrink-0 items-baseline gap-1.5 text-foreground transition-opacity hover:opacity-80", className)}
    >
      <LogoMark className="size-5 self-center" />
      <span className="font-[family-name:var(--font-brand)] text-sm font-bold tracking-tight">Nodly</span>
      {/* Phones keep the room for the order title: just the name there. */}
      <span className={cn("text-[11px] text-muted-foreground", !full && "hidden sm:inline")}>{t("Client portal")}</span>
    </Link>
  )
}

/** Shown to the client after their decision on Free-plan portals: a portal like this, for their own business. */
export function MadeWithNodly({ brand, className }: { brand: PortalBrand | null; className?: string }) {
  const { t } = useT()
  if (!brand?.badge) return null
  return (
    <Link
      href="/?ref=portal-done"
      target="_blank"
      className={cn("flex w-full items-center justify-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground", className)}
    >
      <span>
        {t("Made with")} <span className="font-medium text-foreground">Nodly</span> · {t("Get a portal like this for your business")}
      </span>
    </Link>
  )
}
