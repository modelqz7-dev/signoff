"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpDownIcon, ChevronRightIcon, FileIcon, FileTextIcon, MessageSquareIcon, SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton"
import { STATUS_MAP, type Order, type OrderStatus } from "@/components/dashboard/types"
import type { Pin } from "@/lib/pins"
import { cn, isPdfUrl } from "@/lib/utils"
import { useNow } from "@/lib/use-now"
import { useT } from "@/lib/i18n"

const DAY = 1000 * 60 * 60 * 24
const FILTERS: (OrderStatus | "all")[] = ["all", "await", "changes", "approved", "prod"]
type Sort = "newest" | "deadline"

function formatDate(date: string, now: number, locale: string) {
  const d = new Date(date.length === 10 ? date + "T00:00:00" : date)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString(locale, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) })
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export function OrdersList({
  orders,
  pins,
  onDeleted,
}: {
  orders: Order[]
  pins: Pin[]
  onDeleted: (order: Order) => void
}) {
  const router = useRouter()
  const now = useNow()
  const { t, locale } = useT()
  const [filter, setFilter] = useState<OrderStatus | "all">("all")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<Sort>("newest")

  const openComments = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pins) if (!p.resolved) m.set(p.order_id, (m.get(p.order_id) ?? 0) + 1)
    return m
  }, [pins])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = orders.filter((o) =>
      (filter === "all" || o.status === filter) &&
      (!q || [o.title, o.code, o.client_name, o.client_email].some((v) => v?.toLowerCase().includes(q)))
    )
    if (sort === "deadline") {
      return [...list].sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))
    }
    return list
  }, [orders, filter, query, sort])

  const activeValue = visible
    .filter((o) => o.status === "await" || o.status === "changes")
    .reduce((s, o) => s + (o.value || 0), 0)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/40 p-1">
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
                  active ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f !== "all" && <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_MAP[f].color }} />}
                {f === "all" ? t("All") : t(STATUS_MAP[f].label)}
                <span className="text-muted-foreground">{counts[f] ?? 0}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <InputGroup className="w-64">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t("Search orders or clients")}
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              aria-label={t("Search orders")}
            />
            {query && (
              <InputGroupAddon align="inline-end">
                <button type="button" aria-label={t("Clear search")} onClick={() => setQuery("")} className="hover:text-foreground">
                  <XIcon className="size-3.5" />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
          <Button variant="outline" size="sm" onPress={() => setSort(sort === "newest" ? "deadline" : "newest")}>
            <ArrowUpDownIcon />
            {sort === "newest" ? t("Newest") : t("Deadline")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="gap-0 py-0">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <p className="text-sm text-muted-foreground">{t("No orders match your filters.")}</p>
            <Button variant="ghost" size="sm" onPress={() => { setFilter("all"); setQuery("") }}>
              {t("Clear filters")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{t("Order")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Client")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("Comments")}</TableHead>
                <TableHead>{t("Deadline")}</TableHead>
                <TableHead className="text-right">{t("Value")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("File")}</TableHead>
                <TableHead className="w-20 pr-4"><span className="sr-only">{t("Actions")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((order) => {
                const status = STATUS_MAP[order.status]
                const comments = openComments.get(order.id) ?? 0
                const active = order.status === "await" || order.status === "changes"
                const lateDays = active && order.deadline
                  ? Math.floor((today.getTime() - new Date(order.deadline + "T00:00:00").getTime()) / DAY)
                  : 0
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <TableCell className="max-w-[220px] pl-4">
                      <Link
                        href={`/orders/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-medium text-foreground hover:underline"
                      >
                        {order.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{order.code}</p>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] md:table-cell">
                      <p className="truncate text-foreground">{order.client_name || "—"}</p>
                      {order.client_email && <p className="truncate text-xs text-muted-foreground">{order.client_email}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="border-0 px-2 py-0.5 text-[11px]"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {t(status.label)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {comments > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-1.5 py-0.5 text-xs text-foreground">
                          <MessageSquareIcon className="size-3" />
                          {comments}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {order.deadline ? (
                        <>
                          <p className="text-foreground">{formatDate(order.deadline, now, locale)}</p>
                          {lateDays > 0 && <p className="text-xs text-destructive">{t("{n}d overdue", { n: lateDays })}</p>}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {order.value > 0 ? money(order.value) : <span className="text-xs text-muted-foreground/60">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {order.file_url ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {isPdfUrl(order.file_url) ? <FileTextIcon className="size-3.5" /> : <FileIcon className="size-3.5" />}
                          {isPdfUrl(order.file_url) ? "PDF" : t("Image")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">{t("No file")}</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <DeleteOrderButton order={order} onDeleted={() => onDeleted(order)} />
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        {t("Showing {n} of {total}", { n: visible.length, total: orders.length })}
        {activeValue > 0 && <> · {t("{value} in active orders", { value: money(activeValue) })}</>}
      </p>
    </div>
  )
}
