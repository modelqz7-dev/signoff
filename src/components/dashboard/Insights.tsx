"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useNow } from "@/lib/use-now"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { STATUS_MAP, type Order, type OrderStatus } from "./types"

// The calendar and the numbers live in dialogs opened from the dashboard header, so the
// dashboard itself stays about today.

const DAY = 1000 * 60 * 60 * 24
const STATUSES: OrderStatus[] = ["await", "changes", "approved", "prod"]
// One ink in four strengths instead of status colours: calm, like a drawing.
const SHADE: Record<OrderStatus, string> = {
  await: "color-mix(in oklab, var(--foreground) 85%, transparent)",
  changes: "color-mix(in oklab, var(--foreground) 55%, transparent)",
  approved: "color-mix(in oklab, var(--foreground) 32%, transparent)",
  prod: "color-mix(in oklab, var(--foreground) 14%, transparent)",
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** A month of deadlines: dots on the days, the orders of the picked day below. */
export function CalendarDialog({ orders, open, onOpenChange }: { orders: Order[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, lang, locale } = useT()
  const now = useNow()
  const todayKey = dayKey(new Date(now))
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const shown = month ?? { y: new Date(now).getFullYear(), m: new Date(now).getMonth() }
  const selected = picked ?? todayKey

  const byDay = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of orders) if (o.deadline) map.set(o.deadline, [...(map.get(o.deadline) ?? []), o])
    return map
  }, [orders])

  // Weeks start on Monday in Russian, on Sunday in English.
  const weekStart = lang === "ru" ? 1 : 0
  const first = new Date(shown.y, shown.m, 1)
  const lead = (first.getDay() - weekStart + 7) % 7
  const daysInMonth = new Date(shown.y, shown.m + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => new Date(shown.y, shown.m, i - lead + 1))
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + weekStart + i).toLocaleDateString(locale, { weekday: "short" }))
  const dayOrders = byDay.get(selected) ?? []
  const selectedDate = new Date(selected + "T00:00:00")

  function go(delta: number) {
    const d = new Date(shown.y, shown.m + delta, 1)
    setMonth({ y: d.getFullYear(), m: d.getMonth() })
  }

  const monthName = first.toLocaleDateString(locale, { month: "long" })

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader className="sr-only">
        <DialogTitle>{t("Calendar")}</DialogTitle>
        <DialogDescription>{t("Order deadlines by day.")}</DialogDescription>
      </DialogHeader>

      {/* month name set large, like the title page of a catalogue */}
      <div className="flex min-w-0 items-end justify-between gap-2 pr-7">
        <p className="flex min-w-0 items-baseline gap-2" suppressHydrationWarning>
          <span className="font-[family-name:var(--font-brand)] truncate text-2xl leading-none font-bold tracking-[-0.04em] text-foreground first-letter:uppercase sm:text-3xl">{monthName}</span>
          <span className="text-sm text-muted-foreground tabular-nums">{shown.y}</span>
        </p>
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => go(-1)} aria-label={t("Previous month")} className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
            <ChevronLeftIcon className="size-4" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => { setMonth(null); setPicked(null) }} className="h-8 rounded-full px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:bg-hover hover:text-foreground">
            {t("Today")}
          </button>
          <button type="button" onClick={() => go(1)} aria-label={t("Next month")} className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
            <ChevronRightIcon className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-t border-foreground/15 pt-3 text-center">
        {weekdays.map((w) => (
          <span key={w} className="pb-2 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase" suppressHydrationWarning>{w.replace(".", "").slice(0, 2)}</span>
        ))}
        {cells.map((d) => {
          const key = dayKey(d)
          if (d.getMonth() !== shown.m) return <span key={key} />
          const due = byDay.get(key) ?? []
          const isToday = key === todayKey
          const isPicked = key === selected
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPicked(key)}
              aria-pressed={isPicked}
              aria-label={`${d.toLocaleDateString(locale, { day: "numeric", month: "long" })}${due.length ? `, ${t("{n} deadlines", { n: due.length })}` : ""}`}
              className="group flex h-11 flex-col items-center justify-center gap-1"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                  isPicked ? "bg-primary font-medium text-primary-foreground"
                    : isToday ? "font-medium text-foreground ring-1 ring-foreground/40"
                    : due.length ? "text-foreground group-hover:bg-hover"
                    : "text-muted-foreground/70 group-hover:bg-hover"
                )}
              >
                {d.getDate()}
              </span>
              {/* a short rule under a day with deadlines, longer with more */}
              <span className={cn("h-px rounded-full bg-foreground/60 transition-opacity", due.length ? "opacity-100" : "opacity-0")} style={{ width: `${Math.min(due.length, 3) * 5}px` }} />
            </button>
          )
        })}
      </div>

      <div className="flex flex-col border-t border-foreground/15 pt-3">
        <p className="pb-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase" suppressHydrationWarning>
          {selectedDate.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {dayOrders.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t("No deadlines on this day.")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {dayOrders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="-mx-2 flex items-baseline gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{o.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{o.client_name || "—"} · {o.code}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{t(STATUS_MAP[o.status].label)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}

/** Orders and money over the last six months, and where the orders are now. */
export function StatsDialog({ orders, open, onOpenChange }: { orders: Order[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, locale } = useT()
  const now = useNow()
  const [metric, setMetric] = useState<"orders" | "value">("orders")
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })

  const data = useMemo(() => {
    const ref = new Date(now)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(ref.getFullYear(), ref.getMonth() - 5 + i, 1)
      return { y: d.getFullYear(), m: d.getMonth(), created: 0, approved: 0, createdValue: 0, approvedValue: 0 }
    })
    const find = (iso?: string | null) => {
      if (!iso) return undefined
      const d = new Date(iso)
      return months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth())
    }
    for (const o of orders) {
      const c = find(o.created_at)
      if (c) { c.created++; c.createdValue += o.value || 0 }
      const a = o.status === "approved" || o.status === "prod" ? find(o.approved_at) : undefined
      if (a) { a.approved++; a.approvedValue += o.value || 0 }
    }
    const approved = orders.filter((o) => o.status === "approved" || o.status === "prod")
    const decided = orders.filter((o) => o.status !== "await")
    const spans = approved.filter((o) => o.approved_at).map((o) => (new Date(o.approved_at!).getTime() - new Date(o.created_at).getTime()) / DAY)
    const versions = approved.map((o) => o.version ?? 1)
    const counts = Object.fromEntries(STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length])) as Record<OrderStatus, number>
    return {
      months,
      counts,
      total: orders.length,
      approvalRate: decided.length ? Math.round((approved.length / decided.length) * 100) : null,
      avgDays: spans.length ? Math.max(1, Math.round(spans.reduce((s, d) => s + d, 0) / spans.length)) : null,
      avgVersions: versions.length ? Math.round((versions.reduce((s, v) => s + v, 0) / versions.length) * 10) / 10 : null,
      approvedValue: approved.reduce((s, o) => s + (o.value || 0), 0),
    }
  }, [orders, now])

  const series = data.months.map((x) => ({
    label: new Date(x.y, x.m, 1).toLocaleDateString(locale, { month: "short" }),
    a: metric === "orders" ? x.created : x.createdValue,
    b: metric === "orders" ? x.approved : x.approvedValue,
  }))
  const max = Math.max(1, ...series.flatMap((s) => [s.a, s.b]))
  const fmt = (n: number) => (metric === "orders" ? String(n) : n ? `$${compact.format(n)}` : "0")

  const tiles = [
    { label: t("Total orders"), value: String(data.total) },
    { label: t("Approval rate"), value: data.approvalRate === null ? "—" : `${data.approvalRate}%` },
    { label: t("Avg. time to approval"), value: data.avgDays === null ? "—" : t("{n}d", { n: data.avgDays }) },
    { label: t("Approved value"), value: money.format(data.approvedValue) },
  ]

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t("Statistics")}</DialogTitle>
        <DialogDescription>{t("How your orders move, over the last six months.")}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl ring-1 ring-foreground/10 sm:grid-cols-4">
        {tiles.map((s, i) => (
          <div key={s.label} className={cn("flex flex-col gap-1 px-3.5 py-3", i % 2 === 1 && "border-l border-border/60", i >= 2 && "border-t border-border/60 sm:border-t-0", i === 2 && "sm:border-l")}>
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
            <span className="font-[family-name:var(--font-brand)] text-lg font-bold tracking-[-0.02em] text-foreground tabular-nums" suppressHydrationWarning>{s.value}</span>
          </div>
        ))}
      </div>

      {/* created vs approved, per month */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-foreground/20" />{t("New orders")}</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-primary/80" />{t("Approved orders")}</span>
          </div>
          <div role="radiogroup" aria-label={t("Show")} className="flex rounded-lg bg-muted p-0.5">
            {(["orders", "value"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={metric === m}
                onClick={() => setMetric(m)}
                className={cn("h-7 rounded-md px-2.5 text-xs font-medium transition-colors", metric === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {m === "orders" ? t("Orders") : t("Value")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid h-44 grid-cols-6 items-end gap-2 sm:gap-4">
          {series.map((s, i) => (
            <div key={i} className="flex h-full flex-col justify-end gap-1.5">
              <div className="flex flex-1 items-end justify-center gap-1">
                {[{ v: s.a, tone: "bg-foreground/20" }, { v: s.b, tone: "bg-primary/80" }].map((bar, j) => (
                  <div key={j} className="flex h-full w-full max-w-6 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] text-muted-foreground tabular-nums" suppressHydrationWarning>{bar.v ? fmt(bar.v) : ""}</span>
                    <div
                      className={cn("w-full rounded-t-[3px]", bar.tone)}
                      style={{ height: `${(bar.v / max) * 100}%`, minHeight: bar.v ? 3 : 0 }}
                    />
                  </div>
                ))}
              </div>
              <span className="border-t border-border/60 pt-1 text-center text-[11px] text-muted-foreground first-letter:uppercase" suppressHydrationWarning>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* where the orders are now */}
      <div className="flex flex-col gap-2.5">
        <p className="text-xs font-medium text-foreground">{t("Orders by status")}</p>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
          {data.total > 0 && STATUSES.map((s) => (
            <div key={s} style={{ width: `${(data.counts[s] / data.total) * 100}%`, backgroundColor: SHADE[s] }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          {STATUSES.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: SHADE[s] }} />
              {t(STATUS_MAP[s].label)}
              <span className="ml-auto font-medium text-foreground tabular-nums sm:ml-0">{data.counts[s]}</span>
            </span>
          ))}
        </div>
        {data.avgVersions !== null && (
          <p className="text-xs text-muted-foreground">{t("Versions before approval, on average: {n}", { n: data.avgVersions })}</p>
        )}
      </div>
    </Dialog>
  )
}
