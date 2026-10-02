"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpDownIcon, ChevronRightIcon, FileIcon, FileTextIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton"
import { PinOutlineIcon } from "@/components/orders/pins"
import { STATUS_MAP, STATUS_SHADE, type Order, type OrderStatus } from "@/components/dashboard/types"
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label={t("Status")} className="-mx-4 flex gap-5 overflow-x-auto border-b border-border/60 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                role="tab"
                onClick={() => setFilter(f)}
                aria-selected={active}
                className={cn(
                  "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-sm whitespace-nowrap transition-colors",
                  active ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? t("All") : t(STATUS_MAP[f].label)}
                <span className="text-xs text-muted-foreground tabular-nums">{counts[f] ?? 0}</span>
              </button>
            )
          })}
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <InputGroup className="min-w-0 flex-1 sm:w-64 sm:flex-none">
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
          <Button variant="outline" size="sm" className="shrink-0" onPress={() => setSort(sort === "newest" ? "deadline" : "newest")}>
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
          <>
          {/* Phones: one compact card per order */}
          <ul className="divide-y divide-border sm:hidden">
            {visible.map((order) => {
              const comments = openComments.get(order.id) ?? 0
              const active = order.status === "await" || order.status === "changes"
              const lateDays = active && order.deadline
                ? Math.floor((today.getTime() - new Date(order.deadline + "T00:00:00").getTime()) / DAY)
                : 0
              return (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-hover">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{order.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[order.client_name, order.code].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <StatusChip status={order.status} />
                        {comments > 0 && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <PinOutlineIcon className="size-3" />
                            {comments}
                          </span>
                        )}
                        {order.deadline && (
                          <span className={lateDays > 0 ? "text-destructive" : "text-muted-foreground"}>
                            {lateDays > 0 ? t("{n}d overdue", { n: lateDays }) : formatDate(order.deadline, now, locale)}
                          </span>
                        )}
                      </div>
                    </div>
                    {order.value > 0 && <span className="shrink-0 text-sm tabular-nums text-foreground">{money(order.value)}</span>}
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              )
            })}
          </ul>

          <Table className="hidden sm:table">
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
                const comments = openComments.get(order.id) ?? 0
                const active = order.status === "await" || order.status === "changes"
                const lateDays = active && order.deadline
                  ? Math.floor((today.getTime() - new Date(order.deadline + "T00:00:00").getTime()) / DAY)
                  : 0
                return (
                  <TableRow
                    key={order.id}
                    className="group cursor-pointer"
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
                      <StatusChip status={order.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {comments > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground tabular-nums">
                          <PinOutlineIcon className="size-3.5" />
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
                        {/* delete only shows on the row you're pointing at */}
                        <span className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                          <DeleteOrderButton order={order} onDeleted={() => onDeleted(order)} />
                        </span>
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        {t("Showing {n} of {total}", { n: visible.length, total: orders.length })}
        {activeValue > 0 && <> · {t("{value} in active orders", { value: money(activeValue) })}</>}
      </p>
    </div>
  )
}

/** Status as a quiet label with a dot: darker the earlier the order is in its life. */
function StatusChip({ status }: { status: OrderStatus }) {
  const { t } = useT()
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-foreground">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_SHADE[status] }} />
      {t(STATUS_MAP[status].label)}
    </span>
  )
}
