"use client"

import { useState } from "react"
import { CheckIcon, LayoutGridIcon, LayoutTemplateIcon, ShapesIcon, XIcon } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

export type ProjectStart = "posts" | "canvas" | "templates"

const OPTIONS: { id: ProjectStart; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string; text: string; tone: string }[] = [
  { id: "posts", icon: LayoutGridIcon, title: "Post approval", text: "Upload the posts, send the client a link, collect the approvals.", tone: "#3f9a5b" },
  { id: "canvas", icon: ShapesIcon, title: "Canvas", text: "A blank board: blocks, posts, notes and paths, laid out your way.", tone: "#3b78d8" },
  { id: "templates", icon: LayoutTemplateIcon, title: "Template", text: "A ready canvas for SMM: content plan, launch, onboarding and more.", tone: "#8b5cd6" },
]

/** What a new project starts as. Every project keeps both views; this only picks the first one. */
export function NewProjectDialog({ open, onOpenChange, onCreate }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (start: ProjectStart) => Promise<void>
}) {
  const { t } = useT()
  const [busy, setBusy] = useState<ProjectStart | null>(null)

  async function create(start: ProjectStart) {
    if (busy) return
    setBusy(start)
    try {
      await onCreate(start)
      onOpenChange(false)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} showCloseButton={false} className="gap-0 p-0 sm:max-w-3xl">
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-5 pt-5">
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">{t("New project")}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("How do you want to start? You can switch any time.")}</p>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} aria-label={t("Close")} className="self-start rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {OPTIONS.map(({ id, icon: Icon, title, text, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => create(id)}
              disabled={busy !== null}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl text-left ring-1 outline-none focus-visible:ring-2 disabled:cursor-default",
                busy && busy !== id && "opacity-50"
              )}
              style={{
                backgroundColor: `color-mix(in oklab, ${tone} 9%, var(--popover))`,
                ["--tw-ring-color" as string]: `color-mix(in oklab, ${tone} 32%, transparent)`,
              }}
            >
              <div className="ml-4 mt-4 h-28 overflow-hidden rounded-tl-xl bg-popover ring-1" style={{ ["--tw-ring-color" as string]: `color-mix(in oklab, ${tone} 28%, transparent)` }}>
                <Preview id={id} tone={tone} />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <p className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground">
                  <Icon className="size-4" style={{ color: tone }} />
                  {busy === id ? t("Creating…") : t(title)}
                </p>
                <p className="text-sm leading-snug text-muted-foreground">{t(text)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  )
}

/** A small picture of what each start looks like. */
function Preview({ id, tone }: { id: ProjectStart; tone: string }) {
  if (id === "posts") {
    const states = ["#22a55a", "#e08a2e", "#9b9b9b"]
    return (
      <div className="flex gap-2 p-3">
        {states.map((c, i) => (
          <div key={i} className="flex w-14 shrink-0 flex-col gap-1.5">
            <div className="aspect-[4/5] rounded-md bg-foreground/[0.07]" />
            <span className="flex items-center gap-1">
              {i === 0 ? <CheckIcon className="size-2.5" style={{ color: c }} /> : <span className="size-1.5 rounded-full" style={{ backgroundColor: c }} />}
              <span className="h-1 flex-1 rounded-full bg-foreground/10" />
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (id === "canvas") {
    return (
      <div className="relative h-full">
        <span className="absolute top-5 left-4 h-7 w-14 rounded-md bg-foreground/[0.07] ring-1 ring-foreground/10" />
        <span className="absolute top-14 left-24 h-7 w-14 rounded-md bg-foreground/[0.07] ring-1 ring-foreground/10" />
        <span className="absolute top-6 left-28 h-5 w-10 rounded-sm bg-[#fdf1a8] dark:bg-[#5a4d17]" />
        <svg className="absolute inset-0 size-full" aria-hidden>
          <path d="M72 34 C 88 34, 80 70, 96 70" fill="none" stroke={tone} strokeWidth="1.5" />
        </svg>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {["#3f9a5b", "#3b78d8", "#d9822b", "#8b5cd6"].map((c) => (
        <div key={c} className="flex h-9 flex-col justify-center gap-1 rounded-md px-2" style={{ backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)` }}>
          <span className="h-1 w-3/4 rounded-full" style={{ backgroundColor: `color-mix(in oklab, ${c} 60%, transparent)` }} />
          <span className="h-1 w-1/2 rounded-full bg-foreground/10" />
        </div>
      ))}
    </div>
  )
}
