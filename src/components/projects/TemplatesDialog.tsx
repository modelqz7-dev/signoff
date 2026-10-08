"use client"

import { useMemo, useState } from "react"
import {
  CalendarDaysIcon, CircleCheckIcon, FilterIcon, LayoutGridIcon, LightbulbIcon, RocketIcon, SearchIcon, SquareDashedIcon,
  UserPlusIcon, XIcon,
} from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { TEMPLATES, type CanvasTemplate } from "@/components/projects/templates"
import { useT } from "@/lib/i18n"

/**
 * The template gallery: search on top, an empty canvas on the right, tinted cards below.
 * With onPosts it is the New project dialog: the two plain starts (post approval, empty canvas)
 * come first, as cards of their own, and the templates follow.
 */
export function TemplatesDialog({ open, onOpenChange, onPick, onPosts }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = start from an empty canvas */
  onPick: (template: CanvasTemplate | null) => void
  /** Start with the simple posts view; only in the New project dialog. */
  onPosts?: () => void
}) {
  const { t } = useT()
  const [query, setQuery] = useState("")
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TEMPLATES
    return TEMPLATES.filter((tpl) => `${t(tpl.title)} ${t(tpl.description)} ${tpl.title}`.toLowerCase().includes(q))
  }, [query, t])

  const pick = (tpl: CanvasTemplate | null) => {
    onPick(tpl)
    onOpenChange(false)
  }
  const isNew = !!onPosts

  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      className="h-[min(780px,calc(var(--vvh,100dvh)-2rem))] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-4xl [&>[role=dialog]]:grid-rows-[minmax(0,1fr)] [&>[role=dialog]]:min-h-0"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
          <button type="button" onClick={() => onOpenChange(false)} aria-label={t("Close")} className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground">
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {isNew && !query.trim() && (
              <>
                <p className="mb-3 text-sm font-medium text-muted-foreground">{t("Start with")}</p>
                <div className="mb-8 grid gap-4 sm:grid-cols-2">
                  <Card title={t("Post approval")} description={t("Upload the posts, send the client a link, collect the approvals.")} tone="#3f9a5b" onClick={() => { onPosts(); onOpenChange(false) }}>
                    <PostsPreview />
                  </Card>
                  <Card title={t("Empty canvas")} description={t("A blank board: blocks, posts, notes and paths, laid out your way.")} tone="#3b78d8" onClick={() => pick(null)}>
                    <CanvasPreview />
                  </Card>
                </div>
              </>
            )}
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">{isNew ? t("Templates for SMM") : t("For SMM")}</p>
            {shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("Nothing found.")}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {shown.map((tpl) => (
                  <Card key={tpl.id} title={t(tpl.title)} description={t(tpl.description)} tone={tpl.tone} onClick={() => pick(tpl)}>
                    <TablePreview tpl={tpl} />
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

/** A gallery card: name and line on a tint, a window onto the result below. */
function Card({ title, description, tone, onClick, children }: { title: string; description: string; tone: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded-2xl text-left ring-1 outline-none focus-visible:ring-2"
      style={{
        backgroundColor: `color-mix(in oklab, ${tone} 9%, var(--popover))`,
        ["--tw-ring-color" as string]: `color-mix(in oklab, ${tone} 32%, transparent)`,
      }}
    >
      <div className="px-5 pt-5">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
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
}

// Tag colours for the preview rows, like Notion's select options.
const TAG_TONES = ["#3b82f6", "#22a55a", "#e08a2e", "#a855f7", "#e05252", "#c9a227"]

/** The card's window: the template's icon and name, three columns and three tagged rows. */
function TablePreview({ tpl }: { tpl: CanvasTemplate }) {
  const { t } = useT()
  const Icon = ICONS[tpl.id] ?? LayoutGridIcon
  const offset = TEMPLATES.indexOf(tpl)
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
