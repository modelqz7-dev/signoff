"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CheckIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, timeAgo } from "@/lib/utils"
import { useNow } from "@/lib/use-now"
import type { Pin } from "@/lib/pins"
import type { Order } from "./types"
import { useT } from "@/lib/i18n"

/** Latest comments clients left in the portal, across all orders; updates live. */
export function ClientActivity({ orders, pins }: { orders: Order[]; pins: Pin[] }) {
  const now = useNow(30_000)
  const { t } = useT()
  const titles = useMemo(() => new Map(orders.map((o) => [o.id, o.title])), [orders])
  const recent = pins.slice(0, 6)

  return (
    <Card size="sm" className="px-1">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm">{t("Client activity")}</CardTitle>
          <CardDescription className="text-xs">{t("Comments from the client portal")}</CardDescription>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-4 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-chart-4" />
          </span>
          {t("Live")}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 px-1.5">
        {recent.length === 0 && (
          <p className="px-2 py-6 text-xs text-muted-foreground">
            {t("No comments yet. Share a portal link and client comments will show up here instantly.")}
          </p>
        )}
        {recent.map((pin) => (
          <Link
            key={pin.id}
            href={`/orders/${pin.order_id}`}
            className={cn("flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60", pin.resolved && "opacity-50")}
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              {pin.resolved ? <CheckIcon className="size-3" /> : (pin.author_name[0] || "?").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{pin.author_name}</span> {t("on")}{" "}
                <span className="text-foreground">{titles.get(pin.order_id) ?? t("an order")}</span>
              </p>
              <p className={cn("truncate text-xs text-foreground", pin.resolved && "line-through")}>{pin.title}</p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(pin.created_at, now, t)}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
