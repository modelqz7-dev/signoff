"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NewOrderModal } from "./NewOrderModal"
import { OrdersListModal } from "@/components/dashboard/OrdersListModal"
import type { Order } from "./types"
import { STATUS_MAP } from "./types"
import { useT } from "@/lib/i18n"
import { useNow } from "@/lib/use-now"
import { timeAgo } from "@/lib/utils"

type QuickOrderCardProps = {
  orders: Order[]
  shopId: string
  onOrderCreated?: (order: Order) => void
  onOrderUpdated?: (order: Order) => void
}


export function QuickOrderCard({ orders, shopId, onOrderCreated, onOrderUpdated }: QuickOrderCardProps) {
  const [newModalOpen, setNewModalOpen] = useState(false)
  const { t } = useT()
  const now = useNow()
  const [listModalOpen, setListModalOpen] = useState(false)
  const preview = orders.slice(0, 3)
  const hasOrders = preview.length > 0
  const hasMore = orders.length > 3

  return (
    <>
      <Card className="h-full min-h-[260px] flex flex-col p-4">
        {/* + New Order — fills remaining space, always centered */}
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-[#4e99a3]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border/60 transition-colors hover:border-[#4e99a3]/50">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" strokeLinecap="round">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </div>
            <span className="text-xs font-medium">{t("New Order")}</span>
          </button>
        </div>

        {/* Recent orders — only rendered when orders exist */}
        {hasOrders && (
          <div className="border-t border-border/40 pt-2.5">
            <div className="flex flex-col gap-1">
              {preview.map((order) => {
                const status = STATUS_MAP[order.status]
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[.04]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{order.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{order.client_name} &middot; {timeAgo(order.created_at, now, t)}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 border-0 text-[10px] px-1.5 py-0"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {t(status.label)}
                    </Badge>
                  </Link>
                )
              })}
              {hasMore && (
                <button
                  onClick={() => setListModalOpen(true)}
                  className="text-xs text-[#4e99a3] hover:text-foreground transition-colors text-center py-1"
                >
                  {t("See more ({n})", { n: orders.length - 3 })}
                </button>
              )}
            </div>
          </div>
        )}

        {/* No orders — small hint under the + button */}
        {!hasOrders && (
          <p className="text-[11px] text-muted-foreground/60 text-center pb-1">{t("No orders yet")}</p>
        )}
      </Card>

      <NewOrderModal
        shopId={shopId}
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onCreated={onOrderCreated}
      />

      <OrdersListModal
        orders={orders}
        open={listModalOpen}
        onOpenChange={setListModalOpen}
      />
    </>
  )
}
