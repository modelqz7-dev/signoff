"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useNow } from "@/lib/use-now"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { STATUS_MAP, type Order } from "./types"

// The calendar lives in a dialog opened from the home page, so the page itself stays about today.

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
