"use client"

import Link from "next/link"
import { AwardIcon, CheckIcon, CopyIcon, UploadIcon } from "lucide-react"
import { STATUS_MAP, type Order } from "@/components/dashboard/types"
import { pinsOfVersion, type Pin } from "@/lib/pins"
import { useNow } from "@/lib/use-now"
import { CommentsIcon } from "@/components/orders/pins"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// The top of an order page: where the order is in its life, and the one thing to do next.

const DAY = 1000 * 60 * 60 * 24

function daysSince(iso: string, now: number) {
  const a = new Date(iso); a.setHours(0, 0, 0, 0)
  const b = new Date(now); b.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / DAY))
}

/** Created → File → Client review → Approved → In work, with dates where we know them. */
export function OrderProgress({ order, pins }: { order: Order; pins: Pin[] }) {
  const { t, locale } = useT()
  const short = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" }) : null)
  const approved = order.status === "approved" || order.status === "prod"
  const reviewed = approved || order.status === "changes" || pins.length > 0
  const steps = [
    { label: t("Created"), done: true, note: short(order.created_at) },
    { label: t("File"), done: !!order.file_url, note: (order.version ?? 1) > 1 ? t("version {n}", { n: order.version ?? 1 }) : null },
    { label: t("Client review"), done: reviewed, note: pins.length ? t("{n} comments", { n: pins.length }) : null },
    { label: t("Approved"), done: approved, note: approved ? short(order.approved_at) : null },
    { label: t("In work"), done: order.status === "prod", note: null },
  ]
  const current = steps.findIndex((s) => !s.done)

  return (
    <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label={t("Order progress")}>
      {steps.map((s, i) => (
        <li key={s.label} className="flex min-w-0 flex-col gap-1.5" aria-current={i === current ? "step" : undefined}>
          <span className={cn("h-1 rounded-full", s.done ? "bg-primary/70" : i === current ? "bg-foreground/25" : "bg-muted")} />
          <span className={cn("text-[11px] leading-tight font-medium break-words sm:truncate sm:text-xs", s.done || i === current ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          {s.note && <span className="-mt-1 hidden truncate text-[11px] text-muted-foreground sm:block" suppressHydrationWarning>{s.note}</span>}
        </li>
      ))}
    </ol>
  )
}

type Props = {
  order: Order
  pins: Pin[]
  /** Open comments the workshop hasn't written in yet. */
  unanswered?: number
  copied: boolean
  uploading: boolean
  certificateHref: string | null
  onCopyLink: () => void
  onUpload: () => void
  onSeeComments: () => void
}

/** One sentence on what is going on with the order, and the button for the next step. */
export function NextStep({ order, pins, unanswered, copied, uploading, certificateHref, onCopyLink, onUpload, onSeeComments }: Props) {
  const { t, locale } = useT()
  const now = useNow()
  // "-" or "—" typed as a placeholder isn't a name.
  const client = order.client_name?.replace(/^[\s\-–—.]+$/, "") || t("The client")
  const open = pinsOfVersion(pins, order.version).filter((p) => !p.resolved).length
  const nextVersion = (order.version ?? 1) + 1

  let tone: "neutral" | "changes" | "approved" = "neutral"
  let title: string
  let text: string
  let action: React.ReactNode = null

  const button = (icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  )

  if (!order.file_url) {
    title = t("Upload the design")
    text = t("Add the design or screenshot, then send the client the portal link.")
    action = button(<UploadIcon className="size-4" />, uploading ? t("Uploading...") : t("Upload PDF or image"), onUpload, uploading)
  } else if (order.status === "changes") {
    tone = "changes"
    title = t("{client} asked for changes", { client })
    text = open
      ? t("Answer the {n} comments right on the pins. If the design itself changed, upload version {v}: the client sees it at the same link.", { n: open, v: nextVersion })
      : t("When the fixes are ready, upload version {v}: the client sees it at the same link.", { v: nextVersion })
    action = button(<UploadIcon className="size-4" />, uploading ? t("Uploading...") : t("Upload version {v}", { v: nextVersion }), onUpload, uploading)
  } else if (order.status === "await" && open > 0 && (unanswered ?? open) > 0) {
    const n = unanswered ?? open
    title = n === 1 ? t("{client} left a comment", { client }) : t("{client} left {n} comments", { client, n })
    text = t("Answer right in each comment: what you changed, with a screenshot if it helps.")
    action = button(<CommentsIcon className="size-4" />, t("Answer"), onSeeComments)
  } else if (order.status === "await" && open > 0) {
    title = t("You answered every comment")
    text = t("{client} sees your answers on the pins. Now it's their move: approve or write back.", { client })
    action = button(copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />, copied ? t("Copied") : t("Copy Link"), onCopyLink)
  } else if (order.status === "await") {
    const days = daysSince(order.status_changed_at ?? order.created_at, now)
    title = t("Waiting on {client}", { client })
    text = days === 0
      ? t("Sent today. Comments and the decision will show up here the moment they arrive.")
      : t("No reply for {n} days. Send the link again as a reminder.", { n: days })
    action = button(copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />, copied ? t("Copied") : t("Copy Link"), onCopyLink)
  } else if (order.status === "approved") {
    tone = "approved"
    const when = order.approved_at ? new Date(order.approved_at).toLocaleDateString(locale, { day: "numeric", month: "long" }) : null
    title = t("Approved, ready to go")
    text = [order.approved_by || client, when, t("version {n}", { n: order.version ?? 1 })].filter(Boolean).join(" · ")
    if (certificateHref) {
      action = (
        <Link href={certificateHref} target="_blank" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
          <AwardIcon className="size-4" />
          {t("Certificate")}
        </Link>
      )
    }
  } else {
    title = t("In implementation")
    text = t("Approved and being built. The approval stays on record with the certificate.")
  }

  const tint = tone === "neutral" ? undefined : { backgroundColor: STATUS_MAP[tone].bg }
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-xl p-4 ring-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6", tone === "neutral" ? "bg-card ring-foreground/10" : "ring-transparent")}
      style={tint}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("Next step")}</p>
        <p className="text-base font-medium text-foreground" style={tone === "neutral" ? undefined : { color: STATUS_MAP[tone].color }}>{title}</p>
        <p className="text-sm text-muted-foreground" suppressHydrationWarning>{text}</p>
      </div>
      {action}
    </div>
  )
}

/** Deadline with how far away it is: "October 8 · in 6 days" or "overdue by 2 days". */
export function useDeadlineText(order: Order | null) {
  const { t, locale } = useT()
  const now = useNow()
  if (!order?.deadline) return { text: "—", late: false }
  const due = new Date(order.deadline + "T00:00:00")
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / DAY)
  const date = due.toLocaleDateString(locale, { day: "numeric", month: "long" })
  const active = order.status === "await" || order.status === "changes" || order.status === "prod"
  if (!active) return { text: date, late: false }
  if (diff < 0) return { text: `${date} · ${t("overdue by {n}d", { n: -diff })}`, late: true }
  if (diff === 0) return { text: `${date} · ${t("today")}`, late: false }
  return { text: `${date} · ${t("in {n}d", { n: diff })}`, late: false }
}
