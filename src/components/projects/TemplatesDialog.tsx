"use client"

import { useMemo, useState } from "react"
import {
  CalendarDaysIcon, CalendarRangeIcon, CircleCheckIcon, CircleDotIcon, FilterIcon, HandshakeIcon, LayoutGridIcon, LightbulbIcon,
  LockIcon, PercentIcon, RocketIcon, SearchIcon, ShapesIcon, SquareDashedIcon, UserPlusIcon, XIcon,
} from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { POST_TEMPLATES, TEMPLATES, type CanvasTemplate, type GalleryItem, type PostTemplate } from "@/components/projects/templates"
import { useT, type T } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const matches = (t: T, q: string) => (item: GalleryItem) => `${t(item.title)} ${t(item.description)} ${item.title}`.toLowerCase().includes(q)

/**
 * The template gallery: search on top, an empty canvas on the right, tinted cards below.
 * With onPosts it is the New project dialog, in two tabs: Posts (an empty post-approval project
 * or a post plan, on every plan) and Canvas (an empty canvas or a canvas template; paid: with
 * canvasLocked they show a lock and onLocked runs instead).
 */
export function TemplatesDialog({ open, onOpenChange, onPick, onPosts, canvasLocked = false, onLocked }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = start from an empty canvas */
  onPick: (template: CanvasTemplate | null) => void
  /** Start with the posts view, empty (null) or from a post plan; only in the New project dialog. */
  onPosts?: (template: PostTemplate | null) => void
  canvasLocked?: boolean
  onLocked?: () => void
}) {
  const { t } = useT()
  const [query, setQuery] = useState("")
  // the New project dialog keeps the two kinds apart: posts for the client, or a canvas
  const [tab, setTab] = useState<"posts" | "canvas">("posts")
  const q = query.trim().toLowerCase()
  const isNew = !!onPosts
  const canvases = useMemo(() => (q ? TEMPLATES.filter(matches(t, q)) : TEMPLATES), [q, t])
  const plans = useMemo(() => (!isNew ? [] : q ? POST_TEMPLATES.filter(matches(t, q)) : POST_TEMPLATES), [isNew, q, t])

  const close = () => onOpenChange(false)
  const pick = (tpl: CanvasTemplate | null) => {
    if (canvasLocked) { close(); onLocked?.(); return }
    onPick(tpl)
    close()
  }
  const pickPosts = (tpl: PostTemplate | null) => {
    onPosts?.(tpl)
    close()
  }

  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      className="h-[min(780px,calc(var(--vvh,100dvh)-2rem))] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-4xl [&>[role=dialog]]:grid-rows-[minmax(0,1fr)] [&>[role=dialog]]:min-h-0"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
          <button type="button" onClick={close} aria-label={t("Close")} className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground">
            <XIcon className="size-4" />
          </button>
          <p className="hidden shrink-0 text-sm font-medium text-foreground sm:block">{isNew ? t("New project") : t("Templates")}</p>
          <label className="mx-auto flex h-9 w-full max-w-sm items-center gap-2 rounded-lg bg-foreground/[0.04] px-3 ring-1 ring-border focus-within:ring-foreground/30">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search")}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button type="button" onClick={() => pick(null)} className={isNew ? "hidden" : "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-hover hover:text-foreground"}>
            <SquareDashedIcon className="size-4" />
            <span className="hidden sm:inline">{t("Empty canvas")}</span>
          </button>
        </div>

        {isNew && (
          <div role="tablist" className="grid shrink-0 grid-cols-2 border-b border-border">
            <Tab active={tab === "posts"} onClick={() => setTab("posts")} icon={LayoutGridIcon} title={t("Posts")} hint={t("Posts with dates, approved by the client")} count={plans.length + 1} />
            <Tab active={tab === "canvas"} onClick={() => setTab("canvas")} icon={ShapesIcon} title={t("Canvas")} hint={t("A free board for plans and ideas")} count={canvases.length + 1} badge={canvasLocked ? <ProBadge /> : null} />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6">
            {isNew && tab === "posts" && (
              plans.length > 0 || !q ? (
                <Section title={t("Start empty or from a template")}>
                  {!q && (
                    <Card title={t("Post approval")} description={t("Upload the posts, send the client a link, collect the approvals.")} tone="#3f9a5b" onClick={() => pickPosts(null)}>
                      <PostsPreview />
                    </Card>
                  )}
                  {plans.map((tpl) => (
                    <Card key={tpl.id} title={t(tpl.title)} description={t(tpl.description)} tone={tpl.tone} onClick={() => pickPosts(tpl)}>
                      <TablePreview item={tpl} />
                    </Card>
                  ))}
                </Section>
              ) : <NotFound other={canvases.length > 0 ? () => setTab("canvas") : null} otherLabel={t("Canvas")} />
            )}
            {(!isNew || tab === "canvas") && (
              canvases.length > 0 || (isNew && !q) ? (
                <Section title={isNew ? t("Start empty or from a template") : t("For SMM")}>
                  {isNew && !q && (
                    <Card title={t("Empty canvas")} description={t("A blank board: blocks, posts, notes and paths, laid out your way.")} tone="#3b78d8" locked={canvasLocked} onClick={() => pick(null)}>
                      <CanvasPreview />
                    </Card>
                  )}
                  {canvases.map((tpl) => (
                    <Card key={tpl.id} title={t(tpl.title)} description={t(tpl.description)} tone={tpl.tone} locked={canvasLocked} onClick={() => pick(tpl)}>
                      <TablePreview item={tpl} />
                    </Card>
                  ))}
                </Section>
              ) : <NotFound other={isNew && plans.length > 0 ? () => setTab("posts") : null} otherLabel={t("Posts")} />
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

/** One of the two kinds of project, as a wide tab under the search. */
function Tab({ active, onClick, icon: Icon, title, hint, count, badge }: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint: string
  count: number
  badge?: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 text-left transition-colors sm:px-6",
        active ? "text-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground"
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-foreground text-background" : "bg-foreground/[0.06]")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          <span className="text-xs font-normal text-muted-foreground tabular-nums">{count}</span>
          {badge}
        </span>
        <span className="hidden truncate text-xs text-muted-foreground sm:block">{hint}</span>
      </span>
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />}
    </button>
  )
}

/** Nothing here for the search; maybe in the other tab. */
function NotFound({ other, otherLabel }: { other: (() => void) | null; otherLabel: string }) {
  const { t } = useT()
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
      <p>{t("Nothing found.")}</p>
      {other && (
        <button type="button" onClick={other} className="rounded-md px-2.5 py-1.5 text-foreground ring-1 ring-border hover:bg-hover">
          {t("Look in “{tab}”", { tab: otherLabel })}
        </button>
      )}
    </div>
  )
}

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">{title}{badge}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** "Pro" with a lock: on a paid plan only. */
function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.07] px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
      <LockIcon className="size-3" />
      Pro
    </span>
  )
}

/** A gallery card: name and line on a tint, a window onto the result below. */
function Card({ title, description, tone, locked, onClick, children }: {
  title: string
  description: string
  tone: string
  locked?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl text-left ring-1 outline-none focus-visible:ring-2"
      style={{
        backgroundColor: `color-mix(in oklab, ${tone} 9%, var(--popover))`,
        ["--tw-ring-color" as string]: `color-mix(in oklab, ${tone} 32%, transparent)`,
      }}
    >
      {locked && <span className="absolute top-4 right-4"><ProBadge /></span>}
      <div className="px-5 pt-5">
        <p className="pr-14 text-[15px] font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 ml-5 h-36 overflow-hidden rounded-tl-xl bg-popover ring-1" style={{ ["--tw-ring-color" as string]: `color-mix(in oklab, ${tone} 28%, transparent)` }}>
        {children}
      </div>
    </button>
  )
}

/** Post approval: the posts as a table, the client's face and where each one stands. */
function PostsPreview() {
  const { t } = useT()
  const rows: [string, string][] = [["Approved", "#22a55a"], ["Changes", "#e08a2e"], ["Awaiting", "#9b9b9b"]]
  return (
    <div className="flex h-full flex-col gap-2.5 p-4 text-[11px]">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        <CircleCheckIcon className="size-3.5" style={{ color: "#3f9a5b" }} />
        {t("Post approval")}
      </p>
      <div className="grid grid-cols-[1.1fr_1fr_0.9fr] gap-x-3 text-muted-foreground">
        <span className="truncate">{t("Post")}</span><span className="truncate">{t("Client")}</span><span className="truncate">{t("Status")}</span>
      </div>
      {rows.map(([label, tone], i) => (
        <div key={label} className="grid grid-cols-[1.1fr_1fr_0.9fr] items-center gap-x-3">
          <span className="flex items-center gap-1.5">
            <span className="size-4 shrink-0 rounded-[3px] bg-foreground/10" />
            <span className="h-1.5 w-3/5 rounded-full bg-foreground/15" />
          </span>
          <span className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative avatar */}
            <img src={`/avatars/person-${i + 4}.svg`} alt="" className="size-4 shrink-0 rounded-full ring-1 ring-foreground/10" />
            <span className="h-1.5 w-3/5 rounded-full bg-foreground/10" />
          </span>
          <span
            className="w-fit max-w-full truncate rounded px-1.5 py-px text-[10px] font-medium"
            style={{ backgroundColor: `color-mix(in oklab, ${tone} 22%, transparent)`, color: `color-mix(in oklab, ${tone} 75%, var(--foreground))` }}
          >
            {t(label)}
          </span>
        </div>
      ))}
    </div>
  )
}

/** An empty canvas: two blocks, a sticky note and a path, with room to spare. */
function CanvasPreview() {
  return (
    <div className="relative h-full">
      <span className="absolute top-8 left-6 h-9 w-24 rounded-lg bg-foreground/[0.06] ring-1 ring-foreground/10" />
      <span className="absolute top-20 left-44 h-9 w-24 rounded-lg bg-foreground/[0.06] ring-1 ring-foreground/10" />
      <span className="absolute top-6 left-52 h-7 w-16 rounded-sm bg-[#fdf1a8] dark:bg-[#5a4d17]" />
      <svg className="absolute inset-0 size-full" aria-hidden>
        <path d="M120 50 C 150 50, 140 98, 176 98" fill="none" stroke="#3b78d8" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

// One icon per template, in its tint.
const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "content-month": CalendarDaysIcon,
  launch: RocketIcon,
  pillars: LayoutGridIcon,
  "approval-week": CircleCheckIcon,
  onboarding: UserPlusIcon,
  brainstorm: LightbulbIcon,
  funnel: FilterIcon,
  "posts-month": CalendarDaysIcon,
  "posts-week": CalendarRangeIcon,
  "posts-stories": CircleDotIcon,
  "posts-launch": RocketIcon,
  "posts-sale": PercentIcon,
  "posts-intro": HandshakeIcon,
}

// Tag colours for the preview rows, like Notion's select options.
const TAG_TONES = ["#3b82f6", "#22a55a", "#e08a2e", "#a855f7", "#e05252", "#c9a227"]

/** The card's window: the template's icon and name, three columns and three tagged rows. */
function TablePreview({ item: tpl }: { item: GalleryItem }) {
  const { t } = useT()
  const Icon = ICONS[tpl.id] ?? LayoutGridIcon
  const offset = ([...POST_TEMPLATES, ...TEMPLATES] as GalleryItem[]).indexOf(tpl)
  return (
    <div className="flex h-full flex-col gap-2.5 p-4 text-[11px]">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        <Icon className="size-3.5" style={{ color: tpl.tone }} />
        {t(tpl.title)}
      </p>
      <div className="grid grid-cols-[1.1fr_1fr_0.9fr] gap-x-3 text-muted-foreground">
        {tpl.preview.columns.map((c) => <span key={c} className="truncate">{t(c)}</span>)}
      </div>
      {tpl.preview.tags.map((tag, i) => {
        const tone = TAG_TONES[(offset + i) % TAG_TONES.length]
        return (
          <div key={i} className="grid grid-cols-[1.1fr_1fr_0.9fr] items-center gap-x-3">
            <span className="h-1.5 w-4/5 rounded-full bg-foreground/15" />
            <span className="flex items-center gap-1.5">
              {/* people columns (owner, author, client) get faces, as in Notion */}
              {tpl.preview.people && (
                // eslint-disable-next-line @next/next/no-img-element -- tiny decorative avatar
                <img src={`/avatars/person-${((offset * 2 + i) % 6) + 1}.svg`} alt="" className="size-4 shrink-0 rounded-full ring-1 ring-foreground/10" />
              )}
              <span className="h-1.5 w-3/5 rounded-full bg-foreground/10" />
            </span>
            <span
              className="w-fit max-w-full truncate rounded px-1.5 py-px text-[10px] font-medium"
              style={{ backgroundColor: `color-mix(in oklab, ${tone} 22%, transparent)`, color: `color-mix(in oklab, ${tone} 75%, var(--foreground))` }}
            >
              {t(tag)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
