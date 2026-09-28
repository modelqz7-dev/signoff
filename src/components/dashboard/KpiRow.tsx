"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { useNow } from "@/lib/use-now"
import type { Pin } from "@/lib/pins"
import { STATUS_MAP, type Order } from "./types"

const DAY = 1000 * 60 * 60 * 24

/** Headline numbers: what waits on the client, what waits on you, and this month's results. */
export function KpiRow({ orders, pins }: { orders: Order[]; pins: Pin[] }) {
  const now = useNow()

  const stats = useMemo(() => {
    const d = new Date(now)
    const inThisMonth = (o: Order) => {
      const c = new Date(o.created_at)
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
    }

    const awaiting = orders.filter((o) => o.status === "await")
    const pending = orders.filter((o) => o.status === "await" || o.status === "changes")
    const waits = pending.map((o) => (now - new Date(o.created_at).getTime()) / DAY)
    const round = (n: number) => Math.round(n * 10) / 10

    const open = pins.filter((p) => !p.resolved)

    return {
      awaiting: awaiting.length,
      avgWait: waits.length ? round(waits.reduce((s, w) => s + w, 0) / waits.length) : 0,
      longestWait: waits.length ? round(Math.max(...waits)) : 0,
      changes: orders.filter((o) => o.status === "changes").length,
      changesThisMonth: orders.filter((o) => o.status === "changes" && inThisMonth(o)).length,
      approvedThisMonth: orders.filter((o) => o.status === "approved" && inThisMonth(o)).length,
      approvedTotal: orders.filter((o) => o.status === "approved").length,
      openComments: open.length,
      ordersWithComments: new Set(open.map((p) => p.order_id)).size,
    }
  }, [orders, pins, now])

  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <Tile
        label="Awaiting review"
        dot={STATUS_MAP.await.color}
        value={stats.awaiting}
        sub={stats.awaiting ? `Avg wait ${stats.avgWait}d · longest ${stats.longestWait}d` : "Nothing waiting on clients"}
      />
      <Tile
        label="Changes requested"
        dot={STATUS_MAP.changes.color}
        value={stats.changes}
        sub={`${stats.changesThisMonth} this month`}
      />
      <Tile
        label="Approved this month"
        dot={STATUS_MAP.approved.color}
        value={stats.approvedThisMonth}
        sub={`${stats.approvedTotal} approved in total`}
      />
      <Tile
        label="Open comments"
        dot="var(--accent)"
        value={stats.openComments}
        sub={stats.openComments ? `On ${stats.ordersWithComments} order${stats.ordersWithComments === 1 ? "" : "s"}` : "All resolved"}
      />
    </div>
  )
}

function Tile({ label, dot, value, sub }: { label: string; dot: string; value: number; sub: string }) {
  return (
    <Card size="sm" className="gap-1 px-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
        {label}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{sub}</p>
    </Card>
  )
}
