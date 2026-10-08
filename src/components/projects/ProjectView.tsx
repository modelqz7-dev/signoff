"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MenuIcon, PanelLeftIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Order } from "@/components/dashboard/types"
import { ProjectCanvas, type Board } from "@/components/projects/ProjectCanvas"
import { PROJECTS_CHANGED, openNav } from "@/lib/panels"
import { uploadOrderFile } from "@/lib/versions"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// A project page, Notion style, inside the app's one sidebar: a thin bar on top with its name and
// client, and the rest is the project's canvas. Posts on the canvas are orders of their own
// (kind = 'post'), so opening one leads to the usual order page with pins, versions and approval.

export function ProjectView({ project, onChange, onToggleSidebar }: { project: Order; onChange: (p: Order) => void; onToggleSidebar: () => void }) {
  const { t } = useT()
  const [posts, setPosts] = useState<Order[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders").select("*").eq("project_id", project.id)
      .order("position", { ascending: true }).order("created_at", { ascending: true })
    if (error) setError(error.message)
    else setPosts((data as Order[]) ?? [])
    setLoaded(true)
  }, [project.id])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  // Client decisions from the portal show up without a reload.
  useEffect(() => {
    const channel = supabase
      .channel(`project-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `project_id=eq.${project.id}` }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [project.id, load])

  const postsRef = useRef(posts)
  useEffect(() => { postsRef.current = posts }, [posts])

  /** Each file becomes a post of this project, in order after the last one. */
  async function addPosts(files: File[]): Promise<Order[]> {
    setError(null)
    let at = postsRef.current.length ? Math.max(...postsRef.current.map((p) => p.position ?? 0)) + 1 : 1
    const added: Order[] = []
    try {
      for (const file of files) {
        const fileUrl = await uploadOrderFile(project.shop_id, file)
        const { data, error } = await supabase.from("orders").insert({
          shop_id: project.shop_id,
          code: `${project.code}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          title: file.name.replace(/\.[^.]+$/, ""),
          client_name: project.client_name,
          client_email: project.client_email,
          status: "await",
          kind: "post",
          project_id: project.id,
          position: at++,
          file_url: fileUrl,
        }).select().single()
        if (error) throw error
        added.push(data as Order)
      }
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't upload the file"))
    }
    setPosts((prev) => [...prev, ...added.filter((a) => !prev.some((p) => p.id === a.id))])
    return added
  }

  const save = useCallback(async (board: Board) => {
    const { error } = await supabase.from("orders").update({ board }).eq("id", project.id)
    return !error
  }, [project.id])

  async function patchProject(patch: Partial<Order>) {
    onChange({ ...project, ...patch })
    const { error } = await supabase.from("orders").update(patch).eq("id", project.id)
    if (error) setError(error.message)
    else if ("title" in patch) window.dispatchEvent(new Event(PROJECTS_CHANGED))
  }

  return (
    <div className="flex h-dvh min-w-0 flex-1 flex-col bg-background text-foreground">
      {/* a thin top bar, Notion style */}
      <div className="flex h-12 shrink-0 items-center gap-2 px-3">
        <button type="button" onClick={openNav} aria-label={t("Menu")} className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground lg:hidden">
          <MenuIcon className="size-4" />
        </button>
        <button type="button" onClick={onToggleSidebar} aria-label={t("Toggle sidebar")} className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground lg:block">
          <PanelLeftIcon className="size-4" />
        </button>
        <EditableText
          value={project.title}
          placeholder={t("Untitled")}
          onSave={(title) => title.trim() && patchProject({ title: title.trim() })}
          className="field-sizing-content max-w-[45vw] min-w-16 rounded-md px-1.5 py-1 text-sm font-medium hover:bg-hover"
          ariaLabel={t("Project name")}
        />
        <EditableText
          value={project.client_name ?? ""}
          placeholder={t("Client")}
          onSave={(v) => patchProject({ client_name: v.trim() })}
          className="field-sizing-content hidden max-w-[30vw] min-w-16 rounded-md px-1.5 py-1 text-sm text-muted-foreground hover:bg-hover sm:block"
          ariaLabel={t("Client")}
        />
        {error && <span className="ml-auto truncate text-xs text-destructive">{error}</span>}
      </div>

      <main className={cn("relative min-h-0 flex-1")}>
        {loaded && <ProjectCanvas initial={project.board as Board | null} save={save} posts={posts} onCreatePosts={addPosts} />}
      </main>
    </div>
  )
}

/** Text edited in place, saved when it loses focus (Enter saves single-line text). */
function EditableText({ value, placeholder, onSave, className, ariaLabel, multiline }: {
  value: string
  placeholder: string
  onSave: (value: string) => void
  className?: string
  ariaLabel: string
  multiline?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)
  const shown = draft ?? value
  const commit = () => {
    if (!cancelled.current && draft !== null && draft !== value) onSave(draft)
    cancelled.current = false
    setDraft(null)
  }
  const cls = cn("bg-transparent outline-none placeholder:text-muted-foreground/50", className)
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value)
  return multiline ? (
    <textarea
      value={shown}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={onChange}
      onBlur={commit}
      rows={1}
      className={cn(cls, "field-sizing-content max-h-32 resize-none")}
    />
  ) : (
    <input
      value={shown}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={onChange}
      onBlur={commit}
      className={cls}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") { cancelled.current = true; e.currentTarget.blur() }
      }}
    />
  )
}
