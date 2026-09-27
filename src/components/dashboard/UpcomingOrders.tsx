"use client"

import { useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import type { Order } from "./types"
import { STATUS_MAP } from "./types"

type UpcomingOrdersProps = {
  orders: Order[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function UpcomingOrders({ orders }: UpcomingOrdersProps) {
  const pending = useMemo(() => {
    return orders
      .filter((o) => o.status === "await" || o.status === "changes")
      .slice(0, 5)
  }, [orders])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Upcoming</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {pending.length === 0 && (
          <p className="text-xs text-muted-foreground">No pending orders</p>
        )}
        {pending.map((order) => {
          const status = STATUS_MAP[order.status]
          return (
            <div key={order.id} className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {order.title}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDate(order.created_at)}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
