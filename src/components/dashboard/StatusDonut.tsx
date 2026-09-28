"use client"

import { useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import type { Order, OrderStatus } from "./types"
import { STATUS_MAP } from "./types"
import { useT } from "@/lib/i18n"

type StatusDonutProps = {
  orders: Order[]
}

const STATUS_KEYS: OrderStatus[] = ["await", "changes", "approved", "prod"]

// Resolved colors for SVG (can't use CSS vars in stroke-dasharray calc, but can in stroke)
const DONUT_COLORS: Record<OrderStatus, string> = {
  await: "#4e99a3",
  changes: "#c09a5a",
  approved: "#5a9c6a",
  prod: "#8a8987",
}

export function StatusDonut({ orders }: StatusDonutProps) {
  const { t } = useT()
  const counts = useMemo(() => {
    const map: Record<OrderStatus, number> = {
      await: 0,
      changes: 0,
      approved: 0,
      prod: 0,
    }
    orders.forEach((o) => {
      if (o.status in map) {
        map[o.status]++
      }
    })
    return map
  }, [orders])

  const total = Object.values(counts).reduce((s, c) => s + c, 0)

  // Build SVG arcs using stroke-dasharray on circles
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeWidth = 10

  const segments = useMemo(() => {
    if (total === 0) return []

    let offset = 0
    return STATUS_KEYS.filter((k) => counts[k] > 0).map((key) => {
      const fraction = counts[key] / total
      const dashLength = fraction * circumference
      const gap = circumference - dashLength
      const rotation = (offset / total) * 360 - 90

      offset += counts[key]

      return {
        key,
        color: DONUT_COLORS[key],
        dasharray: `${dashLength} ${gap}`,
        rotation,
      }
    })
  }, [counts, total, circumference])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{t("Status Breakdown")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Donut */}
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.dasharray}
                strokeLinecap="butt"
                transform={`rotate(${seg.rotation} 50 50)`}
              />
            ))}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold text-foreground">
              {total}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 w-full">
          {STATUS_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: DONUT_COLORS[key] }}
              />
              <span className="text-xs text-muted-foreground flex-1">
                {t(STATUS_MAP[key].label)}
              </span>
              <span className="text-xs font-medium text-foreground">
                {counts[key]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
