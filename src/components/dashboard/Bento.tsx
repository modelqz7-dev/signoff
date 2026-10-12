"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2Icon, ChevronDownIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ImagePlusIcon, PlusIcon, XIcon,
} from "lucide-react"
import { Thumb } from "@/components/projects/PostBits"
import { ProjectCards, WaitingList, YourMoveList, type Home } from "@/components/dashboard/Home"
import type { Order } from "@/components/dashboard/types"
import { ProjectAvatar } from "@/components/ProjectAvatar"
import { PlanPosts } from "@/components/dashboard/PlanPosts"
import { PostDialog, PostMenu, updatePost } from "@/components/projects/PostTools"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// The home page, after Apple's Human Interface Guidelines: grouped cards on a quiet page, content
// before decoration, one monochrome accent for actions and Apple's system colours for states. Left, the
// month (like Apple Calendar) and the one thing to do now; right, the week of posts by where each
// one stands; below, the statuses (they filter the week), approvals this week and the projects.

const DAY = 86_400_000
const isDone = (o: Order) => o.status === "approved" || o.status === "prod"
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const mondayOf = (d: Date) => { const s = startOfDay(d); return new Date(s.getFullYear(), s.getMonth(), s.getDate() - ((s.getDay() + 6) % 7)) }
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** The day an item is for: a post's publishing day, a file's deadline. */
const fromKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d) }
const MAX_PICKED = 7
/** Height of a day in the month, so the line between picked days can find their circles. */
const ROW = 42
const itemDay = (o: Order) => (o.publish_on || o.deadline || "").slice(0, 10) || null

type Lane = "changes" | "waiting" | "nofile" | "approved"
const LANES: Lane[] = ["changes", "waiting", "nofile", "approved"]
const LANE_LABEL: Record<Lane, string> = { changes: "With changes", waiting: "Waiting on the client", nofile: "No file yet", approved: "Approved posts" }
/**
 * A stage's mark, in grey like the rest of the app: told apart by shape, not colour. Changes is a
 * solid dot, waiting a grey one, no file an empty ring, approved a ticked disc.
 */
function LaneMark({ lane, className }: { lane: Lane; className?: string }) {
  if (lane === "approved") {
    return <span className={cn("flex size-3 shrink-0 items-center justify-center rounded-full bg-foreground text-background", className)}><CheckIcon className="size-2" strokeWidth={4} /></span>
  }
  return (
    <span className={cn("flex size-3 shrink-0 items-center justify-center", className)}>
      <span className={cn("size-2 rounded-full", lane === "changes" ? "bg-foreground" : lane === "waiting" ? "bg-muted-foreground" : "ring-[1.5px] ring-muted-foreground ring-inset")} />
    </span>
  )
}
type View = "week" | "projects" | "list"

export function BentoHome({ home, projects, items, projectName, onNewProject, onPlanned, onPostChanged, onPostDeleted, intro }: {
  home: Home
  /** Shown on top of the list view: the getting-started steps. */
  intro?: React.ReactNode
  projects: Order[]
  items: Order[]
  projectName: (o: Order) => string
  onNewProject: () => void
  /** Posts (and maybe their new project) just planned on the picked days. */
  onPlanned: (rows: Order[]) => void
  /** A post edited or deleted from its "⋯" on the week. */
  onPostChanged: (post: Order) => void
  onPostDeleted: (id: string) => void
}) {
  const { t, locale } = useT()
  const today = startOfDay(new Date(home.now))
  const [week, setWeek] = useState(() => mondayOf(today))
  const [lanes, setLanes] = useState<Set<Lane>>(() => new Set(LANES))
  const [view, setView] = useState<View>("week")
  // days picked in the month, in the order they were tapped (at most a week's worth); while there are
  // any, the big card shows just those days side by side
  const [picked, setPicked] = useState<string[]>([])
  const [editing, setEditing] = useState<Order | null>(null)
  const pickedDays = [...picked].sort().map(fromKey)
  const shownDays = pickedDays.length ? pickedDays : Array.from({ length: 7 }, (_, i) => addDays(week, i))
  // pick (on), unpick (off) or flip a day
  const pickDay = (d: Date, on?: boolean) => {
    const k = dayKey(d)
    setPicked((p) => ((on ?? !p.includes(k)) ? (p.includes(k) ? p : [...p, k].slice(-MAX_PICKED)) : p.filter((x) => x !== k)))
    setView("week")
  }

  const lane = (o: Order): Lane =>
    !o.file_url ? "nofile" : o.status === "changes" || (home.open.get(o.id)?.length && !isDone(o)) ? "changes" : isDone(o) ? "approved" : "waiting"

  const visible = items

  const counts = useMemo(() => {
    const c: Record<Lane, number> = { changes: 0, waiting: 0, nofile: 0, approved: 0 }
    for (const o of visible) c[lane(o)]++
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lane reads home.open, which visible already follows
  }, [visible, home.open])

  return (
    // starts right at the rail, no wider than 1600px (a very wide screen keeps the spare room on the
    // right), and a low screen scrolls instead of squashing the cards
    <div className="grid w-full gap-3 p-3 lg:min-h-dvh lg:grid-cols-[clamp(280px,18vw,360px)_minmax(0,1.6fr)_minmax(0,1fr)] lg:grid-rows-[minmax(540px,1fr)_minmax(300px,34vh)]">
      {/* left: the month, and the one thing to do now */}
      <div className="flex min-h-0 flex-col gap-3">
        <MonthCard
          items={visible}
          today={today}
          lane={lane}
          picked={picked}
          onPickDay={pickDay}
        />
        <NowCard home={home} projectName={projectName} onNewProject={onNewProject} />
      </div>

      {/* right: the week */}
      <Card className="flex min-h-[520px] flex-col p-5 lg:col-span-2 lg:min-h-0">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">{monthTitle(pickedDays[0] ?? addDays(week, 3), locale)}</h1>
          <Segmented
            className="order-last col-span-2 justify-self-center sm:order-none sm:col-span-1"
            value={view}
            onChange={setView}
            options={[["week", t("Week")], ["projects", t("Projects")], ["list", t("List")]]}
          />
          <div className="flex items-center justify-self-end gap-1">
            {picked.length > 0 ? (<>
              <PlanPosts days={pickedDays} projects={projects} items={items} onPlanned={onPlanned} />
              <button type="button" onClick={() => setPicked([])} className="flex h-8 items-center gap-1.5 rounded-full bg-muted pr-2.5 pl-3 text-[13px] font-medium hover:bg-hover-strong">
                {t("{n} days picked", { n: picked.length })}<XIcon className="size-3.5 text-muted-foreground" />
              </button>
            </>) : <>
            <button type="button" aria-label={t("Previous week")} onClick={() => setWeek(addDays(week, -7))} className="flex size-8 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronLeftIcon className="size-5" /></button>
            <button type="button" onClick={() => setWeek(mondayOf(today))} className="rounded-full px-2.5 py-1 text-[13px] font-medium text-primary hover:bg-hover">{t("Today")}</button>
            <button type="button" aria-label={t("Next week")} onClick={() => setWeek(addDays(week, 7))} className="flex size-8 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronRightIcon className="size-5" /></button>
            </>}
            {/* while days are picked, "Plan posts" takes the one primary spot */}
            {!picked.length && (
              <button type="button" onClick={onNewProject} className="ml-2 flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
                <PlusIcon className="size-4" />{t("New project")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          {view === "week" && <WeekGrid days={shownDays} isWeek={!pickedDays.length} today={today} items={visible} lanes={lanes} lane={lane} projectName={projectName} onEdit={setEditing} onDeleted={onPostDeleted} />}
          {view === "projects" && <ProjectCards home={home} onNewProject={onNewProject} />}
          {view === "list" && (
            <div className="grid gap-6 xl:grid-cols-2">
              {intro && <div className="xl:col-span-2">{intro}</div>}
              <YourMoveList home={home} projectName={projectName} />
              <WaitingList home={home} projectName={projectName} />
            </div>
          )}
        </div>
      </Card>

      {/* bottom: statuses (they filter the week), approvals this week, projects; on computers they
          join the page grid under the month, under the week (two thirds) and the rest */}
      <div className="grid gap-3 lg:contents">
        <StatusCard counts={counts} lanes={lanes} onLanes={setLanes} />
        <ApprovalsCard items={items} today={today} />
        <ProjectsCard home={home} onNewProject={onNewProject} />
      </div>

      <PostDialog open={!!editing} post={editing} number={1} onClose={() => setEditing(null)}
        onSave={async (draft) => { if (editing) { await updatePost(editing, draft); onPostChanged({ ...editing, ...draft }) } }} />
    </div>
  )
}

/** "October 2026" (with a capital, as a title). */
function monthTitle(d: Date, locale: string) {
  const month = d.toLocaleDateString(locale, { month: "long" })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${d.getFullYear()}`
}

/** A grouped card: white on the grey page (dark grey on black), no decoration. */
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl bg-card p-4 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]", className)}>
      {children}
    </section>
  )
}

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  )
}

/** Apple's segmented control. */
function Segmented<V extends string>({ value, onChange, options, className }: {
  value: V
  onChange: (v: V) => void
  options: [V, string][]
  className?: string
}) {
  return (
    <div role="tablist" className={cn("flex rounded-[9px] bg-muted p-0.5", className)}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-[7px] px-4 py-1 text-[13px] font-medium transition-colors",
            value === v ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:bg-[#636366]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * The month, as in Apple Calendar: plain numbers, today ringed, a dot under days with posts. Tapping
 * days, or pressing and dragging across them, picks them: the picked days are drawn as one liquid
 * shape, blobs joined in the order they were picked, melting into each other (an SVG "goo" filter:
 * blur, then a hard alpha threshold).
 */
function MonthCard({ items, today, lane, picked, onPickDay }: {
  items: Order[]
  today: Date
  lane: (o: Order) => Lane
  picked: string[]
  onPickDay: (d: Date, on?: boolean) => void
}) {
  const { t, locale } = useT()
  const goo = useId()
  // while the pointer is down: true picks the days it passes over, false unpicks them
  const drag = useRef<boolean | null>(null)
  useEffect(() => {
    const stop = () => { drag.current = null }
    window.addEventListener("pointerup", stop)
    window.addEventListener("pointercancel", stop)
    return () => { window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop) }
  }, [])
  const dragOver = (e: React.PointerEvent) => {
    if (drag.current === null) return
    const k = (document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-day]") as HTMLElement | null)?.dataset.day
    if (k && picked.includes(k) !== drag.current) onPickDay(fromKey(k), drag.current)
  }
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [choosing, setChoosing] = useState(false)
  const byDay = useMemo(() => {
    const m = new Map<string, Order[]>()
    for (const o of items) { const d = itemDay(o); if (d) m.set(d, [...(m.get(d) ?? []), o]) }
    return m
  }, [items])
  const lead = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1)
  const weekdays = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(today), i).toLocaleDateString(locale, { weekday: "narrow" }))
  // the cells of the picked days in this month, in the order they were picked, joined pairwise
  const at = picked.map(fromKey)
    .filter((d) => d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth())
    .map((d) => d.getDate() - 1 + lead)
  const links = at.slice(1).map((b, i) => [at[i], b] as const)

  return (
    <Card className="flex flex-1 flex-col">
      <div className="flex items-center gap-1">
        {/* the title opens a month and year picker in place of the days */}
        <button type="button" onClick={() => setChoosing((v) => !v)} aria-expanded={choosing}
          className="-ml-1.5 flex flex-1 items-center gap-1 rounded-lg px-1.5 py-0.5 text-left text-[15px] font-semibold tracking-[-0.01em] hover:bg-hover">
          {choosing ? month.getFullYear() : monthTitle(month, locale)}
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform duration-200", choosing && "rotate-180")} />
        </button>
        <button type="button" aria-label={choosing ? t("Previous year") : t("Previous month")} onClick={() => setMonth(new Date(month.getFullYear() - (choosing ? 1 : 0), month.getMonth() - (choosing ? 0 : 1), 1))} className="flex size-7 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronLeftIcon className="size-4" /></button>
        <button type="button" aria-label={choosing ? t("Next year") : t("Next month")} onClick={() => setMonth(new Date(month.getFullYear() + (choosing ? 1 : 0), month.getMonth() + (choosing ? 0 : 1), 1))} className="flex size-7 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronRightIcon className="size-4" /></button>
      </div>

      {choosing ? (
        <div className="mt-4 grid grid-cols-3 gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          {Array.from({ length: 12 }, (_, m) => {
            const d = new Date(month.getFullYear(), m, 1)
            const on = m === month.getMonth()
            const now = m === today.getMonth() && month.getFullYear() === today.getFullYear()
            return (
              <button key={m} type="button" onClick={() => { setMonth(d); setChoosing(false) }}
                className={cn("rounded-xl py-3 text-[13.5px] font-medium capitalize transition-colors",
                  on ? "bg-foreground text-background" : cn("hover:bg-hover", now && "ring-[1.5px] ring-foreground ring-inset"))}>
                {d.toLocaleDateString(locale, { month: "short" }).replace(".", "")}
              </button>
            )
          })}
          <button type="button" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setChoosing(false) }}
            className="col-span-3 mt-1 rounded-xl py-2 text-[13px] font-medium text-muted-foreground hover:bg-hover hover:text-foreground">
            {t("Today")}
          </button>
        </div>
      ) : <>
      <div className="mt-3 grid grid-cols-7 text-center">
        {weekdays.map((w, i) => <span key={i} className="pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase">{w}</span>)}
      </div>
      <div className="relative grid touch-none grid-cols-7 text-center select-none" onPointerMove={dragOver}>
        {/* the picked days as one liquid shape, under the numbers: each cell is ROW px tall, its circle
            centred 18px down; the line between two days grows, and the blur and threshold melt it in */}
        <svg className="pointer-events-none absolute inset-0 size-full overflow-visible text-foreground" aria-hidden>
          <defs>
            <filter id={goo} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
          </defs>
          <g filter={`url(#${goo})`} fill="currentColor">
            {links.map(([a, b]) => (
              <line
                key={`${a}-${b}`}
                x1={`${((a % 7) + 0.5) * (100 / 7)}%`} y1={Math.floor(a / 7) * ROW + 18}
                x2={`${((b % 7) + 0.5) * (100 / 7)}%`} y2={Math.floor(b / 7) * ROW + 18}
                stroke="currentColor" strokeWidth={12} strokeLinecap="round" pathLength={1}
                className="animate-[draw-line_380ms_cubic-bezier(0.4,0,0.2,1)_both] [stroke-dasharray:1]"
              />
            ))}
            {at.map((a) => (
              <circle key={a} cx={`${((a % 7) + 0.5) * (100 / 7)}%`} cy={Math.floor(a / 7) * ROW + 18} r={18}
                className="origin-center animate-[goo-pop_300ms_cubic-bezier(0.34,1.56,0.64,1)_both] [transform-box:fill-box]" />
            ))}
          </g>
        </svg>
        {cells.map((n, i) => {
          if (n < 1 || n > days) return <span key={i} />
          const d = new Date(month.getFullYear(), month.getMonth(), n)
          const list = byDay.get(dayKey(d)) ?? []
          const isToday = d.getTime() === today.getTime()
          const on = picked.includes(dayKey(d))
          const changes = list.some((o) => lane(o) === "changes")
          return (
            <button
              key={i}
              type="button"
              data-day={dayKey(d)}
              onPointerDown={(e) => { if (e.button !== 0) return; drag.current = !on; onPickDay(d, !on) }}
              onClick={(e) => { if (e.detail === 0) onPickDay(d) }}
              aria-pressed={on}
              title={list.length ? t("{n} posts", { n: list.length }) : undefined}
              className="group relative flex flex-col items-center pt-0.5"
              style={{ height: ROW }}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[14px] tabular-nums transition-[background-color,color,transform] duration-200",
                  // unpicked days are opaque, so the line passes under them
                  on ? "font-semibold text-background" : cn("bg-card group-hover:bg-muted", isToday && "font-semibold ring-[1.5px] ring-foreground ring-inset")
                )}
              >
                {n}
              </span>
              <span className="mt-0.5 size-1 rounded-full" style={{ backgroundColor: list.length && !on ? (changes ? "var(--foreground)" : "var(--muted-foreground)") : "transparent" }} />
            </button>
          )
        })}
      </div>
      </>}
    </Card>
  )
}

/** The one thing to do now, or a quiet "all done". */
function NowCard({ home, projectName, onNewProject }: { home: Home; projectName: (o: Order) => string; onNewProject: () => void }) {
  const { t, locale } = useT()
  const [skip, setSkip] = useState(0)
  const next = home.move[skip % Math.max(1, home.move.length)]
  if (!next) {
    return (
      <Card>
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground"><CheckCircle2Icon className="size-4" />{t("All quiet")}</p>
        <p className="mt-1.5 text-[17px] leading-snug font-semibold tracking-[-0.01em]">{t("Nothing needs you. Start the next client?")}</p>
        <button type="button" onClick={onNewProject} className="mt-3 rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90">{t("New project")}</button>
      </Card>
    )
  }
  const label = next.kind === "upload" ? t("No file") : next.kind === "overdue" ? t("Overdue") : next.pins.length > 1 ? t("{n} comments", { n: next.pins.length }) : t("Changes")
  return (
    <Card>
      <p className="flex items-center justify-between gap-2 text-[13px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="truncate text-muted-foreground">{projectName(next.item)}</span>
      </p>
      <p className="mt-1.5 text-[17px] leading-snug font-semibold tracking-[-0.01em]">
        {next.kind === "upload"
          ? t("“{title}” goes out {day}", { title: next.item.title, day: new Date(next.when ?? 0).toLocaleDateString(locale, { weekday: "short", day: "numeric" }) })
          : next.kind === "overdue" ? t("“{title}” is past its deadline", { title: next.item.title })
          : t("Changes asked in “{title}”", { title: next.item.title })}
      </p>
      {next.pins[0] && <p className="mt-1 truncate text-[13px] text-muted-foreground">«{next.pins[0].title}»</p>}
      <div className="mt-3 flex items-center gap-3">
        <Link href={`/orders/${next.item.project_id ?? next.item.id}`} className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90">{t("Open")}</Link>
        {home.move.length > 1 && <button type="button" onClick={() => setSkip((n) => n + 1)} className="text-[13px] font-medium text-primary hover:opacity-80">{t("Later")}</button>}
      </div>
    </Card>
  )
}

/** The week: a column per day, a row per stage, every post as a small card. */
function WeekGrid({ days, isWeek, today, items, lanes, lane, projectName, onEdit, onDeleted }: {
  onEdit: (post: Order) => void
  onDeleted: (id: string) => void
  days: Date[]
  /** A whole week, rather than days picked in the month. */
  isWeek: boolean
  today: Date
  items: Order[]
  lanes: Set<Lane>
  lane: (o: Order) => Lane
  projectName: (o: Order) => string
}) {
  const { t, locale } = useT()
  const picked = LANES.filter((l) => lanes.has(l))
  const cell = new Map<string, Order[]>()
  for (const o of items) {
    const d = itemDay(o)
    if (!d) continue
    const k = `${d}|${lane(o)}`
    cell.set(k, [...(cell.get(k) ?? []), o])
  }
  // a stage shows only when it has posts this week, so the week isn't a stack of empty strips
  const count = (l: Lane) => days.reduce((n, d) => n + (cell.get(`${dayKey(d)}|${l}`)?.length ?? 0), 0)
  const shown = picked.filter((l) => count(l) > 0)
  const empty = shown.length === 0

  return (
    <div style={{ minWidth: days.length * 112 }}>
      <div className="grid gap-x-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d) => {
          const isToday = d.getTime() === today.getTime()
          return (
            <div key={d.getTime()} className="flex flex-col items-center pb-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">{d.toLocaleDateString(locale, { weekday: "short" })}</span>
              <span
                className={cn("mt-1 flex size-8 items-center justify-center rounded-full text-[17px] tabular-nums", isToday ? "bg-foreground font-semibold text-background" : "font-medium")}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
        {shown.map((l) => (
          <Row key={l} lane={l} label={t(LANE_LABEL[l])} count={count(l)}>
            {days.map((d) => {
              const list = cell.get(`${dayKey(d)}|${l}`) ?? []
              return (
                <div key={d.getTime()} className="flex min-w-0 flex-col gap-2 pb-1">
                  {list.map((o) => <PostCard key={o.id} item={o} lane={l} projectName={projectName(o)} onEdit={() => onEdit(o)} onDeleted={() => onDeleted(o.id)} />)}
                </div>
              )
            })}
          </Row>
        ))}
      </div>
      {empty && <p className="pt-6 text-center text-[13px] text-muted-foreground">{isWeek ? t("Nothing goes out this week. Posts show up here on their publishing day.") : t("No posts on these days.")}</p>}
    </div>
  )
}

/** A stage of the week: its name over the whole width, like a section in Apple's lists, then the days. */
function Row({ lane, label, count, children }: { lane: Lane; label: string; count: number; children: React.ReactNode }) {
  return (
    <>
      <div className="col-span-full flex items-center gap-2 border-t border-border pt-3 pb-2 text-[12px] font-semibold whitespace-nowrap">
        <LaneMark lane={lane} />
        {label}
        <span className="font-medium text-muted-foreground tabular-nums">{count}</span>
      </div>
      {children}
    </>
  )
}

/** A post on the week: its picture, its project's face, its title. */
function PostCard({ item, lane, projectName, onEdit, onDeleted }: { item: Order; lane: Lane; projectName: string; onEdit: () => void; onDeleted: () => void }) {
  const { t } = useT()
  const href = `/orders/${lane === "nofile" && item.project_id ? item.project_id : item.id}`
  return (
    <div className="group relative">
    <PostMenu post={item} onEdit={onEdit} onDeleted={onDeleted}
      className="!absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 max-lg:opacity-100" />
    <Link href={href} className="block overflow-hidden rounded-xl bg-muted transition-colors hover:bg-foreground/[0.12]">
      {lane === "nofile" ? (
        <span className="m-1.5 flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground">
          <ImagePlusIcon className="size-4" />{t("Add the file")}
        </span>
      ) : (
        <Thumb url={item.file_url} className="h-16 w-full" />
      )}
      <span className="block px-2.5 pt-1.5 pb-2">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {item.project_id && <ProjectAvatar id={item.project_id} className="size-4" />}
          <span className="truncate">{projectName}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug font-semibold">{item.title}</span>
      </span>
    </Link>
    </div>
  )
}

/** The stages as an Apple list: a coloured dot, the name, the count, a checkmark when shown. */
function StatusCard({ counts, lanes, onLanes }: { counts: Record<Lane, number>; lanes: Set<Lane>; onLanes: (l: Set<Lane>) => void }) {
  const { t } = useT()
  const toggle = (l: Lane) => {
    const next = new Set(lanes)
    if (next.has(l)) next.delete(l)
    else next.add(l)
    if (next.size) onLanes(next)
  }
  return (
    <Card className="flex flex-col">
      <CardTitle>{t("Statuses")}</CardTitle>
      <div className="mt-2 flex flex-col">
        {LANES.map((l) => (
          <button
            key={l}
            type="button"
            role="checkbox"
            aria-checked={lanes.has(l)}
            onClick={() => toggle(l)}
            className="flex items-center gap-2.5 border-b border-border py-2.5 text-left text-[14px] last:border-b-0"
          >
            <LaneMark lane={l} />
            <span className="flex-1">{t(LANE_LABEL[l])}</span>
            <span className="text-muted-foreground tabular-nums">{counts[l]}</span>
            <CheckIcon className={cn("size-4 text-primary", !lanes.has(l) && "invisible")} strokeWidth={2.5} />
          </button>
        ))}
      </div>
    </Card>
  )
}

/** Approvals per day this week, as in Apple's Health charts: the picked day in blue, the rest grey. */
function ApprovalsCard({ items, today }: { items: Order[]; today: Date }) {
  const { t, locale } = useT()
  const week = mondayOf(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const data = days.map((d) => {
    const k = dayKey(d)
    return {
      d,
      approved: items.filter((o) => o.approved_at && dayKey(new Date(o.approved_at)) === k).length,
      uploaded: items.filter((o) => o.file_url && dayKey(new Date(o.created_at)) === k).length,
    }
  })
  const todayIndex = Math.round((today.getTime() - week.getTime()) / DAY)
  const [hover, setHover] = useState<number | null>(null)
  const at = hover ?? todayIndex
  // an even scale in four steps, tight above the highest bar
  const step = Math.max(1, Math.ceil(Math.max(...data.map((x) => Math.max(x.approved, x.uploaded))) / 4))
  const top = step * 4
  const ticks = [top, step * 3, step * 2, step, 0]
  const total = data.reduce((s, x) => s + x.approved, 0)
  const picked = data[at]

  return (
    <Card className="flex min-h-[240px] flex-col">
      <CardTitle>{t("Approvals this week")}</CardTitle>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {picked ? <>{picked.d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" })}: {t("{n} approved", { n: picked.approved })} · {t("{n} uploaded", { n: picked.uploaded })}</> : null}
        <span className="float-right">{t("Total")}: <span className="font-semibold text-foreground">{total}</span></span>
      </p>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_22px] gap-2">
        <div className="relative flex items-end gap-2 pb-5" onMouseLeave={() => setHover(null)}>
          {ticks.map((_, i) => (
            <span key={i} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-border" style={{ bottom: `calc(20px + ${(1 - i / (ticks.length - 1)) * 100}% - ${(1 - i / (ticks.length - 1)) * 20}px)` }} />
          ))}
          {data.map((x, i) => {
            const on = i === at
            const h = Math.max(3, (x.uploaded / top) * 100)
            const ah = x.uploaded ? (Math.min(x.approved, x.uploaded) / x.uploaded) * 100 : 0
            return (
              <div key={i} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
                {/* the bar is what was uploaded that day; its solid lower part, what got approved */}
                <div className={cn("relative mx-auto w-[70%] max-w-12 overflow-hidden rounded-[5px] transition-colors", on ? "bg-primary/30" : "bg-foreground/[0.08]")} style={{ height: `${h}%` }}>
                  <div className={cn("absolute inset-x-0 bottom-0", on ? "bg-primary" : "bg-foreground/25")} style={{ height: `${ah}%` }} />
                </div>
                <span className={cn("absolute inset-x-0 -bottom-5 text-center text-[11px]", on ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {x.d.toLocaleDateString(locale, { weekday: "narrow" })}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex flex-col justify-between pb-5 text-right text-[11px] leading-none text-muted-foreground">
          {ticks.map((v, i) => <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{v}</span>)}
        </div>
      </div>
    </Card>
  )
}

/** The projects as an Apple list: its face, the name, approved of all, a chevron. */
function ProjectsCard({ home, onNewProject }: { home: Home; onNewProject: () => void }) {
  const { t } = useT()
  return (
    <Card className="flex flex-col">
      <CardTitle action={<button type="button" onClick={onNewProject} aria-label={t("New project")} className="flex size-7 items-center justify-center rounded-full text-primary hover:bg-hover"><PlusIcon className="size-5" /></button>}>
        {t("Projects")}
      </CardTitle>
      <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {home.summaries.length === 0 && <p className="py-3 text-[14px] text-muted-foreground">{t("No projects yet.")}</p>}
        {home.summaries.map(({ project, posts, approved }) => (
          <Link key={project.id} href={`/orders/${project.id}`} className="flex items-center gap-2.5 border-b border-border py-2.5 text-[14px] last:border-b-0 hover:opacity-80">
            <ProjectAvatar id={project.id} className="size-7" />
            <span className="flex-1 truncate">{project.title || t("Untitled")}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{approved}/{posts.length}</span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
          </Link>
        ))}
      </div>
    </Card>
  )
}
