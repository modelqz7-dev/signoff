"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlusIcon, PlusIcon } from "lucide-react"
import type { Order } from "@/components/dashboard/types"
import { ProjectAvatar } from "@/components/ProjectAvatar"
import { supabase } from "@/lib/supabase"
import { PROJECTS_CHANGED, openPanel } from "@/lib/panels"
import { useT } from "@/lib/i18n"

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/**
 * "Plan posts" for the days picked in the month: choose a project (or a new one) and an empty post is
 * made on each of those days, ready for its picture. Days that project already posts on are skipped.
 */
export function PlanPosts({ days, projects, items, onPlanned }: {
  days: Date[]
  projects: Order[]
  items: Order[]
  onPlanned: (rows: Order[]) => void
}) {
  const { t, locale } = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])

  async function plan(project: Order | null) {
    if (busy) return
    setBusy(true)
    try {
      const { data: shop } = await supabase.from("shops").select("id").limit(1).maybeSingle()
      if (!shop) return
      let target = project
      if (!target) {
        const { data, error } = await supabase.from("orders").insert({
          shop_id: shop.id,
          code: `PRJ-${Date.now().toString(36).toUpperCase()}`,
          title: t("Posts"),
          client_name: "",
          status: "await",
          kind: "project",
        }).select("*").single()
        if (error) {
          if (error.message?.includes("plan_limit")) openPanel("billing")
          return
        }
        target = data as Order
        window.dispatchEvent(new Event(PROJECTS_CHANGED))
      }
      const mine = items.filter((o) => o.project_id === target.id)
      const taken = new Set(mine.map((o) => (o.publish_on || "").slice(0, 10)))
      const fresh = days.filter((d) => !taken.has(isoDay(d)))
      let position = mine.reduce((m, o) => Math.max(m, o.position ?? 0), 0)
      const stamp = Date.now().toString(36).toUpperCase()
      if (fresh.length) {
        const { data, error } = await supabase.from("orders").insert(fresh.map((d, i) => ({
          shop_id: shop.id,
          code: `${target.code}-${stamp}${i + 1}`,
          title: t("Post · {date}", { date: d.toLocaleDateString(locale, { day: "numeric", month: "short" }) }),
          client_name: "",
          status: "await",
          kind: "post",
          project_id: target.id,
          position: ++position,
          publish_on: isoDay(d),
          file_url: null,
        }))).select("*")
        if (error) return
        onPlanned([...(project ? [] : [target]), ...((data as Order[]) ?? [])])
      } else if (!project) {
        onPlanned([target])
      }
      setOpen(false)
      if (!project) router.push(`/orders/${target.id}?start=posts`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <CalendarPlusIcon className="size-4" />{t("Plan posts")}
      </button>
      {open && (
        <div role="menu" className="absolute top-[calc(100%+6px)] right-0 z-40 flex w-72 flex-col gap-0.5 rounded-2xl bg-popover p-1.5 shadow-lg ring-1 ring-border">
          <p className="px-2.5 pt-1.5 pb-1 text-[12px] text-muted-foreground">
            {t("An empty post on each picked day, in which project?")}
          </p>
          <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {projects.map((p) => (
              <button key={p.id} type="button" role="menuitem" disabled={busy} onClick={() => plan(p)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] hover:bg-hover disabled:opacity-50">
                <ProjectAvatar id={p.id} className="size-6" />
                <span className="flex-1 truncate">{p.title || t("Untitled")}</span>
              </button>
            ))}
          </div>
          {projects.length > 0 && <div className="my-0.5 h-px bg-border" />}
          <button type="button" role="menuitem" disabled={busy} onClick={() => plan(null)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-medium hover:bg-hover disabled:opacity-50">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted"><PlusIcon className="size-3.5" /></span>
            {t("New project")}
          </button>
        </div>
      )}
    </div>
  )
}
