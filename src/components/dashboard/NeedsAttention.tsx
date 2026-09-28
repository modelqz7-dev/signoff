"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CheckCircle2Icon, MessageSquareIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNow } from "@/lib/use-now"
import type { Pin } from "@/lib/pins"
import { STATUS_MAP, type Order } from "./types"

const DAY = 1000 * 60 * 60 * 24

type Item = { order: Order; overdueDays: number; changes: boolean; comments: number; score: number }

/** Orders that wait on the shop: overdue, changes requested, or open client comments. */
export function NeedsAttention({ orders, pins }: { orders: Order[]; pins: Pin[] }) {
  const now = useNow()

  const items = useMemo(() => {
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const openByOrder = new Map<string, number>()
    for (const p of pins) if (!p.resolved) openByOrder.set(p.order_id, (openByOrder.get(p.order_id) ?? 0) + 1)

    const list: Item[] = []
    for (const order of orders) {
      const active = order.status === "await" || order.status === "changes"
      const overdueDays = active && order.deadline
        ? Math.floor((today.getTime() - new Date(order.deadline + "T00:00:00").getTime()) / DAY)
        : 0
      const changes = order.status === "changes"
      const comments = openByOrder.get(order.id) ?? 0
      if (overdueDays <= 0 && !changes && !comments) continue
      list.push({ order, overdueDays: Math.max(overdueDays, 0), changes, comments, score: (overdueDays > 0 ? 100 : 0) + (changes ? 10 : 0) + comments })
    }
    return list.sort((a, b) => b.score - a.score).slice(0, 5)
  }, [orders, pins, now])

  return (
    <Card size="sm" className="px-1">
      <CardHeader>
        <CardTitle className="text-sm">Needs attention</CardTitle>
        <CardDescription className="text-xs">Orders waiting on you</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 px-1.5">
        {items.length === 0 && (
          <div className="flex items-center gap-2 px-2 py-6 text-xs text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-chart-4" />
            All caught up — nothing needs your attention.
          </div>
        )}
        {items.map(({ order, overdueDays, changes, comments }) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{order.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{order.client_name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {overdueDays > 0 && (
                <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive">
                  Overdue {overdueDays}d
                </span>
              )}
              {changes && (
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px]"
                  style={{ backgroundColor: STATUS_MAP.changes.bg, color: STATUS_MAP.changes.color }}
                >
                  Changes
                </span>
              )}
              {comments > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] text-foreground">
                  <MessageSquareIcon className="size-3" />
                  {comments}
                </span>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
