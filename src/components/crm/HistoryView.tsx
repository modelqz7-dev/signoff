"use client"

import { useMemo, useState } from "react"
import { DownloadIcon, FileTextIcon, ReceiptTextIcon, SearchIcon } from "lucide-react"
import { Stat } from "@/components/crm/AppointmentsHome"
import { Picker } from "@/components/crm/Pickers"
import { docNumber, money, statusLabel, type CrmBooking, type CrmData } from "@/lib/crm"
import type { NicheConfig } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Period = "month" | "last" | "year" | "all"
type Show = "all" | "active" | "finished" | "cancelled"

const CANCELLED = new Set(["cancelled", "no_show"])
const FINISHED = new Set(["done", "delivered"])

/** When a booking happens: its start, or an order's date (with its time, if any). */
function whenOf(b: CrmBooking) {
  return b.starts_at ? new Date(b.starts_at) : new Date(`${b.due_on}T${b.due_time || "00:00"}:00`)
}

/** Every booking or order, newest first: filter, sum up, open one, take its invoice or receipt, or export them all. */
export function HistoryView({ data, config, onOpen }: { data: CrmData; config: NicheConfig; onOpen: (b: CrmBooking) => void }) {
  const { t, locale } = useT()
  const isOrder = config.kind === "order"
  const [period, setPeriod] = useState<Period>("month")
  const [show, setShow] = useState<Show>("all")
  const [q, setQ] = useState("")
  const clients = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients])

  const now = new Date()
  const from = period === "month" ? new Date(now.getFullYear(), now.getMonth(), 1)
    : period === "last" ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : period === "year" ? new Date(now.getFullYear(), 0, 1) : null
  const to = period === "last" ? new Date(now.getFullYear(), now.getMonth(), 1) : null

  const rows = data.bookings
    .filter((b) => b.kind === config.kind && (b.starts_at || b.due_on))
    .map((b) => ({ b, when: whenOf(b), client: b.client_id ? clients.get(b.client_id) ?? null : null }))
    .filter(({ b, when, client }) => (!from || when >= from) && (!to || when < to)
      && (show === "all" || (show === "cancelled" ? CANCELLED.has(b.status) : show === "finished" ? FINISHED.has(b.status) : !CANCELLED.has(b.status) && !FINISHED.has(b.status)))
      && (!q.trim() || `${b.title} ${client?.name ?? ""} ${client?.phone ?? ""} ${docNumber(b.id)}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((x, y) => y.when.getTime() - x.when.getTime())

  const counted = rows.filter(({ b }) => !CANCELLED.has(b.status))
  const sum = counted.reduce((s, { b }) => s + (b.price ?? 0), 0)
  const paid = counted.reduce((s, { b }) => s + (FINISHED.has(b.status) ? b.price ?? 0 : b.prepaid ?? 0), 0)
  const dateLabel = (d: Date, b: CrmBooking) => d.toLocaleString(locale, { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric", ...(b.starts_at || b.due_time ? { hour: "2-digit", minute: "2-digit" } : {}) })

  // a spreadsheet of what's shown: semicolons and a BOM, so Excel opens it with the right letters
  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const head = ["№", t("Date"), t("Client"), t("Phone"), isOrder ? t("Product") : t("Service"), t("Status"), t("Sum"), t("Prepaid")]
    const lines = rows.map(({ b, when, client }) => [docNumber(b.id), when.toLocaleString(locale), client?.name ?? "", client?.phone ?? "", b.title, t(statusLabel(b.status)), String(b.price ?? ""), String(b.prepaid ?? "")].map(esc).join(";"))
    const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `nodly-${isOrder ? "orders" : "bookings"}-${now.toISOString().slice(0, 10)}.csv` })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const periods: [Period, string][] = [["month", t("This month")], ["last", t("Last month")], ["year", t("This year")], ["all", t("All time")]]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">{t("History")}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{isOrder ? t("Every order. Open one to take its invoice or receipt.") : t("Every booking. Open one to take its invoice or receipt.")}</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!rows.length}
          className="flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40">
          <DownloadIcon className="size-4" />{t("Export to Excel")}
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-foreground/[0.05] p-1 text-[13.5px] no-scrollbar">
          {periods.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={period === id} onClick={() => setPeriod(id)}
              className={cn("h-8 shrink-0 rounded-full px-4 transition-colors", period === id ? "bg-card font-medium shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
        <div className="flex flex-1 gap-3">
          <div className="w-44 shrink-0">
            <Picker value={show} onChange={setShow} label={t("Status")}
              options={[{ value: "all", label: t("All statuses") }, { value: "active", label: t("In work") }, { value: "finished", label: isOrder ? t("Handed over") : t("Came") }, { value: "cancelled", label: t("Cancelled") }]} />
          </div>
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-foreground/[0.05] px-3 ring-1 ring-transparent focus-within:ring-foreground/25">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Client, phone, service or №")} aria-label={t("Search")}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={isOrder ? t("Orders") : t("Appointments")} value={String(counted.length)} />
        <Stat label={t("Sum")} value={money(sum, locale)} />
        <Stat label={t("Paid")} value={money(paid, locale)} />
      </div>

      <div className="overflow-hidden rounded-[22px] apple-card">
        {rows.length ? rows.map(({ b, when, client }, i) => (
          <div key={b.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border/70")}>
            <button type="button" onClick={() => onOpen(b)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="w-28 shrink-0 text-[12.5px] leading-tight text-muted-foreground tabular-nums">{dateLabel(when, b)}<br /><span className="text-[11px]">№ {docNumber(b.id)}</span></span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[14px] font-medium", CANCELLED.has(b.status) && "text-muted-foreground line-through")}>{client?.name || t("No name")}</span>
                <span className="block truncate text-[12.5px] text-muted-foreground">{b.title}</span>
              </span>
              <span className="hidden shrink-0 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[12px] font-medium sm:inline">{t(statusLabel(b.status))}</span>
              <span className="w-24 shrink-0 text-right text-[13.5px] tabular-nums">{money(b.price, locale) || "—"}</span>
            </button>
            <a href={`/receipt/${b.id}?doc=invoice`} target="_blank" rel="noopener" aria-label={t("Invoice")} title={t("Invoice")}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-hover hover:text-foreground"><FileTextIcon className="size-4" /></a>
            <a href={`/receipt/${b.id}?doc=receipt`} target="_blank" rel="noopener" aria-label={t("Receipt")} title={t("Receipt")}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-hover hover:text-foreground"><ReceiptTextIcon className="size-4" /></a>
          </div>
        )) : <p className="px-6 py-14 text-center text-[14px] text-muted-foreground">{t("Nothing for this period.")}</p>}
      </div>
    </div>
  )
}
