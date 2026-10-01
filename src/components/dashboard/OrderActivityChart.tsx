"use client"

import { useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, CartesianGrid } from "recharts"
import type { Order } from "./types"
import { useT } from "@/lib/i18n"

const chartConfig = {
  thisWeek: {
    label: "This week",
    color: "var(--chart-1)",
  },
  lastWeek: {
    label: "Last week",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const DAY_LABELS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

type OrderActivityChartProps = {
  orders: Order[]
}

export function OrderActivityChart({ orders }: OrderActivityChartProps) {
  const { t, lang } = useT()
  const days = lang === "ru" ? DAY_LABELS_RU : DAY_LABELS
  const config = {
    thisWeek: { ...chartConfig.thisWeek, label: t("This week") },
    lastWeek: { ...chartConfig.lastWeek, label: t("Last week") },
  } satisfies ChartConfig
  const { chartData, percentChange } = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dayOfWeek = today.getDay()

    // Start of this week (Monday)
    const startOfThisWeek = new Date(today)
    startOfThisWeek.setDate(
      today.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1)
    )

    // Start of last week
    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)

    const data = Array.from({ length: 7 }, (_, i) => {
      const thisWeekDay = new Date(startOfThisWeek)
      thisWeekDay.setDate(startOfThisWeek.getDate() + i)

      const lastWeekDay = new Date(startOfLastWeek)
      lastWeekDay.setDate(startOfLastWeek.getDate() + i)

      const thisWeekCount = orders.filter((o) => {
        const d = new Date(o.created_at)
        return (
          d.getFullYear() === thisWeekDay.getFullYear() &&
          d.getMonth() === thisWeekDay.getMonth() &&
          d.getDate() === thisWeekDay.getDate()
        )
      }).length

      const lastWeekCount = orders.filter((o) => {
        const d = new Date(o.created_at)
        return (
          d.getFullYear() === lastWeekDay.getFullYear() &&
          d.getMonth() === lastWeekDay.getMonth() &&
          d.getDate() === lastWeekDay.getDate()
        )
      }).length

      return {
        day: days[(1 + i) % 7], // Monday = index 0
        thisWeek: thisWeekCount,
        lastWeek: lastWeekCount,
      }
    })

    const totalThisWeek = data.reduce((s, d) => s + d.thisWeek, 0)
    const totalLastWeek = data.reduce((s, d) => s + d.lastWeek, 0)
    const pct =
      totalLastWeek === 0
        ? totalThisWeek > 0
          ? 100
          : 0
        : Math.round(
            ((totalThisWeek - totalLastWeek) / totalLastWeek) * 100
          )

    return { chartData: data, percentChange: pct }
  }, [orders, days])

  const isUp = percentChange >= 0

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>{t("Order Activity")}</CardTitle>
          <CardDescription>{t("New orders this week vs last week")}</CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs whitespace-nowrap text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: "var(--chart-1)" }} />
            {t("This week")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: "var(--chart-3)" }} />
            {t("Last week")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[200px] w-full">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="thisWeek"
              fill="var(--color-thisWeek)"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="lastWeek"
              fill="var(--color-lastWeek)"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="gap-2 text-sm">
        <span
          className="inline-flex items-center gap-1 font-medium"
          style={{ color: isUp ? "var(--status-approved)" : "var(--destructive)" }}
        >
          {isUp ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M7 3V11M7 11L3.5 7.5M7 11L10.5 7.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {Math.abs(percentChange)}%
        </span>
        <span className="text-muted-foreground">{t("vs last week")}</span>
      </CardFooter>
    </Card>
  )
}
