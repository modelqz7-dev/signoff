"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Order } from "./types"
import { STATUS_MAP } from "./types"

type RecentOrdersProps = {
  orders: Order[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Deterministic color from string
function initialsColor(name: string): string {
  const colors = [
    "#8a8783",
    "#c09a5a",
    "#5a9c6a",
    "#9a6ab0",
    "#c07a6a",
    "#6a8fc0",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const recent = orders.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardAction>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {recent.length === 0 && (
          <p className="text-sm text-muted-foreground">No orders yet</p>
        )}
        {recent.map((order) => {
          const status = STATUS_MAP[order.status]
          const color = initialsColor(order.client_name)
          return (
            <div
              key={order.id}
              className="flex items-center gap-3"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-medium"
                style={{ backgroundColor: color + "1a", color }}
              >
                {getInitials(order.client_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {order.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {order.client_name}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 border-0"
                style={{
                  backgroundColor: status.bg,
                  color: status.color,
                }}
              >
                {status.label}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
