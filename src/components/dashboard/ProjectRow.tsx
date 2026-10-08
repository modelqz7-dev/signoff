"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRightIcon, CheckIcon, LinkIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, WaypointsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Order } from "@/components/dashboard/types"
import { supabase } from "@/lib/supabase"
import { deleteProject } from "@/lib/orders"
import { PROJECTS_CHANGED, PROJECT_RENAMED } from "@/lib/panels"
import { notifyPlanChanged } from "@/lib/use-plan"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

/**
 * A project in the sidebar, Notion style: the name opens it, and on hover a "⋯" opens a menu to
 * rename, open in a new tab, copy the link or delete it.
 */
export function ProjectRow({ project, active }: { project: { id: string; title: string }; active: boolean }) {
  const { t } = useT()
  const router = useRouter()
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // a rename is committed once: by Enter or by leaving the box, never both, never after Escape
  const settled = useRef(false)
  const href = `/orders/${project.id}`
  const name = project.title || t("Untitled")

  // the menu closes on a click elsewhere or Escape (the rename box saves on blur, Escape cancels it)
  useEffect(() => {
    if (!menu && !renaming) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { settled.current = true; setMenu(false); setRenaming(false) } }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [menu, renaming])

  async function rename(title: string) {
    if (settled.current) return
    settled.current = true
    setRenaming(false)
    const next = title.trim()
    if (!next || next === project.title) return
    const { error } = await supabase.from("orders").update({ title: next }).eq("id", project.id)
    if (error) return
    window.dispatchEvent(new CustomEvent(PROJECT_RENAMED, { detail: { id: project.id, title: next } }))
    window.dispatchEvent(new Event(PROJECTS_CHANGED))
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`)
      setCopied(true)
      window.setTimeout(() => { setCopied(false); setMenu(false) }, 900)
    } catch {
      setMenu(false)
    }
  }

  return (
    <div ref={ref} className="group relative">
      <a
        href={href}
        onClick={(e) => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); router.push(href) } }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[7px] py-[7px] pr-8 pl-3 text-[13.5px] transition-colors",
          active ? "bg-hover-strong font-medium text-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground",
          menu && !active && "bg-hover text-foreground"
        )}
      >
        <WaypointsIcon className={cn("size-4 shrink-0", active ? "text-primary" : "opacity-60")} strokeWidth={1.6} />
        <span className="truncate">{name}</span>
      </a>
      <button
        type="button"
        onClick={() => { setRenaming(false); setMenu((v) => !v) }}
        aria-label={t("Project actions")}
        aria-haspopup="menu"
        aria-expanded={menu}
        className={cn(
          "absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-foreground/10 hover:text-foreground",
          menu ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
        )}
      >
        <MoreHorizontalIcon className="size-4" />
      </button>

      {menu && (
        <div role="menu" className="absolute top-[calc(100%+2px)] left-4 z-30 flex w-60 flex-col whitespace-nowrap gap-0.5 rounded-xl bg-popover p-1.5 shadow-lg ring-1 ring-foreground/10">
          <MenuItem icon={PencilIcon} label={t("Rename")} onClick={() => { settled.current = false; setMenu(false); setRenaming(true) }} />
          <MenuItem icon={ArrowUpRightIcon} label={t("Open in new tab")} onClick={() => { setMenu(false); window.open(href, "_blank", "noopener") }} />
          <MenuItem icon={copied ? CheckIcon : LinkIcon} label={copied ? t("Copied") : t("Copy link")} onClick={copyLink} />
          <div className="my-0.5 h-px bg-border" />
          <MenuItem icon={Trash2Icon} label={t("Delete")} onClick={() => { setMenu(false); setConfirming(true) }} danger />
        </div>
      )}

      {renaming && (
        <div className="absolute top-0 right-0 left-0 z-30 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-foreground/10">
          <input
            autoFocus
            defaultValue={project.title}
            placeholder={t("Untitled")}
            aria-label={t("Project name")}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => { if (e.key === "Enter") rename(e.currentTarget.value) }}
            onBlur={(e) => rename(e.currentTarget.value)}
            className="h-8 w-full rounded-md bg-foreground/[0.04] px-2 text-[13.5px] text-foreground ring-1 ring-border outline-none focus:ring-foreground/30"
          />
        </div>
      )}

      <DeleteProjectDialog
        project={project}
        open={confirming}
        onOpenChange={setConfirming}
        onDeleted={() => { if (active) router.push("/dashboard") }}
      />
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] transition-colors",
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground/90 hover:bg-hover"
      )}
    >
      <Icon className="size-4 opacity-70" />
      {label}
    </button>
  )
}

function DeleteProjectDialog({ project, open, onOpenChange, onDeleted }: {
  project: { id: string; title: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const { t } = useT()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      await deleteProject({ ...project, file_url: null } as unknown as Order)
      notifyPlanChanged()
      window.dispatchEvent(new Event(PROJECTS_CHANGED))
      onOpenChange(false)
      onDeleted()
    } catch (e) {
      setError(t((e as Error)?.message || "Couldn't delete the project"))
    }
    setDeleting(false)
  }

  return (
    <Dialog isOpen={open} onOpenChange={(v) => !deleting && onOpenChange(v)} className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{t("Delete project?")}</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{project.title || t("Untitled")}</span>{" "}
          {t("will be deleted with all its posts, files and client comments. This can't be undone.")}
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onPress={() => onOpenChange(false)} isDisabled={deleting}>{t("Cancel")}</Button>
        <Button variant="destructive" onPress={remove} isDisabled={deleting}>{deleting ? t("Deleting...") : t("Delete project")}</Button>
      </DialogFooter>
    </Dialog>
  )
}
