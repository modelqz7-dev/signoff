"use client"

import { useMemo, useState } from "react"
import { ArrowRightIcon, ChevronDownIcon, PlusIcon } from "lucide-react"
import type { BookingPreset } from "@/components/crm/BookingDialog"
import { Stat } from "@/components/crm/AppointmentsHome"
import {
  BOARD_STATUSES, BOARD_TITLES, dayKey, money, nextOrderStatus, setBookingStatus, statusLabel,
  type CrmBooking, type CrmData, type OrderStatus,
} from "@/lib/crm"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

const LOAD_DAYS = 14

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

/** Cakes: orders on a board by stage, how loaded the next two weeks are, and what's handed over. */
export function OrdersHome({ data, onNew, onOpen, onChanged, cta }: {
  data: CrmData
  /** The main button: the booking link. */
  cta: React.ReactNode
  onNew: (preset?: BookingPreset) => void
  onOpen: (booking: CrmBooking) => void
  onChanged: (booking: CrmBooking) => void
}) {
  const { t, locale } = useT()
  const [day, setDay] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const todayKey = dayKey(today)
  const tomorrowKey = dayKey(addDays(today, 1))
  const clients = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients])
  const orders = useMemo(() => data.bookings.filter((b) => b.kind === "order" && b.due_on), [data.bookings])
  const open = orders.filter((o) => (BOARD_STATUSES as string[]).includes(o.status))
  const finished = orders.filter((o) => o.status === "delivered" || o.status === "cancelled")
    .sort((a, b) => b.due_on!.localeCompare(a.due_on!)).slice(0, 30)
  const load = Array.from({ length: LOAD_DAYS }, (_, i) => {
    const k = dayKey(addDays(today, i))
    return { key: k, date: addDays(today, i), n: open.filter((o) => o.due_on === k).length }
  })
  const most = Math.max(1, ...load.map((d) => d.n))
  const overdue = open.filter((o) => o.due_on! < todayKey && o.status !== "ready")
  const shown = day ? open.filter((o) => o.due_on === day) : open
  const weekEnd = dayKey(addDays(today, 6))
  const weekMoney = orders.filter((o) => o.status !== "cancelled" && o.due_on! >= todayKey && o.due_on! <= weekEnd).reduce((s, o) => s + (o.price ?? 0), 0)

  const dueLabel = (o: CrmBooking) => {
    const d = o.due_on === todayKey ? t("Today") : o.due_on === tomorrowKey ? t("Tomorrow")
      : new Date(`${o.due_on}T00:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })
    return o.due_time ? `${d}, ${o.due_time}` : d
  }

  async function advance(o: CrmBooking) {
    const next = nextOrderStatus(o.status)
    if (!next) return
    setError(null)
    onChanged({ ...o, status: next })
    try { await setBookingStatus(o.id, next) } catch (e) { onChanged(o); setError((e as Error).message) }
  }

  const summary = (o: CrmBooking) => {
    const bits: string[] = []
    if (o.details.weight) bits.push(t("{n} kg", { n: o.details.weight }))
    if (o.details.filling) bits.push(o.details.filling)
    if (o.details.delivery) bits.push(t(o.details.delivery))
    return bits.join(" · ")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold tracking-tight">{t("Orders")}</h1>
          <p className="text-[13.5px] text-muted-foreground">{t("{n} in work", { n: open.length })}{overdue.length ? ` · ${t("{n} overdue", { n: overdue.length })}` : ""}</p>
        </div>
        {cta}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        {/* the next two weeks */}
        <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-[13px] font-semibold">{t("Load for two weeks")}</p>
            {day && <button type="button" onClick={() => setDay(null)} className="text-[12.5px] text-muted-foreground hover:text-foreground">{t("Show all")}</button>}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:grid-cols-14">
            {load.map((d) => (
              <button key={d.key} type="button" onClick={() => setDay(day === d.key ? null : d.key)} title={d.date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                className={cn("flex flex-col items-center gap-1 rounded-lg py-1.5 transition-colors", day === d.key ? "bg-foreground text-background" : "hover:bg-hover")}>
                <span className="flex h-10 w-3 items-end overflow-hidden rounded-full bg-foreground/[0.07]">
                  <span className={cn("w-full rounded-full", day === d.key ? "bg-background" : "bg-foreground/70")} style={{ height: `${(d.n / most) * 100}%` }} />
                </span>
                <span className={cn("text-[10.5px] uppercase", day === d.key ? "opacity-70" : "text-muted-foreground")}>{d.date.toLocaleDateString(locale, { weekday: "short" })}</span>
                <span className="text-[13px] font-semibold tabular-nums">{d.date.getDate()}</span>
                <span className={cn("h-3.5 text-[11px] tabular-nums", day === d.key ? "opacity-80" : "text-muted-foreground")}>{d.n || ""}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:w-56 lg:grid-cols-1">
          <Stat label={t("Orders this week")} value={money(weekMoney, locale)} />
          <Stat label={t("Prepaid, waiting")} value={money(open.reduce((s, o) => s + (o.prepaid ?? 0), 0), locale)} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* the board */}
      <div className="-mx-4 flex min-h-0 gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {BOARD_STATUSES.map((status: OrderStatus) => {
          const items = shown.filter((o) => o.status === status).sort((a, b) => (a.due_on! + a.due_time).localeCompare(b.due_on! + b.due_time))
          return (
            <section key={status} className="flex w-[268px] shrink-0 flex-col gap-2 rounded-2xl bg-foreground/[0.03] p-2 lg:w-auto lg:flex-1 dark:bg-white/[0.03]">
              <h2 className="flex items-center justify-between px-1.5 pt-1 text-[13px] font-semibold">
                {t(BOARD_TITLES[status])}<span className="text-muted-foreground tabular-nums">{items.length}</span>
              </h2>
              {items.map((o) => {
                const late = o.due_on! < todayKey && o.status !== "ready"
                const next = nextOrderStatus(o.status)
                return (
                  <article key={o.id} className="group flex flex-col gap-1.5 rounded-xl bg-card p-3 ring-1 ring-border transition-shadow hover:shadow-md">
                    <button type="button" onClick={() => onOpen(o)} className="flex flex-col gap-1 text-left">
                      <span className={cn("text-[12px] font-medium", late ? "text-destructive" : "text-muted-foreground")}>
                        {late ? `${t("Overdue")} · ` : ""}{dueLabel(o)}
                      </span>
                      <span className="text-[14px] leading-snug font-semibold">{o.title}</span>
                      <span className="truncate text-[12.5px] text-muted-foreground">{(o.client_id && clients.get(o.client_id)?.name) || t("No name")}</span>
                      {summary(o) && <span className="text-[12.5px] leading-snug">{summary(o)}</span>}
                      {o.details.inscription && <span className="text-[12.5px] leading-snug text-muted-foreground italic">«{o.details.inscription}»</span>}
                    </button>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[12.5px] tabular-nums">
                        {money(o.price, locale)}
                        {o.prepaid ? <span className="text-muted-foreground"> · {t("prepaid {sum}", { sum: money(o.prepaid, locale) })}</span> : null}
                      </span>
                      {next && (
                        <button type="button" onClick={() => advance(o)} title={t("Move to “{status}”", { status: t(statusLabel(next)) })}
                          className="flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium ring-1 ring-border hover:bg-hover">
                          {t(statusLabel(next))}<ArrowRightIcon className="size-3" />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
              {!items.length && <p className="px-1.5 pb-2 text-[12.5px] text-muted-foreground">{status === "new" ? t("New orders land here.") : "—"}</p>}
              {status === "new" && (
                <button type="button" onClick={() => onNew(day ? { dueOn: day } : undefined)} className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[12.5px] text-muted-foreground hover:bg-hover hover:text-foreground">
                  <PlusIcon className="size-3.5" />{t("Add by hand")}
                </button>
              )}
            </section>
          )
        })}
      </div>

      {/* handed over and cancelled */}
      {finished.length > 0 && (
        <div className="rounded-2xl bg-card ring-1 ring-border">
          <button type="button" onClick={() => setShowDone(!showDone)} className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-semibold">
            {t("Handed over and cancelled")}
            <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", showDone && "rotate-180")} />
          </button>
          {showDone && finished.map((o) => (
            <button key={o.id} type="button" onClick={() => onOpen(o)} className="flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left text-[13px] hover:bg-hover">
              <span className="w-24 shrink-0 text-muted-foreground">{dueLabel(o)}</span>
              <span className={cn("min-w-0 flex-1 truncate", o.status === "cancelled" && "text-muted-foreground line-through")}>{o.title} · {(o.client_id && clients.get(o.client_id)?.name) || t("No name")}</span>
              <span className="shrink-0 tabular-nums">{money(o.price, locale)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
