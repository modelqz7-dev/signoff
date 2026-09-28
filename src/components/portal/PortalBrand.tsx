"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogoMark } from "@/components/Logo"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type PortalBrand = { shopName: string; logoUrl: string | null; badge: boolean }

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

/** "Made with Nodly" link in the corner of portals on the Free plan. */
export function MadeWithNodly({ brand, inline }: { brand: PortalBrand | null; inline?: boolean }) {
  const { t } = useT()
  if (!brand?.badge) return null
  return (
    <Link
      href="/?ref=portal"
      target="_blank"
      className={cn(inline ? "mx-auto" : "fixed right-4 bottom-4 z-40", "flex w-fit items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:text-foreground")}
    >
      {t("Made with")}
      <LogoMark className="size-3.5" />
      <span className="font-medium text-foreground">Nodly</span>
    </Link>
  )
}
