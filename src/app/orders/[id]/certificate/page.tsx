"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { PrinterIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/Logo"
import { UpgradeChip } from "@/components/plans/PlanBits"
import type { Order, Shop } from "@/components/dashboard/types"
import { pinsOfVersion, type Pin } from "@/lib/pins"
import { can } from "@/lib/plans"
import { fileNameFromUrl } from "@/lib/versions"
import { getOrCreateShop } from "@/lib/shop"
import { useFileUrl } from "@/lib/files"
import { useT } from "@/lib/i18n"

/**
 * Printable proof that the client approved a design: who, when, which version.
 * "Download PDF" uses the browser's print dialog (Save as PDF), which keeps any language's text.
 */
export default function CertificatePage() {
  const router = useRouter()
  const orderId = useParams().id as string
  const { t, locale } = useT()
  const [state, setState] = useState<{ shop: Shop; order: Order; pins: Pin[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const logoSrc = useFileUrl(state?.shop.logo_url)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: shop, error: shopError } = await getOrCreateShop(session.user)
      if (shopError || !shop) throw shopError ?? new Error("Shop not found for this account")
      const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle()
      if (orderError) throw orderError
      if (!order) throw new Error("Order not found")
      const { data: pins } = await supabase.from("order_pins").select("*").eq("order_id", orderId)
      setState({ shop, order: order as Order, pins: (pins as Pin[]) || [] })
    }
    load().catch((e) => setError(e?.message || "Failed to load order"))
  }, [orderId, router])

  if (error) return <Centered><p className="text-sm text-destructive">{t(error)}</p></Centered>
  if (!state) return <Centered><p className="text-sm text-muted-foreground">{t("Loading...")}</p></Centered>

  const { shop, order } = state
  if (!can(shop, "certificate")) {
    return (
      <Centered>
        <p className="text-sm text-foreground">{t("Approval certificates are available on Maker and Studio.")}</p>
        <UpgradeChip feature="certificate" />
        <Link href={`/orders/${order.id}`} className="text-xs text-muted-foreground hover:text-foreground">{t("Back to order")}</Link>
      </Centered>
    )
  }
  if (order.status !== "approved" && order.status !== "prod") {
    return (
      <Centered>
        <p className="text-sm text-foreground">{t("The client hasn't approved this order yet.")}</p>
        <Link href={`/orders/${order.id}`} className="text-xs text-muted-foreground hover:text-foreground">{t("Back to order")}</Link>
      </Centered>
    )
  }

  const versionPins = pinsOfVersion(state.pins, order.version)
  const resolved = versionPins.filter((p) => p.resolved).length
  const approvedAt = order.approved_at
    ? new Date(order.approved_at).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" })
    : "—"
  const rows: [string, string][] = [
    [t("Approved by"), order.approved_by || order.client_name || "—"],
    [t("Approved on"), approvedAt],
    [t("Version"), `v${order.version ?? 1}`],
    [t("File"), fileNameFromUrl(order.file_url) || "—"],
    [t("Client comments on this version"), versionPins.length ? t("{n} ({resolved} resolved)", { n: versionPins.length, resolved }) : "0"],
    [t("Workshop"), shop.name],
    [t("Order code"), order.code],
  ]

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8 print:bg-white print:p-0">
      <style>{"@page { size: A4; margin: 16mm; }"}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between print:hidden">
        <Link href={`/orders/${order.id}`} className="text-sm text-muted-foreground hover:text-foreground">← {t("Back to order")}</Link>
        <Button size="sm" onPress={() => window.print()}>
          <PrinterIcon />
          {t("Download PDF")}
        </Button>
      </div>

      <article className="mx-auto flex max-w-[210mm] flex-col gap-8 rounded-xl bg-white p-12 text-neutral-900 shadow-sm ring-1 ring-black/5 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <img src={logoSrc} alt={shop.name} className="h-10 max-w-[180px] object-contain" />
            ) : (
              <span className="text-lg font-semibold">{shop.name}</span>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <LogoMark surface="light" className="size-5" />
            {t("Verified by Nodly")}
          </span>
        </header>

        <div className="flex flex-col gap-2 border-y border-neutral-200 py-8">
          <p className="text-xs font-medium tracking-[0.2em] text-neutral-500 uppercase">{t("Approval certificate")}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{order.title}</h1>
          <p className="text-sm text-neutral-600">
            {t("The client reviewed this design in the Nodly client portal and approved it.")}
          </p>
        </div>

        <dl className="grid grid-cols-[minmax(0,14rem)_1fr] gap-x-6 gap-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <footer className="mt-auto flex flex-col gap-1 border-t border-neutral-200 pt-6 text-[11px] text-neutral-500">
          <p>{t("Certificate ID")}: <span className="font-mono">{order.id}</span></p>
          <p>{t("Issued on {date}", { date: new Date().toLocaleDateString(locale, { dateStyle: "long" }) })}</p>
        </footer>
      </article>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">{children}</div>
}
