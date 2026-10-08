"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDaysIcon, CheckCircle2Icon, CheckIcon, CopyIcon, PlusIcon, UploadIcon, WaypointsIcon } from "lucide-react"
import { Thumb } from "@/components/projects/PostBits"
import { STATUS_MAP, type Order } from "@/components/dashboard/types"
import type { Pin } from "@/lib/pins"
import { markLinkShared } from "@/lib/onboarding"
import { siteOrigin } from "@/lib/site"
import { useNow } from "@/lib/use-now"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// Home answers the two questions an SMM person opens it with: how are my clients' projects doing,
// and what do I do now. Projects sit on top as cards; below, what needs me and who I'm waiting on.
// An "item" is anything the client approves: a project's post, or a stand-alone file.

const DAY = 86_400_000
const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime() }
const dayMs = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).getTime() : null)
const isDone = (o: Order) => o.status === "approved" || o.status === "prod"

export type ProjectSummary = {
  project: Order
  posts: Order[]
  approved: number
  changes: number
  waiting: number
  noFile: number
}

type MoveItem = { item: Order; kind: "changes" | "comments" | "upload" | "overdue"; pins: Pin[]; when: number | null }
type WaitItem = { item: Order; days: number }

export function useHome(projects: Order[], items: Order[], pins: Pin[]) {
  const now = useNow()
  return useMemo(() => {
    const today = startOfDay(now)
    const open = new Map<string, Pin[]>()
    for (const p of pins) if (!p.resolved) open.set(p.order_id, [...(open.get(p.order_id) ?? []), p])

    const summaries: ProjectSummary[] = projects.map((project) => {
      const posts = items.filter((o) => o.project_id === project.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const ready = posts.filter((p) => p.file_url)
      const approved = ready.filter(isDone).length
      const changes = ready.filter((p) => p.status === "changes").length
      return { project, posts, approved, changes, waiting: ready.length - approved - changes, noFile: posts.length - ready.length }
    })

    // What's the SMM person's to do: client changes and comments, posts due within a week with no
    // file yet, and stand-alone files past their deadline.
    const move: MoveItem[] = []
    for (const o of items) {
      const opened = open.get(o.id) ?? []
      if (o.file_url && o.status === "changes") move.push({ item: o, kind: "changes", pins: opened, when: null })
      else if (o.file_url && opened.length && !isDone(o)) move.push({ item: o, kind: "comments", pins: opened, when: null })
      else if (!o.file_url && o.kind === "post") {
        const due = dayMs(o.publish_on)
        if (due !== null && due < today + 7 * DAY) move.push({ item: o, kind: "upload", pins: [], when: due })
      } else if (o.kind !== "post" && !isDone(o)) {
        const due = dayMs(o.deadline)
        if (due !== null && due < today) move.push({ item: o, kind: "overdue", pins: [], when: due })
      }
    }
    const rank = { changes: 0, comments: 1, overdue: 2, upload: 3 }
    move.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.when ?? 0) - (b.when ?? 0))

    // Sent and nothing back yet, longest first.
    const moving = new Set(move.map((m) => m.item.id))
    const waiting: WaitItem[] = items
      .filter((o) => o.file_url && o.status === "await" && !moving.has(o.id))
      .map((o) => ({ item: o, days: Math.max(0, Math.round((today - startOfDay(new Date(o.status_changed_at ?? o.created_at).getTime())) / DAY)) }))
      .sort((a, b) => b.days - a.days)

    return { now, summaries, move, waiting, changes: move.filter((m) => m.kind === "changes" || m.kind === "comments").length }
  }, [projects, items, pins, now])
}

type Home = ReturnType<typeof useHome>

/** The date, a hello, one line on what's going on, and the two things to start. */
export function HomeGreeting({ name, home, onCalendar, onNewProject }: { name: string; home: Home; onCalendar: () => void; onNewProject: () => void }) {
  const { t, locale } = useT()
  const hour = new Date(home.now).getHours()
  const hello = hour < 5 ? t("Good evening") : hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening")
  const date = new Date(home.now).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  const parts = [
    home.changes ? t("{n} with changes need you", { n: home.changes }) : null,
    home.waiting.length ? t("{n} waiting on the client", { n: home.waiting.length }) : null,
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-sm text-muted-foreground first-letter:uppercase" suppressHydrationWarning>{date}</p>
        <h1 className="font-[family-name:var(--font-brand)] text-3xl leading-tight font-bold tracking-[-0.03em] sm:text-4xl" suppressHydrationWarning>
          {hello}{name ? `, ${name}` : ""}
        </h1>
        <p className="text-base text-muted-foreground">{parts.length ? parts.join(" · ") : t("All quiet: nothing is waiting on you.")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onCalendar} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-border transition-colors hover:bg-hover">
          <CalendarDaysIcon className="size-4 text-muted-foreground" />
          {t("Calendar")}
        </button>
        <button type="button" onClick={onNewProject} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-opacity hover:opacity-90">
          <PlusIcon className="size-4" />
          {t("New project")}
        </button>
      </div>
    </div>
  )
}

function Heading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
      {children}
      {count !== undefined && <span className="font-normal opacity-70 tabular-nums">{count}</span>}
    </h2>
  )
}

/** Every project as a card: a strip of its posts, and how far the client has got. */
export function ProjectCards({ home, onNewProject }: { home: Home; onNewProject: () => void }) {
  const { t } = useT()
  if (!home.summaries.length) {
    return (
      <section>
        <Heading>{t("Projects")}</Heading>
        <button type="button" onClick={onNewProject} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:bg-hover">
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06]"><WaypointsIcon className="size-5" /></span>
          <span className="font-semibold">{t("Start your first project")}</span>
          <span className="max-w-sm text-sm text-muted-foreground">{t("One project per client: upload the posts, send one link, collect the approvals.")}</span>
        </button>
      </section>
    )
  }
  return (
    <section>
      <Heading count={home.summaries.length}>{t("Projects")}</Heading>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {home.summaries.map((s) => <ProjectCard key={s.project.id} summary={s} />)}
      </div>
    </section>
  )
}

function ProjectCard({ summary: { project, posts, approved, changes, waiting, noFile } }: { summary: ProjectSummary }) {
  const { t } = useT()
  const shown = posts.slice(0, 3)
  const rest = posts.length - shown.length
  const ready = posts.length - noFile
  return (
    <Link href={`/orders/${project.id}`} className="flex flex-col rounded-2xl bg-card p-3.5 ring-1 ring-border transition-colors hover:ring-foreground/20">
      <div className="mb-3.5 flex gap-1.5">
        {shown.map((p) => <Thumb key={p.id} url={p.file_url} className="aspect-[4/5] w-[22%] rounded-md" />)}
        {Array.from({ length: Math.max(0, 3 - shown.length) }, (_, i) => <span key={i} className="aspect-[4/5] w-[22%] rounded-md border border-dashed border-border" />)}
        <span className="flex aspect-[4/5] w-[22%] items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          {rest > 0 ? `+${rest}` : <PlusIcon className="size-3.5" />}
        </span>
      </div>
      <p className="truncate font-semibold">{project.title || t("Untitled")}</p>
      <p className="mb-3 truncate text-sm text-muted-foreground">
        {[project.client_name, t("{n} posts", { n: posts.length })].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-auto flex h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
        {posts.length > 0 && <>
          <span className="bg-[var(--status-approved)]" style={{ width: `${(approved / posts.length) * 100}%` }} />
          <span className="bg-[var(--status-changes)]" style={{ width: `${(changes / posts.length) * 100}%` }} />
        </>}
      </div>
      <p className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {ready === 0 ? t("No posts uploaded yet") : <>
            <span className="text-[var(--status-approved)]">{t("{n} approved", { n: approved })}</span>
            {changes > 0 && <> · <span className="text-[var(--status-changes)]">{t("{n} with changes", { n: changes })}</span></>}
          </>}
        </span>
        <span className="shrink-0">{noFile > 0 ? t("{n} to upload", { n: noFile }) : waiting > 0 ? t("{n} waiting", { n: waiting }) : null}</span>
      </p>
    </Link>
  )
}

/** What the SMM person does next. */
export function YourMoveList({ home, projectName }: { home: Home; projectName: (o: Order) => string }) {
  const { t, locale } = useT()
  const [all, setAll] = useState(false)
  const rows = all ? home.move : home.move.slice(0, 6)
  return (
    <section className="min-w-0">
      <Heading count={home.move.length}>{t("Your move")}</Heading>
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {rows.length === 0 && <Quiet>{t("Nothing needs you right now.")}</Quiet>}
        {rows.map(({ item, kind, pins, when }) => {
          const note =
            kind === "upload" ? t("Goes out {day}, no file yet", { day: new Date(when ?? 0).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }) })
            : kind === "overdue" ? t("Past the deadline")
            : pins.length ? (pins.length > 1 ? t("“{text}” and {n} more", { text: pins[0].title, n: pins.length - 1 }) : `«${pins[0].title}»`)
            : t("The client asked for changes")
          return (
            <Row key={item.id} item={item} sub={`${projectName(item)} · ${note}`}>
              {kind === "upload" ? (
                <span className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-border"><UploadIcon className="size-3.5" />{t("Upload")}</span>
              ) : kind === "overdue" ? (
                <span className="rounded-md bg-destructive/12 px-2 py-0.5 text-xs font-medium text-destructive">{t("Overdue")}</span>
              ) : (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: STATUS_MAP.changes.bg, color: STATUS_MAP.changes.color }}>
                  {kind === "changes" ? t("Changes") : t("Comments")}
                </span>
              )}
            </Row>
          )
        })}
      </div>
      {home.move.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-sm text-muted-foreground hover:text-foreground">
          {all ? t("Show less") : t("Show all {n}", { n: home.move.length })}
        </button>
      )}
    </section>
  )
}

/** Sent to the client, nothing back yet: copy the link to nudge them. */
export function WaitingList({ home, projectName }: { home: Home; projectName: (o: Order) => string }) {
  const { t } = useT()
  const [all, setAll] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const rows = all ? home.waiting : home.waiting.slice(0, 6)
  async function remind(item: Order) {
    try {
      await navigator.clipboard.writeText(`${siteOrigin()}/portal/${item.id}`)
      markLinkShared()
      setCopied(item.id)
      window.setTimeout(() => setCopied((c) => (c === item.id ? null : c)), 2000)
    } catch {}
  }
  return (
    <section className="min-w-0">
      <Heading count={home.waiting.length}>{t("Waiting on the client")}</Heading>
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {rows.length === 0 && <Quiet>{t("No one to chase.")}</Quiet>}
        {rows.map(({ item, days }) => (
          <Row
            key={item.id}
            item={item}
            sub={`${projectName(item)} · ${days === 0 ? t("sent today") : days === 1 ? t("sent yesterday") : t("sent {n} days ago", { n: days })}`}
            action={
              <button
                type="button"
                onClick={() => remind(item)}
                title={t("Copy the client link to remind them")}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-border transition-colors hover:bg-hover", copied === item.id && "text-[var(--status-approved)]")}
              >
                {copied === item.id ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                {copied === item.id ? t("Copied") : t("Remind")}
              </button>
            }
          />
        ))}
      </div>
      {home.waiting.length > 6 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-sm text-muted-foreground hover:text-foreground">
          {all ? t("Show less") : t("Show all {n}", { n: home.waiting.length })}
        </button>
      )}
    </section>
  )
}

function Row({ item, sub, children, action }: { item: Order; sub: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-3.5 py-2.5 first:border-t-0">
      <Link href={`/orders/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Thumb url={item.file_url} className="h-11 w-9 shrink-0 rounded-md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        </span>
        {children}
      </Link>
      {action}
    </div>
  )
}

function Quiet({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
      <CheckCircle2Icon className="size-4 shrink-0 text-[var(--status-approved)]" />
      {children}
    </p>
  )
}
