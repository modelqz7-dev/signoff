"use client"

import { useMemo } from "react"
import { CheckCircle2Icon, ClockIcon, PencilLineIcon } from "lucide-react"
import { PinOutlineIcon } from "@/components/orders/pins"
import { Card } from "@/components/ui/card"
import { useNow } from "@/lib/use-now"
import { useT } from "@/lib/i18n"
import type { Pin } from "@/lib/pins"
import { STATUS_MAP, type Order } from "./types"

const DAY = 1000 * 60 * 60 * 24

/** Headline numbers: what waits on the client, what waits on you, and this month's results. */
export function KpiRow({ orders, pins }: { orders: Order[]; pins: Pin[] }) {
  const now = useNow()
  const { t } = useT()

  const stats = useMemo(() => {
    const d = new Date(now)
    const inThisMonth = (o: Order) => {
      const c = new Date(o.created_at)
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
    }

    const pending = orders.filter((o) => o.status === "await" || o.status === "changes")
    const waits = pending.map((o) => (now - new Date(o.created_at).getTime()) / DAY)
    const round = (n: number) => Math.round(n * 10) / 10
    const open = pins.filter((p) => !p.resolved)

    return {
      total: orders.length,
      awaiting: orders.filter((o) => o.status === "await").length,
      avgWait: waits.length ? round(waits.reduce((s, w) => s + w, 0) / waits.length) : 0,
      longestWait: waits.length ? round(Math.max(...waits)) : 0,
      changes: orders.filter((o) => o.status === "changes").length,
      changesThisMonth: orders.filter((o) => o.status === "changes" && inThisMonth(o)).length,
      createdThisMonth: orders.filter(inThisMonth).length,
      approvedThisMonth: orders.filter((o) => o.status === "approved" && inThisMonth(o)).length,
      approvedTotal: orders.filter((o) => o.status === "approved").length,
      pinsTotal: pins.length,
      openComments: open.length,
      ordersWithComments: new Set(open.map((p) => p.order_id)).size,
    }
  }, [orders, pins, now])

  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <Tile
        icon={ClockIcon}
        color={STATUS_MAP.await.color}
        tint={STATUS_MAP.await.bg}
        label={t("Awaiting review")}
        value={stats.awaiting}
        of={t("of {n} orders", { n: stats.total })}
        share={stats.total ? stats.awaiting / stats.total : 0}
        sub={stats.awaiting
          ? t("Avg wait {avg}d · longest {max}d", { avg: stats.avgWait, max: stats.longestWait })
          : t("Nothing waiting on clients")}
      />
      <Tile
        icon={PencilLineIcon}
        color={STATUS_MAP.changes.color}
        tint={STATUS_MAP.changes.bg}
        label={t("Changes requested")}
        value={stats.changes}
        of={t("of {n} orders", { n: stats.total })}
        share={stats.total ? stats.changes / stats.total : 0}
        sub={t("{n} this month", { n: stats.changesThisMonth })}
      />
      <Tile
        icon={CheckCircle2Icon}
        color={STATUS_MAP.approved.color}
        tint={STATUS_MAP.approved.bg}
        label={t("Approved this month")}
        value={stats.approvedThisMonth}
        of={t("of {n} new", { n: stats.createdThisMonth })}
        share={stats.createdThisMonth ? stats.approvedThisMonth / stats.createdThisMonth : 0}
        sub={t("{n} approved in total", { n: stats.approvedTotal })}
      />
      <Tile
        icon={PinOutlineIcon}
        color="var(--accent)"
        tint="color-mix(in oklab, var(--accent) 14%, transparent)"
        label={t("Open comments")}
        value={stats.openComments}
        of={t("of {n} total", { n: stats.pinsTotal })}
        share={stats.pinsTotal ? stats.openComments / stats.pinsTotal : 0}
        sub={stats.openComments ? t("On {n} orders", { n: stats.ordersWithComments }) : t("All resolved")}
      />
    </div>
  )
}

function Tile({
  icon: Icon,
  color,
  tint,
  label,
  value,
  of,
  share,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: string
  tint: string
  label: string
  value: number
  of: string
  share: number
  sub: string
}) {
  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint, color }}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-foreground">{value}</span>
        <span className="truncate text-xs text-muted-foreground">{of}</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.round(Math.min(share, 1) * 100)}%`, backgroundColor: color }}
          />
        </div>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </Card>
  )
}
