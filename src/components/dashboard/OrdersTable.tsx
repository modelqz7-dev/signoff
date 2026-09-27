"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Order, OrderStatus } from "./types"
import { STATUS_MAP } from "./types"

type OrdersTableProps = {
  orders: Order[]
}

type FilterTab = "all" | OrderStatus

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "await", label: "Awaiting" },
  { value: "changes", label: "Changes" },
  { value: "approved", label: "Approved" },
  { value: "prod", label: "Production" },
]

function formatAge(createdAt: string): string {
  const now = Date.now()
  const created = new Date(createdAt).getTime()
  const diffMs = now - created
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "1 day"
  if (diffDays < 30) return `${diffDays} days`
  const months = Math.floor(diffDays / 30)
  if (months === 1) return "1 month"
  return `${months} months`
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all")

  const filtered = useMemo(() => {
    if (activeTab === "all") return orders
    return orders.filter((o) => o.status === activeTab)
  }, [orders, activeTab])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>ID</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No orders found
                </TableCell>
              </TableRow>
            )}
            {filtered.map((order) => {
              const status = STATUS_MAP[order.status]
              return (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {shortId(order.id)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {order.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.client_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatValue(order.value)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="border-0"
                      style={{
                        backgroundColor: status.bg,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatAge(order.created_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
