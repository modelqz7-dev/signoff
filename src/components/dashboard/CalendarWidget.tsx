"use client"

import { useMemo } from "react"
import { today, getLocalTimeZone } from "@internationalized/date"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import type { Order } from "./types"

type CalendarWidgetProps = {
  orders: Order[]
}

export function CalendarWidget({ orders }: CalendarWidgetProps) {
  const todayDate = today(getLocalTimeZone())

  const orderDates = useMemo(() => {
    const dates = new Set<string>()
    orders.forEach((o) => {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      dates.add(key)
    })
    return dates
  }, [orders])

  return (
    <Card size="sm">
      <CardContent className="p-1">
        <Calendar
          captionLayout="dropdown"
          defaultValue={todayDate}
          className="w-full"
          renderCell={(renderProps) => {
            const dateStr = renderProps.date
              ? `${renderProps.date.year}-${String(renderProps.date.month).padStart(2, "0")}-${String(renderProps.date.day).padStart(2, "0")}`
              : ""
            const hasOrder = orderDates.has(dateStr)
            return (
              <div className="flex flex-col items-center">
                {renderProps.defaultChildren}
                {hasOrder && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#4e99a3]" />
                )}
              </div>
            )
          }}
        />
      </CardContent>
    </Card>
  )
}
