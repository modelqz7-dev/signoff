"use client"

import Link from "next/link"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Order } from "./types"
import { STATUS_MAP } from "./types"

type OrdersListModalProps = {
  orders: Order[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function OrdersListModal({ orders, open, onOpenChange }: OrdersListModalProps) {
  if (!open) return null

  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[420px] h-[420px] [&>[data-slot=dialog]]:flex [&>[data-slot=dialog]]:flex-col [&>[data-slot=dialog]]:min-h-0"
    >
      <DialogHeader>
        <DialogTitle>All Orders ({orders.length})</DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 min-h-0">
        <div className="flex flex-col gap-1.5 pb-2">
          {orders.map((order) => {
            const status = STATUS_MAP[order.status]
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 text-left transition-colors hover:bg-white/[.03]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{order.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.client_name} &middot; {timeAgo(order.created_at)}
                    {order.value > 0 && <span> &middot; ${order.value.toLocaleString()}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {order.file_url ? (
                    <span className="text-[11px] text-[#4e99a3]">PDF</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/40">No file</span>
                  )}
                  <Badge
                    variant="secondary"
                    className="border-0 text-[11px] px-2 py-0.5"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.label}
                  </Badge>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5 text-muted-foreground/50" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </Dialog>
  )
}
