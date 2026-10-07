"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { BarChart3Icon, CalendarDaysIcon, CheckCircle2Icon, CheckIcon, ChevronRightIcon, CopyIcon, PlusIcon } from "lucide-react"
import { PinOutlineIcon } from "@/components/orders/pins"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useNow } from "@/lib/use-now"
import { useT } from "@/lib/i18n"
import { siteOrigin } from "@/lib/site"
import { cn } from "@/lib/utils"
import type { Pin } from "@/lib/pins"
import { STATUS_MAP, type Order } from "./types"

// The dashboard answers three questions a workshop has every morning: what needs me now,
// who am I waiting on, and what is due soon. Everything else is one quiet row of numbers.

const DAY = 1000 * 60 * 60 * 24
const isActive = (o: Order) => o.status === "await" || o.status === "changes" || o.status === "prod"

function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const deadlineMs = (o: Order) => (o.deadline ? new Date(o.deadline + "T00:00:00").getTime() : null)

/** Days an order has been with the client: since its status last changed, else since it was created. */
const sentDays = (o: Order, now: number) =>
  Math.max(0, Math.floor((startOfDay(now) - startOfDay(new Date(o.status_changed_at ?? o.created_at).getTime())) / DAY))

type Reason = { kind: "overdue" | "changes" | "comments" | "approved"; n?: number }
type MoveItem = { order: Order; reasons: Reason[]; score: number }

export function useToday(orders: Order[], pins: Pin[]) {
  const now = useNow()
  return useMemo(() => {
    const today = startOfDay(now)
    const openByOrder = new Map<string, number>()
    for (const p of pins) if (!p.resolved) openByOrder.set(p.order_id, (openByOrder.get(p.order_id) ?? 0) + 1)

    // What needs the workshop: overdue, changes asked, unread comments, or approved and ready to build.
    const move: MoveItem[] = []
    for (const o of orders) {
      const reasons: Reason[] = []
      const due = deadlineMs(o)
      const overdue = isActive(o) && due !== null && due < today ? Math.round((today - due) / DAY) : 0
      if (overdue > 0) reasons.push({ kind: "overdue", n: overdue })
      if (o.status === "changes") reasons.push({ kind: "changes" })
      const comments = openByOrder.get(o.id) ?? 0
      if (comments && o.status !== "approved" && o.status !== "prod") reasons.push({ kind: "comments", n: comments })
      if (o.status === "approved" && sentDays(o, now) <= 7) reasons.push({ kind: "approved" })
      if (!reasons.length) continue
      const score = (overdue ? 1000 + overdue : 0) + (o.status === "changes" ? 100 : 0) + comments * 10 + (o.status === "approved" ? 1 : 0)
      move.push({ order: o, reasons, score })
    }
    move.sort((a, b) => b.score - a.score)

    // Sent to the client and nothing back yet.
    // (Overdue ones are already under "Your move".)
    const late = new Set(move.filter((m) => m.reasons.some((r) => r.kind === "overdue")).map((m) => m.order.id))
    const waiting = orders
      .filter((o) => o.status === "await" && !openByOrder.get(o.id) && !late.has(o.id))
      .map((o) => ({ order: o, days: sentDays(o, now) }))
      .sort((a, b) => b.days - a.days)

    // Deadlines in the next two weeks, overdue first.
    const soon = orders
      .filter((o) => isActive(o) && deadlineMs(o) !== null && (deadlineMs(o) as number) < today + 14 * DAY)
      .sort((a, b) => (a.deadline as string).localeCompare(b.deadline as string))

    const dueThisWeek = soon.filter((o) => (deadlineMs(o) as number) < today + 7 * DAY).length

    const month = new Date(now)
    const approvedAt = (o: Order) => new Date(o.approved_at ?? o.status_changed_at ?? o.created_at)
    const approved = orders.filter((o) => o.status === "approved" || o.status === "prod")
    const approvedThisMonth = approved.filter((o) => {
      const d = approvedAt(o)
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
    }).length
    const spans = approved.filter((o) => o.approved_at).map((o) => (new Date(o.approved_at as string).getTime() - new Date(o.created_at).getTime()) / DAY)
    const avgToApproval = spans.length ? Math.max(1, Math.round(spans.reduce((s, d) => s + d, 0) / spans.length)) : null
    const active = orders.filter(isActive)

    return {
      now,
      move,
      waiting,
      soon,
      stats: {
        active: active.length,
        inWork: active.reduce((s, o) => s + (o.value || 0), 0),
        approvedThisMonth,
        avgToApproval,
        dueThisWeek,
      },
    }
  }, [orders, pins, now])
}

/** "Good morning, Oak & Dot" and one line saying what the day holds. */
export function Greeting({ name, today, onNewOrder, onCalendar, onStats }: {
  name: string
  today: ReturnType<typeof useToday>
  onNewOrder: () => void
  onCalendar: () => void
  onStats: () => void
}) {
  const { t, locale } = useT()
  const hour = new Date(today.now).getHours()
  const hello = hour < 5 ? t("Good evening") : hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening")
  const date = new Date(today.now).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  const parts = [
    today.move.length ? t("{n} need you", { n: today.move.length }) : null,
    today.waiting.length ? t("{n} waiting on clients", { n: today.waiting.length }) : null,
    today.stats.dueThisWeek ? t("{n} due this week", { n: today.stats.dueThisWeek }) : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-sm font-medium tracking-wide text-muted-foreground first-letter:uppercase" suppressHydrationWarning>{date}</p>
        <h1 className="font-[family-name:var(--font-brand)] text-3xl leading-tight font-bold tracking-[-0.03em] text-foreground sm:text-4xl" suppressHydrationWarning>
          {hello}{name ? `, ${name}` : ""}
        </h1>
        <p className="text-base text-muted-foreground">
          {parts.length ? parts.join(" · ") : t("All caught up. Nothing is waiting on you today.")}
        </p>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
        {[
          { label: t("Calendar"), icon: CalendarDaysIcon, onClick: onCalendar },
          { label: t("Statistics"), icon: BarChart3Icon, onClick: onStats },
        ].map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-card px-3.5 text-base font-medium text-foreground ring-1 ring-foreground/10 transition-colors hover:bg-hover"
          >
            <Icon className="size-4 text-muted-foreground" />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onNewOrder}
          className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium whitespace-nowrap text-primary-foreground transition-opacity hover:opacity-90"
        >
          <PlusIcon className="size-4" />
          {t("New Order")}
        </button>
      </div>
    </div>
  )
}

function Section({ title, description, count, children }: { title: string; description: string; count?: number; children: React.ReactNode }) {
  return (
    <Card size="sm" className="gap-2 px-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          {!!count && <span className="rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">{count}</span>}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 px-1.5">{children}</CardContent>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-5 text-sm text-muted-foreground">
      <CheckCircle2Icon className="size-4 shrink-0 text-[var(--status-approved)]" />
      {children}
    </div>
  )
}

/** One order line: title and client on the left, what's going on with it on the right. */
function OrderRow({ order, children, action }: { order: Order; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="group flex items-center gap-2 rounded-lg transition-colors hover:bg-muted/60">
      <Link href={`/orders/${order.id}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 px-2 py-2.5">
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-base font-medium text-foreground">{order.title}</p>
          <p className="truncate text-sm text-muted-foreground">{order.client_name || "—"} · {order.code}</p>
        </div>
        {children && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{children}</div>}
      </Link>
      {action ?? (
        <Link href={`/orders/${order.id}`} aria-hidden="true" tabIndex={-1} className="pr-2 text-muted-foreground/60 transition-colors group-hover:text-foreground">
          <ChevronRightIcon className="size-4" />
        </Link>
      )}
    </div>
  )
}

function Chip({ tone, children }: { tone: "danger" | "changes" | "neutral" | "approved"; children: React.ReactNode }) {
  const style =
    tone === "changes" ? { backgroundColor: STATUS_MAP.changes.bg, color: STATUS_MAP.changes.color }
    : tone === "approved" ? { backgroundColor: STATUS_MAP.approved.bg, color: STATUS_MAP.approved.color }
    : undefined
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "danger" && "bg-destructive/12 text-destructive",
        tone === "neutral" && "bg-muted text-foreground"
      )}
      style={style}
    >
      {children}
    </span>
  )
}

/** Orders where the next step is the workshop's. */
export function YourMove({ today }: { today: ReturnType<typeof useToday> }) {
  const { t } = useT()
  const [all, setAll] = useState(false)
  const items = all ? today.move : today.move.slice(0, 5)
  return (
    <Section title={t("Your move")} description={t("Clients replied, or something is late. These need you.")} count={today.move.length}>
      {items.length === 0 && <Empty>{t("Nothing needs you right now.")}</Empty>}
      {items.map(({ order, reasons }) => (
        <OrderRow key={order.id} order={order}>
          {reasons.map((r) =>
            r.kind === "overdue" ? <Chip key="o" tone="danger">{t("Overdue {n}d", { n: r.n ?? 0 })}</Chip>
            : r.kind === "changes" ? <Chip key="c" tone="changes">{t("Changes requested")}</Chip>
            : r.kind === "comments" ? <Chip key="m" tone="neutral"><PinOutlineIcon className="size-3" />{r.n === 1 ? t("1 new comment") : t("{n} new comments", { n: r.n ?? 0 })}</Chip>
            : <Chip key="a" tone="approved"><CheckIcon className="size-3" />{t("Approved, ready to go")}</Chip>
          )}
        </OrderRow>
      ))}
      {today.move.length > 5 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mx-2 mt-1 self-start text-sm text-muted-foreground hover:text-foreground">
          {all ? t("Show less") : t("Show all ({n})", { n: today.move.length })}
        </button>
      )}
    </Section>
  )
}

/** Orders sent to the client with nothing back yet, longest wait first, with the link to nudge them. */
export function WaitingOnClients({ today }: { today: ReturnType<typeof useToday> }) {
  const { t } = useT()
  const [copied, setCopied] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const items = all ? today.waiting : today.waiting.slice(0, 5)

  async function copy(order: Order) {
    try {
      await navigator.clipboard.writeText(`${siteOrigin()}/portal/${order.id}`)
      setCopied(order.id)
      window.setTimeout(() => setCopied((id) => (id === order.id ? null : id)), 1800)
    } catch {}
  }

  return (
    <Section title={t("Waiting on clients")} description={t("Sent, no reply yet. Copy the link to remind them.")} count={today.waiting.length}>
      {items.length === 0 && <Empty>{t("No one to chase. Every client has replied.")}</Empty>}
      {items.map(({ order, days }) => (
        <OrderRow
          key={order.id}
          order={order}
          action={
            <button
              type="button"
              onClick={() => copy(order)}
              aria-label={t("Copy portal link")}
              title={t("Copy portal link")}
              className="mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              {copied === order.id ? <CheckIcon className="size-4 text-[var(--status-approved)]" /> : <CopyIcon className="size-4" />}
            </button>
          }
        >
          <span className={cn("text-sm whitespace-nowrap", days >= 3 ? "font-medium text-[var(--status-changes)]" : "text-muted-foreground")}>
            {days === 0 ? t("Sent today") : t("Waiting {n}d", { n: days })}
          </span>
        </OrderRow>
      ))}
      {today.waiting.length > 5 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mx-2 mt-1 self-start text-sm text-muted-foreground hover:text-foreground">
          {all ? t("Show less") : t("Show all ({n})", { n: today.waiting.length })}
        </button>
      )}
    </Section>
  )
}

/** Deadlines in the next two weeks, grouped by day. */
export function ComingUp({ today }: { today: ReturnType<typeof useToday> }) {
  const { t, locale } = useT()
  const start = startOfDay(today.now)
  const groups = new Map<string, Order[]>()
  for (const o of today.soon.slice(0, 8)) {
    const due = deadlineMs(o) as number
    const diff = Math.round((due - start) / DAY)
    const label = diff < 0 ? t("Overdue")
      : diff === 0 ? t("Today")
      : diff === 1 ? t("Tomorrow")
      : new Date(due).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })
    groups.set(label, [...(groups.get(label) ?? []), o])
  }

  return (
    <Section title={t("Coming up")} description={t("Deadlines in the next two weeks.")}>
      {groups.size === 0 && <Empty>{t("No deadlines in the next two weeks.")}</Empty>}
      {[...groups].map(([label, list]) => (
        <div key={label} className="flex flex-col">
          <p className={cn("px-2 pt-2 pb-1 text-xs font-medium tracking-wide uppercase", label === t("Overdue") ? "text-destructive" : "text-muted-foreground")} suppressHydrationWarning>
            {label}
          </p>
          {list.map((o) => {
            const status = STATUS_MAP[o.status]
            return (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="min-w-0 flex-1 truncate text-base text-foreground">{o.title}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{t(status.label)}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </Section>
  )
}

/** The few numbers worth a glance, in one row instead of charts. */
export function StatsStrip({ today }: { today: ReturnType<typeof useToday> }) {
  const { t, locale } = useT()
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  const items = [
    { label: t("Active orders"), value: String(today.stats.active) },
    { label: t("In work"), value: money.format(today.stats.inWork) },
    { label: t("Approved this month"), value: String(today.stats.approvedThisMonth) },
    { label: t("Avg. time to approval"), value: today.stats.avgToApproval === null ? "—" : t("{n}d", { n: today.stats.avgToApproval }) },
  ]
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:grid-cols-4">
      {items.map((s, i) => (
        <div key={s.label} className={cn("flex flex-col gap-1 px-4 py-3.5", i % 2 === 1 && "border-l border-border/60", i >= 2 && "border-t border-border/60 sm:border-t-0", i === 2 && "sm:border-l")}>
          <span className="text-xs text-muted-foreground">{s.label}</span>
          <span className="font-[family-name:var(--font-brand)] text-3xl font-bold tracking-[-0.02em] text-foreground tabular-nums" suppressHydrationWarning>{s.value}</span>
        </div>
      ))}
    </div>
  )
}
