"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import type { BookingPreset } from "@/components/crm/BookingDialog"
import { appointmentEnd, counts, dayKey, money, type CrmBooking, type CrmData } from "@/lib/crm"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

const HOUR_PX = 64

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function monday(d: Date) { return addDays(startOfDay(d), -((d.getDay() + 6) % 7)) }

/** Lays overlapping appointments side by side: each gets a lane and the number of lanes in its group. */
function lanes(items: CrmBooking[]) {
  const sorted = [...items].sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))
  const out = new Map<string, { lane: number; of: number }>()
  let group: CrmBooking[] = []
  let groupEnd = 0
  const flush = () => {
    const ends: number[] = []
    const placed = group.map((b) => {
      const start = new Date(b.starts_at!).getTime()
      let lane = ends.findIndex((e) => e <= start)
      if (lane < 0) { lane = ends.length; ends.push(0) }
      ends[lane] = appointmentEnd(b).getTime()
      return { b, lane }
    })
    placed.forEach(({ b, lane }) => out.set(b.id, { lane, of: ends.length }))
    group = []
  }
  for (const b of sorted) {
    const start = new Date(b.starts_at!).getTime()
    if (group.length && start >= groupEnd) flush()
    group.push(b)
    groupEnd = Math.max(groupEnd, appointmentEnd(b).getTime())
  }
  if (group.length) flush()
  return out
}

/** Nails and barbershop: the day's appointments on a timeline, a week strip and the day's money. */
export function AppointmentsHome({ data, onNew, onOpen, cta }: {
  data: CrmData
  /** The main button: the booking link. */
  cta: React.ReactNode
  onNew: (preset?: BookingPreset) => void
  onOpen: (booking: CrmBooking) => void
}) {
  const { t, locale } = useT()
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const [now, setNow] = useState(() => new Date())
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(id) }, [])

  const clients = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients])
  const appointments = useMemo(() => data.bookings.filter((b) => b.kind === "appointment" && b.starts_at), [data.bookings])
  const byDay = useMemo(() => {
    const map = new Map<string, CrmBooking[]>()
    for (const b of appointments) {
      const k = dayKey(new Date(b.starts_at!))
      map.set(k, [...(map.get(k) ?? []), b])
    }
    return map
  }, [appointments])

  const today = startOfDay(now)
  const todays = byDay.get(dayKey(day)) ?? []
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday(day), i))
  const weekMoney = week.reduce((sum, d) => sum + (byDay.get(dayKey(d)) ?? []).filter(counts).reduce((s, b) => s + (b.price ?? 0), 0), 0)
  const dayMoney = todays.filter(counts).reduce((s, b) => s + (b.price ?? 0), 0)

  // the visible hours: the working day, stretched to fit early or late appointments
  const hours = todays.map((b) => new Date(b.starts_at!).getHours())
  const ends = todays.map((b) => { const e = appointmentEnd(b); return e.getHours() + (e.getMinutes() ? 1 : 0) })
  const from = Math.min(9, ...hours)
  const to = Math.max(20, ...ends)
  const placed = lanes(todays)

  // open on the current hour
  useEffect(() => {
    const el = scroller.current
    if (el && dayKey(day) === dayKey(new Date())) el.scrollTop = Math.max(0, (new Date().getHours() - from - 1) * HOUR_PX)
  }, [day, from])

  const upcoming = appointments.filter((b) => b.status === "booked" && new Date(b.starts_at!) >= now).sort((a, b) => a.starts_at!.localeCompare(b.starts_at!)).slice(0, 6)
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  const isToday = dayKey(day) === dayKey(today)

  function clickSlot(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-booking]")) return
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    const minutes = Math.floor((y / HOUR_PX) * 2) * 30
    const start = new Date(day)
    start.setHours(from, minutes, 0, 0)
    onNew({ startsAt: start })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 p-4 sm:p-6">
      {/* day and week */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <h1 className="text-[24px] font-semibold tracking-tight first-letter:uppercase">
            {isToday ? t("Today") : day.toLocaleDateString(locale, { weekday: "long" })}
          </h1>
          <p className="text-[13.5px] text-muted-foreground first-letter:uppercase">{day.toLocaleDateString(locale, { weekday: isToday ? "long" : undefined, day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={t("Previous day")} onClick={() => setDay(addDays(day, -1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-hover"><ChevronLeftIcon className="size-4" /></button>
          <button type="button" onClick={() => setDay(today)} disabled={isToday} className="h-9 rounded-lg px-3 text-[13px] font-medium hover:bg-hover disabled:opacity-40">{t("Today")}</button>
          <button type="button" aria-label={t("Next day")} onClick={() => setDay(addDays(day, 1))} className="flex size-9 items-center justify-center rounded-lg hover:bg-hover"><ChevronRightIcon className="size-4" /></button>
        </div>
        <div className="ml-auto sm:ml-0">{cta}</div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const k = dayKey(d)
          const n = (byDay.get(k) ?? []).filter(counts).length
          const selected = k === dayKey(day)
          return (
            <button key={k} type="button" onClick={() => setDay(d)}
              className={cn("flex flex-col items-center gap-0.5 rounded-xl py-2 transition-colors",
                selected ? "bg-foreground text-background" : "hover:bg-hover")}>
              <span className={cn("text-[11px] font-medium uppercase", selected ? "opacity-70" : "text-muted-foreground")}>{d.toLocaleDateString(locale, { weekday: "short" })}</span>
              <span className={cn("text-[17px] font-semibold tabular-nums", !selected && k === dayKey(today) && "underline decoration-2 underline-offset-4")}>{d.getDate()}</span>
              <span className={cn("h-4 text-[11px] tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>{n ? t("{n} appt.", { n }) : ""}</span>
            </button>
          )
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1fr_280px]">
        {/* the day's timeline */}
        <div ref={scroller} className="relative max-h-[70dvh] min-h-[360px] overflow-y-auto rounded-2xl bg-card ring-1 ring-border xl:max-h-none">
          <div className="relative flex" style={{ height: (to - from) * HOUR_PX }}>
            <div className="w-14 shrink-0">
              {Array.from({ length: to - from }, (_, i) => (
                <div key={i} className="relative text-right text-[11px] text-muted-foreground tabular-nums" style={{ height: HOUR_PX }}>
                  <span className={cn("absolute right-2", i ? "-top-2" : "top-1")}>{`${String(from + i).padStart(2, "0")}:00`}</span>
                </div>
              ))}
            </div>
            <div className="relative flex-1 cursor-copy" onClick={clickSlot} title={t("Click a free time to book it")}>
              {Array.from({ length: to - from }, (_, i) => (
                <div key={i} className="border-t border-border/70" style={{ height: HOUR_PX }}>
                  <div className="h-1/2 border-b border-dashed border-border/40" />
                </div>
              ))}
              {isToday && now.getHours() >= from && now.getHours() < to && (
                <div className="pointer-events-none absolute right-0 left-0 z-10 flex items-center" style={{ top: ((now.getHours() - from) * 60 + now.getMinutes()) / 60 * HOUR_PX }}>
                  <span className="-ml-1 size-2 rounded-full bg-foreground" /><span className="h-px flex-1 bg-foreground" />
                </div>
              )}
              {todays.map((b) => {
                const start = new Date(b.starts_at!)
                const top = ((start.getHours() - from) * 60 + start.getMinutes()) / 60 * HOUR_PX
                const height = Math.max(26, ((b.duration_min ?? 60) / 60) * HOUR_PX - 2)
                const { lane, of } = placed.get(b.id) ?? { lane: 0, of: 1 }
                const client = b.client_id ? clients.get(b.client_id) : null
                const off = b.status === "cancelled" || b.status === "no_show"
                return (
                  <button key={b.id} type="button" data-booking onClick={() => onOpen(b)}
                    className={cn("absolute overflow-hidden rounded-lg px-2.5 py-1.5 text-left text-[12.5px] leading-tight ring-1 transition-shadow hover:shadow-md",
                      b.status === "done" ? "bg-muted ring-border" : off ? "bg-card text-muted-foreground ring-border line-through opacity-60" : "bg-foreground/[0.07] ring-foreground/15 dark:bg-white/[0.09]")}
                    style={{ top: top + 1, height, left: `calc(${(lane / of) * 100}% + 4px)`, width: `calc(${100 / of}% - 8px)` }}>
                    {height < 48 ? (
                      <span className="flex items-center gap-1 truncate">
                        {b.status === "done" && <CheckIcon className="size-3.5 shrink-0" />}
                        <span className="shrink-0 font-semibold tabular-nums">{time(start)}</span>
                        <span className="truncate">· {client?.name || t("No name")} · {b.title}</span>
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 font-semibold whitespace-nowrap">
                          {b.status === "done" && <CheckIcon className="size-3.5 shrink-0" />}
                          <span className="truncate tabular-nums">{time(start)}–{time(appointmentEnd(b))}</span>
                        </span>
                        <span className="block truncate font-medium">{client?.name || t("No name")}</span>
                        <span className="block truncate text-muted-foreground">{b.title}{b.staff ? ` · ${b.staff}` : ""}{b.price != null ? ` · ${money(b.price, locale)}` : ""}</span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          {!todays.length && (
            <p className="pointer-events-none absolute top-24 right-0 left-14 text-center text-[13.5px] text-muted-foreground">{t("No appointments. Click a free time to book one.")}</p>
          )}
        </div>

        {/* the day in numbers and what's next */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
            <Stat label={t("Appointments")} value={String(todays.filter(counts).length)} />
            <Stat label={isToday ? t("Today's takings") : t("Day's takings")} value={money(dayMoney, locale)} />
            <Stat label={t("This week")} value={money(weekMoney, locale)} />
          </div>
          <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
            <p className="px-1 pb-2 text-[13px] font-semibold">{t("Coming up")}</p>
            {upcoming.length ? upcoming.map((b) => {
              const s = new Date(b.starts_at!)
              return (
                <button key={b.id} type="button" onClick={() => { setDay(startOfDay(s)); onOpen(b) }} className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-hover">
                  <span className="w-14 shrink-0 text-[12px] leading-tight text-muted-foreground tabular-nums">
                    {dayKey(s) === dayKey(today) ? t("today") : s.toLocaleDateString(locale, { day: "numeric", month: "short" })}<br />{time(s)}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] leading-tight">
                    <span className="block truncate font-medium">{(b.client_id && clients.get(b.client_id)?.name) || t("No name")}</span>
                    <span className="block truncate text-muted-foreground">{b.title}</span>
                  </span>
                </button>
              )
            }) : <p className="px-1 pb-1 text-[13px] text-muted-foreground">{t("Nothing booked ahead yet.")}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
      <span className="truncate text-[12px] text-muted-foreground">{label}</span>
      <span className="truncate text-[20px] font-semibold tabular-nums">{value || "—"}</span>
    </div>
  )
}
