"use client"

import { useMemo, useState } from "react"
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"
import type { BookingPreset } from "@/components/crm/BookingDialog"
import { Stat } from "@/components/crm/AppointmentsHome"
import {
  BOARD_STATUSES, dayKey, money, nextOrderStatus, setBookingStatus, statusLabel,
  type CrmBooking, type CrmData,
} from "@/lib/crm"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function monday(d: Date) { return addDays(startOfDay(d), -((d.getDay() + 6) % 7)) }

/** Cakes: the same screen as appointments — a day, its week, the day's orders with their next step, and what's coming. */
export function OrdersHome({ data, onNew, onOpen, onChanged, cta }: {
  data: CrmData
  /** The main button: the booking link. */
  cta: React.ReactNode
  onNew: (preset?: BookingPreset) => void
  onOpen: (booking: CrmBooking) => void
  onChanged: (booking: CrmBooking) => void
}) {
  const { t, locale } = useT()
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const todayKey = dayKey(today)
  const isToday = dayKey(day) === todayKey
  const clients = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients])
  const orders = useMemo(() => data.bookings.filter((b) => b.kind === "order" && b.due_on), [data.bookings])
  const open = orders.filter((o) => (BOARD_STATUSES as string[]).includes(o.status))
  const overdue = open.filter((o) => o.due_on! < todayKey && o.status !== "ready")
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday(day), i))
  const weekKeys = new Set(week.map(dayKey))
  const dayOrders = orders.filter((o) => o.due_on === dayKey(day))
    .sort((a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled") || (a.due_time || "99").localeCompare(b.due_time || "99"))
  const dayMoney = dayOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (o.price ?? 0), 0)
  const weekMoney = orders.filter((o) => o.status !== "cancelled" && weekKeys.has(o.due_on!)).reduce((s, o) => s + (o.price ?? 0), 0)
  const upcoming = open.filter((o) => o.due_on! >= todayKey).sort((a, b) => (a.due_on! + (a.due_time || "99")).localeCompare(b.due_on! + (b.due_time || "99"))).slice(0, 6)

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
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 p-5 sm:p-8">
      {/* day and week, like the appointments screen */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] first-letter:uppercase sm:text-[34px]">
            {isToday ? t("Today") : day.toLocaleDateString(locale, { weekday: "long" })}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground first-letter:uppercase">
            {day.toLocaleDateString(locale, { weekday: isToday ? "long" : undefined, day: "numeric", month: "long" })}
            {overdue.length ? <span className="text-destructive"> · {t("{n} overdue", { n: overdue.length })}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={t("Previous day")} onClick={() => setDay(addDays(day, -1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-hover"><ChevronLeftIcon className="size-4" /></button>
          <button type="button" onClick={() => setDay(startOfDay(new Date()))} disabled={isToday} className="h-9 rounded-lg px-3 text-[13px] font-medium hover:bg-hover disabled:opacity-40">{t("Today")}</button>
          <button type="button" aria-label={t("Next day")} onClick={() => setDay(addDays(day, 1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-hover"><ChevronRightIcon className="size-4" /></button>
        </div>
        <div className="ml-auto sm:ml-0">{cta}</div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const k = dayKey(d)
          const n = orders.filter((o) => o.due_on === k && o.status !== "cancelled").length
          const selected = k === dayKey(day)
          return (
            <button key={k} type="button" onClick={() => setDay(d)}
              className={cn("flex flex-col items-center gap-0.5 rounded-xl py-2 transition-colors", selected ? "bg-foreground text-background" : "hover:bg-hover")}>
              <span className={cn("text-[11px] font-medium uppercase", selected ? "opacity-70" : "text-muted-foreground")}>{d.toLocaleDateString(locale, { weekday: "short" })}</span>
              <span className={cn("text-[17px] font-semibold tabular-nums", !selected && k === todayKey && "underline decoration-2 underline-offset-4")}>{d.getDate()}</span>
              <span className={cn("h-4 text-[11px] tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>{n ? t("{n} ord.", { n }) : ""}</span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1fr_280px]">
        {/* the day's orders: a time when there is one, the stage and the next step */}
        <div className="flex min-h-[360px] flex-col rounded-[22px] apple-card">
          {dayOrders.map((o, i) => {
            const next = nextOrderStatus(o.status)
            const late = o.due_on! < todayKey && (BOARD_STATUSES as string[]).includes(o.status) && o.status !== "ready"
            const off = o.status === "cancelled"
            return (
              <div key={o.id} className={cn("flex items-start gap-3 px-4 py-3.5", i > 0 && "border-t border-border/70")}>
                <span className="w-14 shrink-0 pt-0.5 text-[12.5px] font-semibold tabular-nums">{o.due_time || <span className="font-normal text-muted-foreground">{t("All day")}</span>}</span>
                <button type="button" onClick={() => onOpen(o)} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                  <span className={cn("text-[14px] leading-snug font-semibold", off && "text-muted-foreground line-through")}>{o.title}</span>
                  <span className="truncate text-[12.5px] text-muted-foreground">{(o.client_id && clients.get(o.client_id)?.name) || t("No name")}{summary(o) ? ` · ${summary(o)}` : ""}</span>
                  {o.details.inscription && <span className="text-[12.5px] leading-snug text-muted-foreground italic">«{o.details.inscription}»</span>}
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
                    <span className={cn("rounded-full px-2 py-0.5 font-medium", late ? "bg-destructive/10 text-destructive" : "bg-foreground/[0.06]")}>{late ? t("Overdue") : t(statusLabel(o.status))}</span>
                    <span className="tabular-nums">{money(o.price, locale)}</span>
                    {o.prepaid ? <span className="text-muted-foreground">{t("prepaid {sum}", { sum: money(o.prepaid, locale) })}</span> : null}
                  </span>
                </button>
                {next && (
                  <button type="button" onClick={() => advance(o)} title={t("Move to “{status}”", { status: t(statusLabel(next)) })}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12.5px] font-medium ring-1 ring-border hover:bg-hover">
                    {t(statusLabel(next))}<ArrowRightIcon className="size-3" />
                  </button>
                )}
              </div>
            )
          })}
          {!dayOrders.length && (
            <div className="m-auto flex flex-col items-center gap-3 p-8 text-center">
              <p className="text-[13.5px] text-muted-foreground">{t("No orders for this day.")}</p>
            </div>
          )}
          <button type="button" onClick={() => onNew({ dueOn: dayKey(day) })}
            className="mt-auto flex items-center gap-1.5 border-t border-border/70 px-4 py-3 text-[13px] text-muted-foreground hover:text-foreground">
            <PlusIcon className="size-4" />{t("Add an order for this day")}
          </button>
        </div>

        {/* the day in numbers and what's next */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
            <Stat label={t("Orders")} value={String(dayOrders.filter((o) => o.status !== "cancelled").length)} />
            <Stat label={isToday ? t("Today's orders") : t("Day's orders")} value={money(dayMoney, locale)} />
            <Stat label={t("This week")} value={money(weekMoney, locale)} />
          </div>
          <div className="rounded-[22px] apple-card p-3">
            <p className="px-1 pb-2 text-[13px] font-semibold">{t("Coming up")}</p>
            {upcoming.length ? upcoming.map((o) => (
              <button key={o.id} type="button" onClick={() => { setDay(new Date(`${o.due_on}T00:00:00`)); onOpen(o) }} className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-hover">
                <span className="w-14 shrink-0 text-[12px] leading-tight text-muted-foreground tabular-nums">
                  {o.due_on === todayKey ? t("today") : new Date(`${o.due_on}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })}{o.due_time ? <><br />{o.due_time}</> : null}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-tight">
                  <span className="block truncate font-medium">{(o.client_id && clients.get(o.client_id)?.name) || t("No name")}</span>
                  <span className="block truncate text-muted-foreground">{o.title}</span>
                </span>
              </button>
            )) : <p className="px-1 pb-1 text-[13px] text-muted-foreground">{t("Nothing ordered ahead yet.")}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
