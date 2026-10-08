"use client"

import { useMemo, useState } from "react"
import { SearchIcon, SquareDashedIcon, XIcon } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { NODE_SIZE, TEMPLATES, type CanvasTemplate } from "@/components/projects/templates"
import { useT } from "@/lib/i18n"

/** The template gallery: search on top, an empty canvas on the right, tinted cards below. */
export function TemplatesDialog({ open, onOpenChange, onPick }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = start from an empty canvas */
  onPick: (template: CanvasTemplate | null) => void
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

  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      className="h-[min(780px,calc(var(--vvh,100dvh)-2rem))] gap-0 overflow-hidden p-0 sm:max-w-4xl"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
          <button type="button" onClick={() => onOpenChange(false)} aria-label={t("Close")} className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground">
            <XIcon className="size-4" />
          </button>
          <p className="hidden text-sm font-medium text-foreground sm:block">{t("Templates")}</p>
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
          <button type="button" onClick={() => pick(null)} className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-hover hover:text-foreground">
            <SquareDashedIcon className="size-4" />
            <span className="hidden sm:inline">{t("Empty canvas")}</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">{t("For SMM")}</p>
            {shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("Nothing found.")}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {shown.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => pick(tpl)}
                    className="group overflow-hidden rounded-2xl text-left ring-1 transition-[box-shadow,transform] outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${tpl.tone} 9%, var(--popover))`,
                      ["--tw-ring-color" as string]: `color-mix(in oklab, ${tpl.tone} 32%, transparent)`,
                    }}
                  >
                    <div className="px-5 pt-5">
                      <p className="text-[15px] font-semibold text-foreground">{t(tpl.title)}</p>
                      <p className="mt-1 text-sm leading-snug text-muted-foreground">{t(tpl.description)}</p>
                    </div>
                    <div className="mt-4 ml-5 h-36 overflow-hidden rounded-tl-xl bg-card ring-1 ring-border">
                      <MiniMap tpl={tpl} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

/** The template drawn small: its pieces as boxes and its paths as lines. */
function MiniMap({ tpl }: { tpl: CanvasTemplate }) {
  const boxes = tpl.nodes.map((n) => ({ ...n, ...NODE_SIZE[n.type] }))
  const minX = Math.min(...boxes.map((b) => b.x)) - 60
  const minY = Math.min(...boxes.map((b) => b.y)) - 60
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 60
  const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 60
  const center = (i: number) => ({ x: boxes[i].x + boxes[i].w / 2, y: boxes[i].y + boxes[i].h / 2 })
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} preserveAspectRatio="xMinYMin meet" className="h-full w-full" aria-hidden="true">
      {tpl.edges.map(([a, b], i) => (
        <line key={i} {...{ x1: center(a).x, y1: center(a).y, x2: center(b).x, y2: center(b).y }} stroke="currentColor" strokeWidth={6} className="text-foreground/20" />
      ))}
      {boxes.map((b, i) =>
        b.type === "note" ? (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill="#fdf1a8" className="dark:fill-[#5a4d17]" />
        ) : b.type === "text" ? (
          <rect key={i} x={b.x} y={b.y + 8} width={b.w} height={b.h - 16} rx={10} className="fill-foreground/70" />
        ) : (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={18} className="fill-background stroke-border" strokeWidth={4} />
            <rect x={b.x + 22} y={b.y + 24} width={b.w * 0.5} height={16} rx={8} className="fill-foreground/70" />
            <rect x={b.x + 22} y={b.y + 56} width={b.w * 0.75} height={12} rx={6} className="fill-foreground/25" />
            <rect x={b.x + 22} y={b.y + 78} width={b.w * 0.55} height={12} rx={6} className="fill-foreground/25" />
          </g>
        )
      )}
    </svg>
  )
}
