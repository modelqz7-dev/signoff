"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, BarChart3Icon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
  ImagePlusIcon, PencilIcon, PlusIcon, SearchIcon, ZapIcon,
} from "lucide-react"
import { Thumb } from "@/components/projects/PostBits"
import { ProjectCards, WaitingList, YourMoveList, type Home } from "@/components/dashboard/Home"
import type { Order } from "@/components/dashboard/types"
import { projectColor } from "@/lib/project-color"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// The home page as a bento, after the reference design the user chose: dark tiles around one big
// white panel. Left, the month and the one thing to do now; right, the week of posts by where each
// one stands; below, the statuses (they filter the week), approvals this week and the projects.
// The tiles stay dark and the panel stays white in both themes.

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
  const [query, setQuery] = useState("")

  const lane = (o: Order): Lane =>
    !o.file_url ? "nofile" : o.status === "changes" || (home.open.get(o.id)?.length && !isDone(o)) ? "changes" : isDone(o) ? "approved" : "waiting"

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => items.filter((o) =>
    (!project || o.project_id === project) &&
    (!q || `${o.title} ${projectName(o)} ${o.client_name ?? ""}`.toLowerCase().includes(q))
  ), [items, project, q, projectName])

  const counts = useMemo(() => {
    const c: Record<Lane, number> = { changes: 0, waiting: 0, nofile: 0, approved: 0 }
    for (const o of visible) c[lane(o)]++
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lane reads home.open, which visible already follows
  }, [visible, home.open])

  return (
    // fills the screen, but no wider than 1680px (tiles stretched across a big monitor go flat) and
    // no shorter than its content needs: a low screen scrolls instead of squashing the tiles
    <div className="mx-auto grid w-full max-w-[1680px] gap-2.5 p-2.5 lg:min-h-dvh lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[minmax(560px,1fr)_minmax(260px,auto)]">
      {/* left: the month, and the one thing to do now */}
      <div className="flex min-h-0 flex-col gap-2.5">
        <MonthTile
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

      {/* right: the week, always on a white sheet */}
      <section className="surface-light flex min-h-[520px] min-w-0 flex-col rounded-[22px] bg-white p-4 text-[#151515] sm:p-5 lg:min-h-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-[family-name:var(--font-brand)] text-[22px] font-bold tracking-[-0.03em] first-letter:uppercase">
            {addDays(week, 3).toLocaleDateString(locale, { month: "long", year: "numeric" })}
          </h1>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={t("Previous week")} onClick={() => setWeek(addDays(week, -7))} className="flex size-7 items-center justify-center rounded-full hover:bg-black/5"><ChevronLeftIcon className="size-4" /></button>
            <button type="button" onClick={() => setWeek(mondayOf(today))} className="rounded-full px-2 py-1 text-xs font-semibold hover:bg-black/5">{t("This week")}</button>
            <button type="button" aria-label={t("Next week")} onClick={() => setWeek(addDays(week, 7))} className="flex size-7 items-center justify-center rounded-full hover:bg-black/5"><ChevronRightIcon className="size-4" /></button>
          </div>
          <div role="tablist" className="flex rounded-full bg-[#f1f1f1] p-[3px] sm:mx-auto">
            {(["week", "projects", "list"] as View[]).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={cn("rounded-full px-4 py-1.5 text-xs font-semibold transition-colors", view === v ? "bg-[#121212] text-white" : "text-[#3a3a3a] hover:text-black")}>
                {v === "week" ? t("Week") : v === "projects" ? t("Projects") : t("List")}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <label className="flex h-8 w-full max-w-xs items-center gap-2 rounded-full bg-[#f4f4f4] px-3 text-xs">
            <SearchIcon className="size-3.5 shrink-0 text-[#9a9a9a]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Find a post, project or client…")} className="w-full bg-transparent outline-none placeholder:text-[#9a9a9a]" />
          </label>
          <button type="button" onClick={onNewProject} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#fdc019] px-3.5 text-xs font-bold text-[#151515] transition-transform hover:scale-[1.03]">
            <PlusIcon className="size-3.5" />{t("New project")}
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          {view === "week" && <WeekGrid week={week} today={today} items={visible} lanes={lanes} lane={lane} projectName={projectName} projects={projects} />}
          {view === "projects" && <div className="pt-1"><ProjectCards home={home} onNewProject={onNewProject} /></div>}
          {view === "list" && (
            <div className="surface-light grid gap-6 pt-1 xl:grid-cols-2">
              {intro && <div className="xl:col-span-2">{intro}</div>}
              <YourMoveList home={home} projectName={projectName} />
              <WaitingList home={home} projectName={projectName} />
            </div>
          )}
        </div>
      </section>

      {/* bottom: statuses (they filter the week), approvals this week, projects */}
      <div className="grid gap-2.5 lg:col-span-2 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <StatusTile counts={counts} lanes={lanes} onLanes={setLanes} onNewProject={onNewProject} />
        <ApprovalsTile items={items} today={today} />
        <ProjectsTile home={home} />
      </div>
    </div>
  )
}

function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("surface-dark min-w-0 rounded-[22px] bg-[#1c1c1c] p-4 text-[#f2f2f2] ring-1 ring-white/[0.06]", className)}>{children}</section>
}

/** The month as round days: cream in the month, pink where posts go out, today ringed. */
function MonthTile({ items, projects, project, onProject, today, lane, onPickDay, onExpand }: {
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
    <Tile className="flex flex-1 flex-col">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#f8ebcb] text-[#ec4f9a]"><ZapIcon className="size-4 fill-current" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("Calendar")}</p>
          <p className="text-xs text-white/50">{t("Publishing days")}</p>
        </div>
        <button type="button" onClick={onExpand} aria-label={t("Open the calendar")} className="ml-auto rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"><ArrowUpRightIcon className="size-4" /></button>
      </div>

      <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[{ id: null as string | null, label: t("All") }, ...projects.slice(0, 8).map((p) => ({ id: p.id as string | null, label: p.client_name || p.title || t("Untitled") }))].map((c) => (
          <button key={c.id ?? "all"} type="button" onClick={() => onProject(c.id)}
            className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap ring-1 transition-colors",
              project === c.id ? "bg-[#f8ebcb] font-semibold text-[#1a1a1a] ring-[#f8ebcb]" : "text-white/80 ring-white/15 hover:ring-white/30")}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekdays.map((w, i) => <span key={i} className="pb-1 text-[10.5px] font-semibold text-white/75 uppercase">{w}</span>)}
          {cells.map((n, i) => {
            if (n < 1 || n > days) return <span key={i} className="aspect-square rounded-full border-[1.4px] border-dashed border-white/20" />
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
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-full text-[11.5px] font-semibold transition-transform hover:scale-110",
                  list.length ? "bg-[#ec4f9a] text-white" : "bg-[#f8ebcb] text-[#1a1a1a]",
                  isToday && "ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1c]"
                )}
              >
                {n}
                {changes && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#fdc019] ring-2 ring-[#1c1c1c]" />}
              </button>
            )
          })}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4 text-sm font-semibold">
          <button type="button" aria-label={t("Previous month")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-1 hover:bg-white/10"><ArrowLeftIcon className="size-4" /></button>
          <span className="first-letter:uppercase">{month.toLocaleDateString(locale, { month: "long", year: "numeric" })}</span>
          <button type="button" aria-label={t("Next month")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-1 hover:bg-white/10"><ArrowRightIcon className="size-4" /></button>
        </div>
      </div>
    </Tile>
  )
}

/** The yellow card: the one thing to do now, or a nudge to start. */
function NowCard({ home, projectName, onNewProject }: { home: Home; projectName: (o: Order) => string; onNewProject: () => void }) {
  const { t, locale } = useT()
  const [skip, setSkip] = useState(0)
  const next = home.move[skip % Math.max(1, home.move.length)]
  return (
    <section className="relative overflow-hidden rounded-[22px] bg-[#fdc019] p-4 text-[#1a1a1a]">
      {next ? (
        <>
          <div className="flex items-center justify-between gap-2 text-[11.5px] font-bold">
            <span className="truncate">{projectName(next.item)}</span>
            <span className="shrink-0 rounded-full border border-[#f0a400] bg-[#fff3d1] px-2 py-0.5 text-[11px] text-[#c94d00]">
              {next.kind === "upload" ? t("No file") : next.kind === "overdue" ? t("Overdue")
                : `● ${next.pins.length > 1 ? t("{n} comments", { n: next.pins.length }) : t("Changes")}`}
            </span>
          </div>
          <h2 className="mt-3 mb-1 max-w-[190px] font-[family-name:var(--font-brand)] text-[19px] leading-[1.1] font-bold tracking-[-0.03em]">
            {next.kind === "upload"
              ? t("“{title}” goes out {day}", { title: next.item.title, day: new Date(next.when ?? 0).toLocaleDateString(locale, { weekday: "short", day: "numeric" }) })
              : next.kind === "overdue" ? t("“{title}” is past its deadline", { title: next.item.title })
              : t("Changes asked in “{title}”", { title: next.item.title })}
          </h2>
          {next.pins[0] && <p className="max-w-[170px] truncate text-xs opacity-75">«{next.pins[0].title}»</p>}
          <div className="mt-3 flex gap-1.5">
            <Link href={`/orders/${next.item.project_id ?? next.item.id}`} className="rounded-lg bg-[#f4661b] px-3.5 py-1.5 text-xs font-semibold text-white">{t("Open")}</Link>
            {home.move.length > 1 && <button type="button" onClick={() => setSkip((n) => n + 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-black/5">{t("Later")}</button>}
          </div>
        </>
      ) : (
        <>
          <p className="text-[11.5px] font-bold">{t("All quiet")}</p>
          <h2 className="mt-3 mb-3 max-w-[190px] font-[family-name:var(--font-brand)] text-[19px] leading-[1.1] font-bold tracking-[-0.03em]">{t("Nothing needs you. Start the next client?")}</h2>
          <button type="button" onClick={onNewProject} className="rounded-lg bg-[#f4661b] px-3.5 py-1.5 text-xs font-semibold text-white">{t("New project")}</button>
        </>
      )}
      <Sticker count={next?.pins.length || (next ? 1 : 0)} />
    </section>
  )
}

/** A drawn post with a comment bubble, for the yellow card. */
function Sticker({ count }: { count: number }) {
  return (
    <svg viewBox="0 0 118 96" aria-hidden className="pointer-events-none absolute -right-1.5 -bottom-1 h-24 w-[118px]">
      <g transform="rotate(-12 60 50)">
        <rect x="22" y="14" width="74" height="70" rx="8" fill="#fff" stroke="#151515" strokeWidth="2.5" />
        <rect x="30" y="22" width="58" height="36" rx="4" fill="#f4661b" stroke="#151515" strokeWidth="2" />
        <path d="M34 54 l14 -14 l10 10 l8 -8 l18 16" fill="none" stroke="#151515" strokeWidth="2" />
        <rect x="30" y="64" width="40" height="4" rx="2" fill="#151515" />
        <rect x="30" y="72" width="26" height="4" rx="2" fill="#151515" opacity=".4" />
      </g>
      {count > 0 && (
        <g transform="translate(70 4)">
          <path d="M14 0 a14 14 0 1 1 -10 24 l-4 6 l1 -9 a14 14 0 0 1 13 -21z" fill="#ec4f9a" stroke="#151515" strokeWidth="2.2" />
          <text x="14" y="19" fontWeight="700" fontSize="13" textAnchor="middle" fill="#fff">{count > 9 ? "9+" : count}</text>
        </g>
      )}
    </svg>
  )
}

/** The week: a column per day, a row per stage, every post as a card in its project's colour. */
function WeekGrid({ week, today, items, lanes, lane, projectName, projects }: {
  week: Date
  today: Date
  items: Order[]
  lanes: Set<Lane>
  lane: (o: Order) => Lane
  projectName: (o: Order) => string
  projects: Order[]
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
  const target = projects[0]

  return (
    <div className="min-w-[760px]">
      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-x-2.5">
        <span />
        {days.map((d) => {
          const isToday = d.getTime() === today.getTime()
          return (
            <p key={d.getTime()} className={cn("pb-2 font-[family-name:var(--font-brand)] text-[17px] font-bold tracking-[-0.03em]", isToday ? "text-[#ec4f9a]" : "text-[#151515]")}>
              {d.getDate()}<span className="ml-0.5 font-sans text-[11px] font-medium tracking-normal text-[#a5a5a5]">/{d.toLocaleDateString(locale, { weekday: "short" })}</span>
            </p>
          )
        })}
        {shown.map((l) => (
          <Row key={l} label={t(LANE_LABEL[l])}>
            {days.map((d) => {
              const list = cell.get(`${dayKey(d)}|${l}`) ?? []
              return (
                <div key={d.getTime()} className="flex min-w-0 flex-col gap-2 border-t border-dashed border-[#e3e3e3] py-2.5">
                  {list.map((o) => <PostCard key={o.id} item={o} lane={l} projectName={projectName(o)} />)}
                </div>
              )
            })}
          </Row>
        ))}
      </div>
      {empty && (
        <div className="mt-2 flex flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#37c873] bg-[#e3f8ea] px-6 py-8 text-center text-sm text-[#1e8c4c]">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#c9f0d6]"><PlusIcon className="size-4" /></span>
          <p className="font-semibold">{t("Nothing goes out this week")}</p>
          <p className="max-w-sm text-xs text-[#1e8c4c]/80">{t("Posts land here on their publishing day. Start a project from a post template to get the dates.")}</p>
          {target && <Link href={`/orders/${target.id}`} className="mt-1 rounded-full bg-[#1e8c4c] px-3 py-1.5 text-xs font-semibold text-white">{t("Add posts to {name}", { name: target.title || t("Untitled") })}</Link>}
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="border-t border-dashed border-[#e3e3e3] pt-2.5 text-[10.5px] font-medium text-[#a9a9a9]">{label}</span>
      {children}
    </>
  )
}

/** A post on the week: its picture on top, a plate in its project's colour below. */
function PostCard({ item, lane, projectName }: { item: Order; lane: Lane; projectName: string }) {
  const { t } = useT()
  const color = item.project_id ? projectColor(item.project_id) : "#c19af5"
  const href = `/orders/${lane === "nofile" && item.project_id ? item.project_id : item.id}`
  return (
    <Link href={href} className="block overflow-hidden rounded-xl text-[#151515] transition-transform hover:-translate-y-0.5" style={{ backgroundColor: color }}>
      {lane === "nofile" ? (
        <span className="m-1.5 flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border-[1.5px] border-dashed border-black/25 text-[10.5px] font-semibold">
          <ImagePlusIcon className="size-3.5" />{t("Add the file")}
        </span>
      ) : (
        <Thumb url={item.file_url} className="h-16 w-full" />
      )}
      <span className="block px-2.5 pt-1.5 pb-2.5">
        <span className="block truncate text-[10px] font-semibold opacity-70">{projectName}</span>
        <span className="line-clamp-2 font-[family-name:var(--font-brand)] text-[12.5px] leading-[1.15] font-bold tracking-[-0.02em]">{item.title}</span>
        {lane === "changes" && <span className="mt-2 flex items-center justify-center gap-1 rounded-md bg-white py-1 text-[10.5px] font-bold"><PencilIcon className="size-3" />{t("Open the changes")}</span>}
        {lane === "approved" && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#151515] px-2 py-0.5 text-[10px] font-bold text-white"><CheckIcon className="size-3" />{t("Approved")}</span>}
        {lane === "waiting" && <span className="mt-2 inline-flex rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold">{t("With the client")}</span>}
      </span>
    </Link>
  )
}

/** The stages with how many posts sit in each; unticking one hides its row of the week. */
function StatusTile({ counts, lanes, onLanes, onNewProject }: { counts: Record<Lane, number>; lanes: Set<Lane>; onLanes: (l: Set<Lane>) => void; onNewProject: () => void }) {
  const { t } = useT()
  const toggle = (l: Lane) => {
    const next = new Set(lanes)
    if (next.has(l)) next.delete(l)
    else next.add(l)
    if (next.size) onLanes(next)
  }
  return (
    <Tile className="flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("Statuses")}</p>
        <ChevronDownIcon className="size-4 text-white/70" />
      </div>
      <div className="mt-3 flex flex-col">
        {LANES.map((l) => (
          <label key={l} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] text-white/90">
            <input type="checkbox" checked={lanes.has(l)} onChange={() => toggle(l)} className="peer sr-only" />
            <span className={cn("flex size-[15px] items-center justify-center rounded-[4px] border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-white/40", lanes.has(l) ? "border-white bg-white text-[#151515]" : "border-white/60")}>
              {lanes.has(l) && <CheckIcon className="size-2.5" strokeWidth={3} />}
            </span>
            {t(LANE_LABEL[l])}
            {counts[l] > 0 && <span className={cn("flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white", l === "approved" ? "bg-[#2fc76b]" : "bg-[#ec4f9a]")}>{counts[l]}</span>}
          </label>
        ))}
      </div>
      <button type="button" onClick={onNewProject} className="mt-auto flex items-center gap-2 pt-3 text-[13px] font-semibold hover:text-white/80">
        <PlusIcon className="size-4" />{t("New project")}
      </button>
    </Tile>
  )
}

/** Approvals per day this week; a hovered (or today's) bar turns orange and tells the numbers. */
function ApprovalsTile({ items, today }: { items: Order[]; today: Date }) {
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
  // an even scale: 0, step, 2·step, 3·step
  // an even scale in four steps, tight above the highest bar
  const step = Math.max(1, Math.ceil(Math.max(...data.map((x) => Math.max(x.approved, x.uploaded))) / 4))
  const top = step * 4
  const ticks = [top, step * 3, step * 2, step, 0]
  const total = data.reduce((s, x) => s + x.approved, 0)

  return (
    <Tile className="flex min-h-[240px] flex-col">
      <div className="flex items-start gap-3">
        <div>
          <p className="text-sm font-semibold">{t("Approvals this week")}</p>
          <p className="text-xs text-white/50">{t("Approved so far:")} <span className="text-white">{total}</span></p>
        </div>
        <span className="ml-auto flex size-8 items-center justify-center rounded-lg bg-white/[0.07]"><BarChart3Icon className="size-4 text-white/80" /></span>
      </div>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[22px_minmax(0,1fr)] gap-2">
        <div className="flex flex-col justify-between pb-5 text-[10.5px] text-white/45">{ticks.map((v, i) => <span key={i}>{v}</span>)}</div>
        <div className="relative flex items-end gap-3 pb-5" onMouseLeave={() => setHover(null)}>
          {data.map((x, i) => {
            const on = i === at
            const h = Math.max(6, (Math.max(x.approved, x.uploaded) / top) * 100)
            return (
              <div key={i} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
                {/* a thin cap on a body; the picked day turns yellow over orange stripes */}
                <div className="mx-auto flex w-full max-w-14 flex-col overflow-hidden rounded-t-[6px]" style={{ height: `${h}%` }}>
                  <div className={cn("h-1 shrink-0", on ? "bg-[#ebb216]" : "bg-[#3a3a3a]")} />
                  <div className={cn("flex-1", on ? "bg-[repeating-linear-gradient(-45deg,#e56019_0_4px,#f08139_4px_8px)]" : "bg-[#2c2c2c]")} />
                </div>
                <span className={cn("absolute -bottom-5 inset-x-0 text-center text-[10.5px] capitalize", on ? "font-semibold text-white" : "text-white/50")}>
                  {x.d.toLocaleDateString(locale, { weekday: "short" })}
                </span>
                {on && (
                  <div
                    className={cn(
                      "absolute z-10 w-40 rounded-lg bg-[#2b2b2b] p-2.5 text-[10.5px] text-white/75 shadow-xl ring-1 ring-white/10",
                      // above a short bar; beside a tall one, so it stays inside the tile
                      h <= 55 ? "left-1/2 -translate-x-1/2" : i < 4 ? "top-0 left-[calc(50%+36px)]" : "top-0 right-[calc(50%+36px)]"
                    )}
                    style={h <= 55 ? { bottom: `calc(${h}% + 8px)` } : undefined}
                  >
                    {x.d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" })}
                    <p className="mt-1.5 flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#f4661b]" />{t("Approved posts")}<b className="ml-auto text-white">{x.approved}</b></p>
                    <p className="mt-1 flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#fdc019]" />{t("Uploaded")}<b className="ml-auto text-white">{x.uploaded}</b></p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Tile>
  )
}

/** The projects as a short list, like the reference's archive; each opens on a click. */
function ProjectsTile({ home }: { home: Home }) {
  const { t } = useT()
  return (
    <Tile className="flex flex-col">
      <p className="text-sm font-semibold">{t("Projects")}</p>
      <div className="mt-2 -mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {home.summaries.length === 0 && <p className="px-2 py-3 text-sm text-white/50">{t("No projects yet.")}</p>}
        {home.summaries.map(({ project, posts, approved }) => (
          <Link key={project.id} href={`/orders/${project.id}`} className="group flex items-center gap-2.5 rounded-xl px-2 py-2 text-[13px] font-semibold hover:bg-white/[0.07]">
            <span className="size-4 shrink-0 rounded-[5px]" style={{ backgroundColor: projectColor(project.id) }} />
            <span className="truncate">{project.title || t("Untitled")}</span>
            <span className="shrink-0 font-medium text-white/45">·{approved}/{posts.length}</span>
            <ArrowUpRightIcon className="ml-auto size-3.5 shrink-0 text-white/70 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </Tile>
  )
}
