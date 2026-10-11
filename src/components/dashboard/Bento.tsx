"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRightIcon, CheckCircle2Icon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ImagePlusIcon, PlusIcon,
} from "lucide-react"
import { Thumb } from "@/components/projects/PostBits"
import { ProjectCards, WaitingList, YourMoveList, type Home } from "@/components/dashboard/Home"
import type { Order } from "@/components/dashboard/types"
import { projectColor } from "@/lib/project-color"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// The home page, after Apple's Human Interface Guidelines: grouped cards on a quiet page, content
// before decoration, one blue accent for actions and Apple's system colours for states. Left, the
// month (like Apple Calendar) and the one thing to do now; right, the week of posts by where each
// one stands; below, the statuses (they filter the week), approvals this week and the projects.

const DAY = 86_400_000
const isDone = (o: Order) => o.status === "approved" || o.status === "prod"
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const mondayOf = (d: Date) => { const s = startOfDay(d); return new Date(s.getFullYear(), s.getMonth(), s.getDate() - ((s.getDay() + 6) % 7)) }
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** The day an item is for: a post's publishing day, a file's deadline. */
const itemDay = (o: Order) => (o.publish_on || o.deadline || "").slice(0, 10) || null

type Lane = "changes" | "waiting" | "nofile" | "approved"
const LANES: Lane[] = ["changes", "waiting", "nofile", "approved"]
const LANE_LABEL: Record<Lane, string> = { changes: "With changes", waiting: "Waiting on the client", nofile: "No file yet", approved: "Approved posts" }
/** Apple's system colours for the stages. */
const LANE_COLOR: Record<Lane, string> = { changes: "#ff9500", waiting: "#8e8e93", nofile: "#c7c7cc", approved: "#34c759" }
/** Apple Calendar marks today in red. */
const TODAY_RED = "#ff3b30"
type View = "week" | "projects" | "list"

export function BentoHome({ home, projects, items, projectName, onNewProject, onCalendar, intro }: {
  home: Home
  /** Shown on top of the list view: the getting-started steps. */
  intro?: React.ReactNode
  projects: Order[]
  items: Order[]
  projectName: (o: Order) => string
  onNewProject: () => void
  onCalendar: () => void
}) {
  const { t, locale } = useT()
  const today = startOfDay(new Date(home.now))
  const [week, setWeek] = useState(() => mondayOf(today))
  const [project, setProject] = useState<string | null>(null)
  const [lanes, setLanes] = useState<Set<Lane>>(() => new Set(LANES))
  const [view, setView] = useState<View>("week")

  const lane = (o: Order): Lane =>
    !o.file_url ? "nofile" : o.status === "changes" || (home.open.get(o.id)?.length && !isDone(o)) ? "changes" : isDone(o) ? "approved" : "waiting"

  const visible = useMemo(() => items.filter((o) => !project || o.project_id === project), [items, project])

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
          projects={projects}
          project={project}
          onProject={setProject}
          today={today}
          lane={lane}
          onPickDay={(d) => { setWeek(mondayOf(d)); setView("week") }}
          onExpand={onCalendar}
        />
        <NowCard home={home} projectName={projectName} onNewProject={onNewProject} />
      </div>

      {/* right: the week */}
      <Card className="flex min-h-[520px] flex-col p-5 lg:col-span-2 lg:min-h-0">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">{monthTitle(addDays(week, 3), locale)}</h1>
          <Segmented
            className="order-last col-span-2 justify-self-center sm:order-none sm:col-span-1"
            value={view}
            onChange={setView}
            options={[["week", t("Week")], ["projects", t("Projects")], ["list", t("List")]]}
          />
          <div className="flex items-center justify-self-end gap-1">
            <button type="button" aria-label={t("Previous week")} onClick={() => setWeek(addDays(week, -7))} className="flex size-8 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronLeftIcon className="size-5" /></button>
            <button type="button" onClick={() => setWeek(mondayOf(today))} className="rounded-full px-2.5 py-1 text-[13px] font-medium text-primary hover:bg-hover">{t("Today")}</button>
            <button type="button" aria-label={t("Next week")} onClick={() => setWeek(addDays(week, 7))} className="flex size-8 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronRightIcon className="size-5" /></button>
            <button type="button" onClick={onNewProject} className="ml-2 flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <PlusIcon className="size-4" />{t("New project")}
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          {view === "week" && <WeekGrid week={week} today={today} items={visible} lanes={lanes} lane={lane} projectName={projectName} />}
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

/** The month, as in Apple Calendar: plain numbers, today in a red circle, a dot under days with posts. */
function MonthCard({ items, projects, project, onProject, today, lane, onPickDay, onExpand }: {
  items: Order[]
  projects: Order[]
  project: string | null
  onProject: (id: string | null) => void
  today: Date
  lane: (o: Order) => Lane
  onPickDay: (d: Date) => void
  onExpand: () => void
}) {
  const { t, locale } = useT()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const byDay = useMemo(() => {
    const m = new Map<string, Order[]>()
    for (const o of items) { const d = itemDay(o); if (d) m.set(d, [...(m.get(d) ?? []), o]) }
    return m
  }, [items])
  const lead = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1)
  const weekdays = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(today), i).toLocaleDateString(locale, { weekday: "narrow" }))

  return (
    <Card className="flex flex-1 flex-col">
      <div className="flex items-center gap-1">
        <h2 className="flex-1 text-[15px] font-semibold tracking-[-0.01em]">{monthTitle(month, locale)}</h2>
        <button type="button" aria-label={t("Previous month")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-7 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronLeftIcon className="size-4" /></button>
        <button type="button" aria-label={t("Next month")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-7 items-center justify-center rounded-full text-primary hover:bg-hover"><ChevronRightIcon className="size-4" /></button>
        <button type="button" onClick={onExpand} aria-label={t("Open the calendar")} className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-hover hover:text-foreground"><ArrowUpRightIcon className="size-4" /></button>
      </div>

      {projects.length > 0 && (
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          {[{ id: null as string | null, label: t("All") }, ...projects.slice(0, 8).map((p) => ({ id: p.id as string | null, label: p.client_name || p.title || t("Untitled") }))].map((c) => (
            <button key={c.id ?? "all"} type="button" onClick={() => onProject(c.id)}
              className={cn("shrink-0 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap transition-colors",
                project === c.id ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-hover-strong")}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-7 text-center">
        {weekdays.map((w, i) => <span key={i} className="pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase">{w}</span>)}
        {cells.map((n, i) => {
          if (n < 1 || n > days) return <span key={i} />
          const d = new Date(month.getFullYear(), month.getMonth(), n)
          const list = byDay.get(dayKey(d)) ?? []
          const isToday = d.getTime() === today.getTime()
          const changes = list.some((o) => lane(o) === "changes")
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPickDay(d)}
              title={list.length ? t("{n} posts", { n: list.length }) : undefined}
              className="group flex flex-col items-center py-0.5"
            >
              <span
                className={cn("flex size-8 items-center justify-center rounded-full text-[14px] tabular-nums transition-colors", isToday ? "font-semibold text-white" : "group-hover:bg-hover")}
                style={isToday ? { backgroundColor: TODAY_RED } : undefined}
              >
                {n}
              </span>
              <span className="mt-0.5 size-1 rounded-full" style={{ backgroundColor: list.length ? (changes ? LANE_COLOR.changes : "var(--muted-foreground)") : "transparent" }} />
            </button>
          )
        })}
      </div>
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
        <p className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: LANE_COLOR.approved }}><CheckCircle2Icon className="size-4" />{t("All quiet")}</p>
        <p className="mt-1.5 text-[17px] leading-snug font-semibold tracking-[-0.01em]">{t("Nothing needs you. Start the next client?")}</p>
        <button type="button" onClick={onNewProject} className="mt-3 rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90">{t("New project")}</button>
      </Card>
    )
  }
  const label = next.kind === "upload" ? t("No file") : next.kind === "overdue" ? t("Overdue") : next.pins.length > 1 ? t("{n} comments", { n: next.pins.length }) : t("Changes")
  return (
    <Card>
      <p className="flex items-center justify-between gap-2 text-[13px]">
        <span className="font-medium" style={{ color: next.kind === "overdue" ? TODAY_RED : LANE_COLOR.changes }}>{label}</span>
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
function WeekGrid({ week, today, items, lanes, lane, projectName }: {
  week: Date
  today: Date
  items: Order[]
  lanes: Set<Lane>
  lane: (o: Order) => Lane
  projectName: (o: Order) => string
}) {
  const { t, locale } = useT()
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const shown = LANES.filter((l) => lanes.has(l))
  const cell = new Map<string, Order[]>()
  for (const o of items) {
    const d = itemDay(o)
    if (!d) continue
    const k = `${d}|${lane(o)}`
    cell.set(k, [...(cell.get(k) ?? []), o])
  }
  const empty = days.every((d) => shown.every((l) => !cell.get(`${dayKey(d)}|${l}`)?.length))

  return (
    <div className="min-w-[800px]">
      <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] gap-x-2">
        <span />
        {days.map((d) => {
          const isToday = d.getTime() === today.getTime()
          return (
            <div key={d.getTime()} className="flex flex-col items-center pb-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">{d.toLocaleDateString(locale, { weekday: "short" })}</span>
              <span
                className={cn("mt-1 flex size-8 items-center justify-center rounded-full text-[17px] tabular-nums", isToday ? "font-semibold text-white" : "font-medium")}
                style={isToday ? { backgroundColor: TODAY_RED } : undefined}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
        {shown.map((l) => (
          <Row key={l} lane={l} label={t(LANE_LABEL[l])}>
            {days.map((d) => {
              const list = cell.get(`${dayKey(d)}|${l}`) ?? []
              return (
                <div key={d.getTime()} className="flex min-w-0 flex-col gap-2 border-t border-border py-2.5">
                  {list.map((o) => <PostCard key={o.id} item={o} lane={l} projectName={projectName(o)} />)}
                </div>
              )
            })}
          </Row>
        ))}
      </div>
      {empty && <p className="pt-6 text-center text-[13px] text-muted-foreground">{t("Nothing goes out this week. Posts show up here on their publishing day.")}</p>}
    </div>
  )
}

function Row({ lane, label, children }: { lane: Lane; label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="flex items-start gap-1.5 border-t border-border pt-3 text-[11px] leading-tight font-medium text-muted-foreground">
        <span className="mt-[3px] size-1.5 shrink-0 rounded-full" style={{ backgroundColor: LANE_COLOR[lane] }} />
        {label}
      </span>
      {children}
    </>
  )
}

/** A post on the week: its picture, its project as a coloured dot, its title. */
function PostCard({ item, lane, projectName }: { item: Order; lane: Lane; projectName: string }) {
  const { t } = useT()
  const color = item.project_id ? projectColor(item.project_id) : "#8e8e93"
  const href = `/orders/${lane === "nofile" && item.project_id ? item.project_id : item.id}`
  return (
    <Link href={href} className="block overflow-hidden rounded-xl bg-background transition-colors hover:bg-hover-strong">
      {lane === "nofile" ? (
        <span className="m-1.5 flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground">
          <ImagePlusIcon className="size-4" />{t("Add the file")}
        </span>
      ) : (
        <Thumb url={item.file_url} className="h-16 w-full" />
      )}
      <span className="block px-2.5 pt-1.5 pb-2">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate">{projectName}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug font-semibold">{item.title}</span>
      </span>
    </Link>
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
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: LANE_COLOR[l] }} />
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

/** The projects as an Apple list: a coloured dot, the name, approved of all, a chevron. */
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
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: projectColor(project.id) }} />
            <span className="flex-1 truncate">{project.title || t("Untitled")}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{approved}/{posts.length}</span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
          </Link>
        ))}
      </div>
    </Card>
  )
}
