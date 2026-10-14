"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { PrinterIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { appointmentEnd, docNumber, money, statusLabel, type CrmBooking, type CrmClient } from "@/lib/crm"
import { nicheConfig } from "@/lib/niches"
import { can } from "@/lib/plans"
import { cleanPage, type PageData } from "@/lib/page"
import { useT } from "@/lib/i18n"

type Shop = { id: string; name: string; niche: string | null; logo_url: string | null; plan: string; trial_ends_at: string | null }
type Doc = "invoice" | "receipt"

/**
 * An invoice (what's to pay) or a receipt (what was paid) for one booking or order, laid out
 * like a sheet of paper: printed or saved as PDF from the browser. Only the shop's owner opens it.
 */
export default function ReceiptPage() {
  return <Suspense><Receipt /></Suspense>
}

function Receipt() {
  const { id } = useParams<{ id: string }>()
  const doc: Doc = useSearchParams().get("doc") === "invoice" ? "invoice" : "receipt"
  const router = useRouter()
  const { t, locale } = useT()
  const [state, setState] = useState<{ booking: CrmBooking; client: CrmClient | null; shop: Shop; page: PageData | null } | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: booking } = await supabase.from("crm_bookings").select("*").eq("id", id).maybeSingle()
      if (!booking) { setMissing(true); return }
      const b = booking as CrmBooking
      const [{ data: shop }, { data: client }, { data: page }] = await Promise.all([
        supabase.from("shops").select("id, name, niche, logo_url, plan, trial_ends_at").eq("id", b.shop_id).maybeSingle(),
        b.client_id ? supabase.from("crm_clients").select("*").eq("id", b.client_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("shop_pages").select("data").eq("shop_id", b.shop_id).maybeSingle(),
      ])
      if (!shop) { setMissing(true); return }
      setState({ booking: b, client: (client as CrmClient | null) ?? null, shop: shop as Shop, page: page ? cleanPage(page.data, (shop as Shop).name) : null })
    }
    load()
  }, [id, router])

  if (missing) return <p className="p-10 text-center text-sm text-muted-foreground">{t("This booking isn't there any more.")}</p>
  if (!state) return <p className="p-10 text-center text-sm text-muted-foreground">{t("Loading...")}</p>

  const { booking: b, client, shop, page } = state
  // invoices and receipts come with the Master plan
  if (!can(shop, "documents")) return <p className="p-10 text-center text-sm text-muted-foreground">{t("Invoices and receipts come with the Master plan.")}</p>
  const config = nicheConfig(shop.niche)
  const isOrder = b.kind === "order"
  const total = b.price ?? 0
  const prepaid = b.prepaid ?? 0
  const finished = b.status === "done" || b.status === "delivered"
  // a receipt shows what was paid: everything once it's done or handed over, otherwise the prepayment
  const paid = finished ? total : prepaid
  const due = Math.max(0, total - prepaid)
  const date = (iso: string, withTime = true) => new Date(iso).toLocaleString(locale, { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) })
  const when = isOrder
    ? `${new Date(`${b.due_on}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}${b.due_time ? `, ${b.due_time}` : ""}`
    : b.starts_at ? `${date(b.starts_at)}–${appointmentEnd(b).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}` : ""
  const details = isOrder
    ? (config?.orderFields ?? []).filter((f) => b.details[f.key]).map((f) => `${t(f.label)}: ${f.type === "choice" ? t(b.details[f.key]) : b.details[f.key]}`)
    : [b.staff ? `${t("Master")}: ${b.staff}` : ""].filter(Boolean)
  const logo = page?.avatar_url || shop.logo_url
  const contacts = [page?.business.address, page?.contacts.phone, page?.contacts.instagram, page?.contacts.email].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#f2f2f4] py-8 text-[#1d1d1f] print:bg-white print:py-0">
      {/* the bar above the sheet; not printed */}
      <div className="mx-auto mb-4 flex max-w-[720px] items-center justify-between gap-3 px-4 print:hidden">
        <div className="flex gap-1 rounded-full bg-black/[0.06] p-1 text-[13.5px]">
          {(["invoice", "receipt"] as Doc[]).map((d) => (
            <a key={d} href={`?doc=${d}`} className={`rounded-full px-4 py-1.5 font-medium ${doc === d ? "bg-white shadow-sm" : "text-black/55 hover:text-black"}`}>
              {d === "invoice" ? t("Invoice") : t("Receipt")}
            </a>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-full bg-[#1d1d1f] px-5 text-[14px] font-medium text-white hover:opacity-90">
          <PrinterIcon className="size-4" />{t("Print or save as PDF")}
        </button>
      </div>

      <article className="mx-auto max-w-[720px] bg-white px-10 py-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)] sm:rounded-[20px] print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="" className="size-12 rounded-full object-cover" />}
            <div>
              <p className="text-[18px] font-semibold">{page?.title || shop.name}</p>
              {contacts.length > 0 && <p className="mt-0.5 text-[12.5px] text-black/55">{contacts.join(" · ")}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[24px] font-semibold tracking-[-0.02em]">{doc === "invoice" ? t("Invoice") : t("Receipt")}</p>
            <p className="text-[13px] text-black/55">№ {docNumber(b.id)}</p>
            <p className="text-[13px] text-black/55">{date(new Date().toISOString(), false)}</p>
          </div>
        </header>

        <section className="mt-10 grid grid-cols-2 gap-6 text-[13.5px]">
          <div>
            <p className="text-[11.5px] font-medium tracking-wide text-black/45 uppercase">{t("Client")}</p>
            <p className="mt-1 font-medium">{client?.name || t("No name")}</p>
            {client?.phone && <p className="text-black/60">{client.phone}</p>}
          </div>
          <div>
            <p className="text-[11.5px] font-medium tracking-wide text-black/45 uppercase">{isOrder ? t("Ready by") : t("Visit")}</p>
            <p className="mt-1 font-medium">{when}</p>
            <p className="text-black/60">{t(statusLabel(b.status))}</p>
          </div>
        </section>

        <table className="mt-10 w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-black/10 text-left text-[11.5px] tracking-wide text-black/45 uppercase">
              <th className="pb-2 font-medium">{isOrder ? t("Product") : t("Service")}</th>
              <th className="w-16 pb-2 text-right font-medium">{t("Qty")}</th>
              <th className="w-32 pb-2 text-right font-medium">{t("Price")}</th>
              <th className="w-32 pb-2 text-right font-medium">{t("Sum")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black/10 align-top">
              <td className="py-3">
                <p className="font-medium">{b.title}</p>
                {details.map((d) => <p key={d} className="text-[12.5px] text-black/55">{d}</p>)}
              </td>
              <td className="py-3 text-right tabular-nums">1</td>
              <td className="py-3 text-right tabular-nums">{money(total, locale)}</td>
              <td className="py-3 text-right tabular-nums">{money(total, locale)}</td>
            </tr>
          </tbody>
        </table>

        <dl className="mt-6 ml-auto flex w-72 flex-col gap-1.5 text-[13.5px]">
          <div className="flex justify-between"><dt className="text-black/55">{t("Total")}</dt><dd className="tabular-nums">{money(total, locale)}</dd></div>
          {doc === "invoice" ? (
            <>
              {prepaid > 0 && <div className="flex justify-between"><dt className="text-black/55">{t("Prepaid")}</dt><dd className="tabular-nums">−{money(prepaid, locale)}</dd></div>}
              <div className="mt-1 flex justify-between border-t border-black/10 pt-2 text-[16px] font-semibold"><dt>{t("To pay")}</dt><dd className="tabular-nums">{money(due, locale)}</dd></div>
            </>
          ) : (
            <>
              <div className="mt-1 flex justify-between border-t border-black/10 pt-2 text-[16px] font-semibold"><dt>{t("Paid")}</dt><dd className="tabular-nums">{money(paid, locale)}</dd></div>
              {paid < total && <div className="flex justify-between"><dt className="text-black/55">{t("Left to pay")}</dt><dd className="tabular-nums">{money(total - paid, locale)}</dd></div>}
            </>
          )}
        </dl>

        <footer className="mt-14 border-t border-black/10 pt-4 text-[11.5px] text-black/45">
          {doc === "receipt" ? t("Thank you! This document is not a fiscal receipt.") : t("This invoice is not a fiscal receipt.")}
        </footer>
      </article>
    </div>
  )
}
