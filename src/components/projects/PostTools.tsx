"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon, ExternalLinkIcon, ImagePlusIcon, LinkIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, TypeIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Order, PostFormat } from "@/components/dashboard/types"
import { supabase } from "@/lib/supabase"
import { deleteOrder } from "@/lib/orders"
import { markLinkShared } from "@/lib/onboarding"
import { notifyPlanChanged } from "@/lib/use-plan"
import { siteOrigin } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// A post's details (name, day, format, caption) are set when it's made and can be changed from
// wherever the post shows, through its "⋯" menu, without opening it.

export const POST_FORMATS: [PostFormat, string][] = [["post", "Post"], ["carousel", "Carousel"], ["reels", "Reels"], ["stories", "Stories"]]
const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf"
const MAX_CAPTION = 2200

export type PostDraft = { title: string; publish_on: string | null; format: PostFormat; caption: string }

/** "Post · 19 Oct" for a dated post, "Post 3" otherwise. */
export function defaultPostTitle(t: ReturnType<typeof useT>["t"], locale: string, day: string | null, n: number) {
  if (day) return t("Post · {date}", { date: new Date(`${day}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" }) })
  return t("Post {n}", { n })
}

/** A file name worth keeping as a post's name, or null for camera and hash names ("IMG_2041", "76b7001f…"). */
export function nameFromFile(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim()
  if (!base || /^[0-9a-f-]{12,}$/i.test(base) || /^(img|dsc|pxl|mvimg|photo|image|screenshot|снимок|скриншот)[\s_-]*[\d_.-]*/i.test(base)) return null
  return base.replace(/[_]+/g, " ")
}

/** Make a post or change one: name, publishing day, format, caption and (for a new one) a file. */
export function PostDialog({ open, post, number, onClose, onSave }: {
  open: boolean
  /** The post being changed; none for a new one. */
  post?: Order | null
  /** The new post's number, for its default name. */
  number: number
  onClose: () => void
  onSave: (draft: PostDraft, file: File | null) => Promise<unknown>
}) {
  const { t, locale } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [day, setDay] = useState("")
  const [format, setFormat] = useState<PostFormat>("post")
  const [caption, setCaption] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // the name the user typed; until then it follows the day
  const [typed, setTyped] = useState(false)

  // fill in from the post each time the dialog opens
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const key = open ? (post?.id ?? "new") : null
  if (key !== openedFor) {
    setOpenedFor(key)
    if (key) {
      setTitle(post?.title ?? "")
      setDay(post?.publish_on?.slice(0, 10) ?? "")
      setFormat(post?.format ?? "post")
      setCaption(post?.caption ?? "")
      setFile(null)
      setError(null)
      setTyped(!!post)
    }
  }

  const shownTitle = typed ? title : title || defaultPostTitle(t, locale, day || null, number)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave({ title: shownTitle.trim() || defaultPostTitle(t, locale, day || null, number), publish_on: day || null, format, caption: caption.trim() }, file)
      onClose()
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't save the post"))
    }
    setSaving(false)
  }

  const field = "h-10 w-full rounded-lg bg-foreground/[0.06] px-3 text-[14px] text-foreground outline-none ring-1 ring-transparent placeholder:text-muted-foreground focus:ring-foreground/25"
  return (
    <Dialog isOpen={open} onOpenChange={(v) => !v && !saving && onClose()} className="gap-5 rounded-2xl p-5 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-[17px]">{post ? t("Edit the post") : t("New post")}</DialogTitle>
        <DialogDescription>{t("What it's called, when it goes out and what it says. The client sees the caption with the picture.")}</DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-muted-foreground">{t("Name")}</span>
          <input autoFocus value={shownTitle} onChange={(e) => { setTyped(true); setTitle(e.target.value) }} maxLength={120} className={field} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-muted-foreground">{t("Publishing day")}</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={cn(field, "[color-scheme:light] dark:[color-scheme:dark]")} />
        </label>
        <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("Format")}</span>
            <div role="radiogroup" aria-label={t("Format")} className="grid h-10 grid-cols-4 gap-0.5 rounded-lg bg-foreground/[0.06] p-0.5">
              {POST_FORMATS.map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={format === id} onClick={() => setFormat(id)} title={t(label)}
                  className={cn("truncate rounded-md px-1 text-[13px] font-medium transition-colors",
                    format === id ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:bg-[#636366]" : "text-muted-foreground hover:text-foreground")}>
                  {t(label)}
                </button>
              ))}
            </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between text-[12.5px] font-medium text-muted-foreground">
            {t("Caption")}
            <span className="tabular-nums">{caption.length}/{MAX_CAPTION}</span>
          </span>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))} rows={4} placeholder={t("The text under the post, hashtags included")}
            className={cn(field, "h-auto resize-none py-2.5 leading-snug")} />
        </label>

        {!post && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("File")} <span className="font-normal">· {t("optional, you can add it later")}</span></span>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = "" }} />
            {file ? (
              <div className="flex h-10 items-center gap-2 rounded-lg bg-foreground/[0.06] pr-1 pl-3 text-[13.5px]">
                <ImagePlusIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label={t("Remove")} className="flex size-8 items-center justify-center rounded-md hover:bg-hover"><XIcon className="size-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && /\.(png|jpe?g|webp|pdf)$/i.test(f.name)) setFile(f) }}
                className="flex h-16 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-[13px] text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
                <ImagePlusIcon className="size-4" />{t("Pick or drop a picture or PDF")}
              </button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="mt-1">
          <Button type="button" variant="outline" onPress={onClose} isDisabled={saving}>{t("Cancel")}</Button>
          <Button type="submit" isDisabled={saving}>{saving ? t("Saving…") : post ? t("Save") : t("Create post")}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

/** Save a post's details. */
export async function updatePost(post: Order, draft: Partial<PostDraft>) {
  const { error } = await supabase.from("orders").update(draft).eq("id", post.id)
  if (error) throw error
}

/**
 * A post's "⋯": edit its details, rename it in place, copy the client's link, open it in a new tab
 * or delete it, all without opening the post.
 */
export function PostMenu({ post, onEdit, onRename, onDeleted, className }: {
  post: Order
  onEdit: () => void
  /** Rename right on the card; without it, renaming goes through the edit dialog. */
  onRename?: () => void
  onDeleted: () => void
  className?: string
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${siteOrigin()}/portal/${post.id}`)
      markLinkShared()
      setCopied(true)
      window.setTimeout(() => { setCopied(false); setOpen(false) }, 900)
    } catch { setOpen(false) }
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] transition-colors"
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }} aria-label={t("Post actions")} aria-haspopup="menu" aria-expanded={open}
        className="flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm ring-1 ring-border backdrop-blur transition-colors hover:bg-card">
        <MoreHorizontalIcon className="size-4" />
      </button>
      {open && (
        <div role="menu" onClick={(e) => e.stopPropagation()}
          className="absolute top-[calc(100%+4px)] right-0 z-40 flex w-64 flex-col whitespace-nowrap gap-0.5 rounded-xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-border animate-in fade-in zoom-in-95 duration-100">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }} className={cn(item, "hover:bg-hover")}><PencilIcon className="size-4 opacity-70" />{t("Edit details")}</button>
          {onRename && <button type="button" role="menuitem" onClick={() => { setOpen(false); onRename() }} className={cn(item, "hover:bg-hover")}><TypeIcon className="size-4 opacity-70" />{t("Rename")}</button>}
          {post.file_url && <button type="button" role="menuitem" onClick={copy} className={cn(item, "hover:bg-hover")}>{copied ? <CheckIcon className="size-4" /> : <LinkIcon className="size-4 opacity-70" />}{copied ? t("Copied") : t("Copy the client link")}</button>}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); window.open(`/orders/${post.id}`, "_blank", "noopener") }} className={cn(item, "hover:bg-hover")}><ExternalLinkIcon className="size-4 opacity-70" />{t("Open in new tab")}</button>
          <div className="my-0.5 h-px bg-border" />
          <button type="button" role="menuitem" onClick={() => { setOpen(false); setConfirming(true) }} className={cn(item, "text-destructive hover:bg-destructive/10")}><Trash2Icon className="size-4" />{t("Delete")}</button>
        </div>
      )}
      <DeletePostDialog post={post} open={confirming} onOpenChange={setConfirming} onDeleted={onDeleted} />
    </div>
  )
}

function DeletePostDialog({ post, open, onOpenChange, onDeleted }: { post: Order; open: boolean; onOpenChange: (v: boolean) => void; onDeleted: () => void }) {
  const { t } = useT()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      await deleteOrder(post)
      notifyPlanChanged()
      onOpenChange(false)
      onDeleted()
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't delete the post"))
    }
    setDeleting(false)
  }
  return (
    <Dialog isOpen={open} onOpenChange={(v) => !deleting && onOpenChange(v)} className="rounded-2xl p-5 sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{t("Delete the post?")}</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{post.title || t("Untitled")}</span>{" "}
          {t("will be deleted with its file and the client's comments. This can't be undone.")}
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onPress={() => onOpenChange(false)} isDisabled={deleting}>{t("Cancel")}</Button>
        <Button variant="destructive" onPress={remove} isDisabled={deleting}>{deleting ? t("Deleting...") : t("Delete")}</Button>
      </DialogFooter>
    </Dialog>
  )
}

/** A post's name that turns into a box to rename it, saved on Enter or leaving it, dropped on Escape. */
export function RenameField({ post, onDone }: { post: Order; onDone: (title: string | null) => void }) {
  const { t } = useT()
  const settled = useRef(false)
  const finish = async (value: string | null) => {
    if (settled.current) return
    settled.current = true
    const next = value?.trim()
    if (!next || next === post.title) { onDone(null); return }
    try { await updatePost(post, { title: next }); onDone(next) } catch { onDone(null) }
  }
  return (
    <input
      autoFocus
      defaultValue={post.title}
      aria-label={t("Post name")}
      maxLength={120}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => { if (e.key === "Enter") finish(e.currentTarget.value); if (e.key === "Escape") finish(null) }}
      onBlur={(e) => finish(e.currentTarget.value)}
      className="h-7 w-full rounded-md bg-muted px-2 text-sm font-medium text-foreground outline-none ring-1 ring-foreground/25"
    />
  )
}

/** "Carousel", "Reels"…: shown on a post when it isn't a plain one. */
export function FormatTag({ format }: { format?: PostFormat }) {
  const { t } = useT()
  if (!format || format === "post") return null
  const label = POST_FORMATS.find(([id]) => id === format)?.[1] ?? format
  return <span className="inline-flex w-fit items-center rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{t(label)}</span>
}
