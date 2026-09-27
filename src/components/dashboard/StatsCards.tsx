"use client"

import { useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import type { Order } from "./types"

type StatsCardsProps = {
  orders: Order[]
  variant: "times" | "month"
}

export function StatsCards({ orders, variant }: StatsCardsProps) {
  if (variant === "times") {
    return <AverageTimesCard orders={orders} />
  }
  return <ThisMonthCard orders={orders} />
}

function AverageTimesCard({ orders }: { orders: Order[] }) {
  const { avgDays, longestDays } = useMemo(() => {
    const now = Date.now()
    const pending = orders.filter(
      (o) => o.status === "await" || o.status === "changes"
    )

    if (pending.length === 0) {
      return { avgDays: 0, longestDays: 0 }
    }

    const waitDays = pending.map((o) => {
      const created = new Date(o.created_at).getTime()
      return (now - created) / (1000 * 60 * 60 * 24)
    })

    const avg = waitDays.reduce((s, d) => s + d, 0) / waitDays.length
    const longest = Math.max(...waitDays)

    return {
      avgDays: Math.round(avg * 10) / 10,
      longestDays: Math.round(longest * 10) / 10,
    }
  }, [orders])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Average Times</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {avgDays}
            </span>
            <span className="text-xs text-muted-foreground">
              Avg wait (days)
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {longestDays}
            </span>
            <span className="text-xs text-muted-foreground">
              Longest wait (days)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ThisMonthCard({ orders }: { orders: Order[] }) {
  const { approvedCount, changesCount } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const thisMonth = orders.filter((o) => {
      const d = new Date(o.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    })

    return {
      approvedCount: thisMonth.filter((o) => o.status === "approved").length,
      changesCount: thisMonth.filter((o) => o.status === "changes").length,
    }
  }, [orders])

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "#5a9c6a" }}
            >
              {approvedCount}
            </span>
            <span className="text-xs text-muted-foreground">Approved</span>
          </div>
          <div className="flex flex-col gap-1">
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "#c09a5a" }}
            >
              {changesCount}
            </span>
            <span className="text-xs text-muted-foreground">Changes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
