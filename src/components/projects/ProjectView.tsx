"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlignLeftIcon, CalendarIcon, ChevronLeftIcon, CircleDotIcon, FileTextIcon, GalleryVerticalEndIcon,
  ImagePlusIcon, MessageSquareIcon, PlusIcon, SearchIcon, Table2Icon, TextIcon, Trash2Icon, UploadIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { STATUS_MAP, type Order } from "@/components/dashboard/types"
import { uploadOrderFile } from "@/lib/versions"
import { useFileUrl } from "@/lib/files"
import { cn, isPdfUrl } from "@/lib/utils"
import { useT, type T } from "@/lib/i18n"

// A project, laid out like a Notion database page: a big editable title, a few properties and
// its posts as a table or a gallery. Every post is an order of its own (kind = 'post'), so a
// click on a row opens the usual order page with pins, versions and approval.

const TITLE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.03em] text-foreground"
const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf"

type View = "table" | "gallery"

export function ProjectView({ project, onChange }: { project: Order; onChange: (p: Order) => void }) {
  const { t } = useT()
  const [posts, setPosts] = useState<Order[]>([])
  const [openPins, setOpenPins] = useState<Map<string, number>>(new Map())
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>("table")
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders").select("*").eq("project_id", project.id)
      .order("position", { ascending: true }).order("created_at", { ascending: true })
    if (error) { setError(error.message); return }
    const rows = (data as Order[]) ?? []
    setPosts(rows)
    if (rows.length) {
      const { data: pins } = await supabase.from("order_pins").select("order_id").in("order_id", rows.map((r) => r.id)).eq("resolved", false)
      const counts = new Map<string, number>()
      for (const p of (pins as { order_id: string }[] | null) ?? []) counts.set(p.order_id, (counts.get(p.order_id) ?? 0) + 1)
      setOpenPins(counts)
    }
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

  const nextPosition = () => (posts.length ? Math.max(...posts.map((p) => p.position ?? 0)) + 1 : 1)

  async function addPost(file?: File, at = nextPosition()) {
    const fileUrl = file ? await uploadOrderFile(project.shop_id, file) : null
    const { data, error } = await supabase.from("orders").insert({
      shop_id: project.shop_id,
      code: `${project.code}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      title: file ? file.name.replace(/\.[^.]+$/, "") : t("Untitled"),
      client_name: project.client_name,
      client_email: project.client_email,
      status: "await",
      kind: "post",
      project_id: project.id,
      position: at,
      file_url: fileUrl,
    }).select().single()
    if (error) throw error
    return data as Order
  }

  async function addPosts(files: File[]) {
    if (!files.length) return
    setError(null)
    let at = nextPosition()
    const added: Order[] = []
    try {
      for (const [i, file] of files.entries()) {
        setBusy(t("Uploading {n} of {total}…", { n: i + 1, total: files.length }))
        added.push(await addPost(file, at++))
      }
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't upload the file"))
    }
    setBusy(null)
    setPosts((prev) => [...prev, ...added.filter((a) => !prev.some((p) => p.id === a.id))])
  }

  async function addEmpty() {
    setError(null)
    try {
      const post = await addPost()
      setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [...prev, post]))
    } catch (e) {
      setError((e as Error)?.message ?? "")
    }
  }

  async function patchPost(id: string, patch: Partial<Order>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { error } = await supabase.from("orders").update(patch).eq("id", id)
    if (error) setError(error.message)
  }

  async function attachFile(post: Order, file: File) {
    setBusy(t("Uploading…"))
    try {
      const url = await uploadOrderFile(project.shop_id, file)
      await patchPost(post.id, { file_url: url })
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't upload the file"))
    }
    setBusy(null)
  }

  async function removePost(post: Order) {
    if (!window.confirm(t("Delete “{title}”? Its comments and versions go too.", { title: post.title }))) return
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
    const { error } = await supabase.from("orders").delete().eq("id", post.id)
    if (error) { setError(error.message); load() }
  }

  async function patchProject(patch: Partial<Order>) {
    onChange({ ...project, ...patch })
    const { error } = await supabase.from("orders").update(patch).eq("id", project.id)
    if (error) setError(error.message)
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? posts.filter((p) => `${p.title} ${p.caption ?? ""}`.toLowerCase().includes(q)) : posts
  }, [posts, query])

  const approved = posts.filter((p) => p.status === "approved" || p.status === "prod").length

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addPosts(Array.from(e.dataTransfer.files).filter((f) => /\.(png|jpe?g|webp|pdf)$/i.test(f.name)))
  }

  return (
    <div
      className="relative mx-auto w-full max-w-6xl px-4 pt-6 pb-24 sm:px-10 sm:pt-10"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={onDrop}
    >
      <Link href="/orders" className="mb-6 flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeftIcon className="size-3.5" />
        {t("Orders")}
      </Link>

      {/* the title is written straight on the page */}
      <EditableText
        value={project.title}
        placeholder={t("Untitled")}
        onSave={(title) => title.trim() && patchProject({ title: title.trim() })}
        className={cn(TITLE, "w-full text-3xl leading-tight sm:text-[40px]")}
        ariaLabel={t("Project name")}
      />

      {/* properties, Notion style */}
      <dl className="mt-5 grid max-w-xl grid-cols-[140px_1fr] items-center gap-x-2 gap-y-1 text-sm">
        <Property icon={TextIcon} label={t("Client")}>
          <EditableText
            value={project.client_name ?? ""}
            placeholder={t("Empty")}
            onSave={(v) => patchProject({ client_name: v.trim() })}
            className="w-full rounded-md px-2 py-1 hover:bg-hover"
            ariaLabel={t("Client")}
          />
        </Property>
        <Property icon={CircleDotIcon} label={t("Status")}>
          <span className="flex items-center gap-2 px-2 py-1">
            <StatusChip t={t} order={project} />
            {posts.length > 0 && <span className="text-xs text-muted-foreground">{t("{n} of {total} approved", { n: approved, total: posts.length })}</span>}
          </span>
        </Property>
        <Property icon={CalendarIcon} label={t("Deadline")}>
          <input
            type="date"
            value={project.deadline ?? ""}
            onChange={(e) => patchProject({ deadline: e.target.value || null })}
            className={cn("rounded-md bg-transparent px-2 py-1 outline-none hover:bg-hover", !project.deadline && "text-muted-foreground")}
            aria-label={t("Deadline")}
          />
        </Property>
      </dl>

      {/* views and actions */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div role="tablist" className="-mb-px flex gap-1">
          {([["table", Table2Icon, t("Table")], ["gallery", GalleryVerticalEndIcon, t("Gallery")]] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-2.5 pt-1 pb-2 text-sm transition-colors",
                view === id ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-1.5">
          <label className="flex h-8 items-center gap-1.5 rounded-md px-2 text-muted-foreground focus-within:bg-hover hover:bg-hover">
            <SearchIcon className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search")}
              className="w-24 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground sm:w-32"
            />
          </label>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <UploadIcon className="size-4" />
            <span className="hidden sm:inline">{t("Upload")}</span>
          </button>
          <button
            type="button"
            onClick={addEmpty}
            className="flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            <PlusIcon className="size-4" />
            {t("New post")}
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => { addPosts(Array.from(e.target.files ?? [])); e.target.value = "" }}
          />
        </div>
      </div>

      {(busy || error) && (
        <p className={cn("mt-3 text-sm", error ? "text-destructive" : "text-muted-foreground")}>{error ?? busy}</p>
      )}

      {!loaded ? (
        <p className="py-10 text-sm text-muted-foreground">{t("Loading...")}</p>
      ) : posts.length === 0 ? (
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="mt-6 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-16 text-center transition-colors hover:bg-hover"
        >
          <ImagePlusIcon className="size-7 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t("Drop your posts here")}</span>
          <span className="text-xs text-muted-foreground">{t("PNG, JPG or PDF. Each file becomes a post your client approves on its own.")}</span>
        </button>
      ) : view === "table" ? (
        <PostTable t={t} posts={shown} openPins={openPins} onPatch={patchPost} onAttach={attachFile} onRemove={removePost} onAdd={addEmpty} />
      ) : (
        <PostGallery t={t} posts={shown} openPins={openPins} onAdd={() => uploadRef.current?.click()} />
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-foreground/40 bg-background/80 text-sm font-medium text-foreground backdrop-blur-sm">
          {t("Drop to add posts")}
        </div>
      )}
    </div>
  )
}

// ── table ────────────────────────────────────────────────

const COLS = "grid-cols-[minmax(240px,2.2fr)_130px_150px_minmax(220px,3fr)_120px_40px]"

function PostTable({ t, posts, openPins, onPatch, onAttach, onRemove, onAdd }: {
  t: T
  posts: Order[]
  openPins: Map<string, number>
  onPatch: (id: string, patch: Partial<Order>) => void
  onAttach: (post: Order, file: File) => void
  onRemove: (post: Order) => void
  onAdd: () => void
}) {
  const head = [
    [TextIcon, t("Post")], [CircleDotIcon, t("Status")], [CalendarIcon, t("Publish date")],
    [AlignLeftIcon, t("Caption")], [MessageSquareIcon, t("Comments")],
  ] as const
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="table" className="min-w-[920px] text-sm">
        <div role="row" className={cn("grid border-b border-border text-xs text-muted-foreground", COLS)}>
          {head.map(([Icon, label], i) => (
            <div key={i} role="columnheader" className={cn("flex items-center gap-1.5 px-2 py-2", i > 0 && "border-l border-border")}>
              <Icon className="size-3.5" />
              {label}
            </div>
          ))}
          <div role="columnheader" className="border-l border-border" />
        </div>
        {posts.map((post) => (
          <PostRow key={post.id} t={t} post={post} open={openPins.get(post.id) ?? 0} onPatch={onPatch} onAttach={onAttach} onRemove={onRemove} />
        ))}
        <button type="button" onClick={onAdd} className="flex w-full items-center gap-2 border-b border-border px-2 py-2 text-muted-foreground transition-colors hover:bg-hover">
          <PlusIcon className="size-4" />
          {t("New post")}
        </button>
      </div>
    </div>
  )
}

function PostRow({ t, post, open, onPatch, onAttach, onRemove }: {
  t: T
  post: Order
  open: number
  onPatch: (id: string, patch: Partial<Order>) => void
  onAttach: (post: Order, file: File) => void
  onRemove: (post: Order) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div role="row" className={cn("group grid border-b border-border transition-colors hover:bg-foreground/[0.02]", COLS)}>
      <div role="cell" className="flex min-w-0 items-center gap-2.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title={post.file_url ? t("Replace the file in the post’s page") : t("Add a file")}
          disabled={!!post.file_url}
          className="shrink-0 disabled:cursor-default"
        >
          <Thumb url={post.file_url} className="size-9 rounded-md" />
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onAttach(post, f) }} />
        <EditableText
          value={post.title}
          placeholder={t("Untitled")}
          onSave={(v) => v.trim() && onPatch(post.id, { title: v.trim() })}
          className="min-w-0 flex-1 truncate rounded px-1 py-0.5 font-medium hover:bg-hover"
          ariaLabel={t("Post name")}
        />
        <Link
          href={`/orders/${post.id}`}
          className="shrink-0 rounded-md bg-card px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase opacity-0 ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
        >
          {t("Open")}
        </Link>
      </div>
      <div role="cell" className="flex items-center border-l border-border px-2">
        <StatusChip t={t} order={post} />
      </div>
      <div role="cell" className="flex items-center border-l border-border px-1">
        <input
          type="date"
          value={post.publish_on ?? ""}
          onChange={(e) => onPatch(post.id, { publish_on: e.target.value || null })}
          className={cn("w-full rounded-md bg-transparent px-1 py-1 outline-none hover:bg-hover", !post.publish_on && "text-muted-foreground/60")}
          aria-label={t("Publish date")}
        />
      </div>
      <div role="cell" className="flex items-center border-l border-border px-1">
        <EditableText
          value={post.caption ?? ""}
          placeholder={t("Add a caption")}
          multiline
          onSave={(v) => onPatch(post.id, { caption: v })}
          className="w-full rounded-md px-1 py-1 text-muted-foreground hover:bg-hover focus:text-foreground"
          ariaLabel={t("Caption")}
        />
      </div>
      <div role="cell" className="flex items-center gap-1.5 border-l border-border px-2">
        {open > 0 ? (
          <span className="flex items-center gap-1 font-medium text-[var(--status-changes)]"><MessageSquareIcon className="size-3.5" />{open}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>
      <div role="cell" className="flex items-center justify-center border-l border-border">
        <button
          type="button"
          onClick={() => onRemove(post)}
          aria-label={t("Delete post")}
          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-hover hover:text-destructive focus-visible:opacity-100"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── gallery ──────────────────────────────────────────────

function PostGallery({ t, posts, openPins, onAdd }: { t: T; posts: Order[]; openPins: Map<string, number>; onAdd: () => void }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {posts.map((post) => (
        <Link key={post.id} href={`/orders/${post.id}`} className="group overflow-hidden rounded-xl bg-card ring-1 ring-border transition-shadow hover:shadow-lg">
          <Thumb url={post.file_url} className="aspect-[4/5] w-full" />
          <div className="flex flex-col gap-1.5 border-t border-border p-3">
            <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
            {post.caption && <p className="line-clamp-2 text-xs text-muted-foreground">{post.caption}</p>}
            <div className="flex items-center justify-between gap-2">
              <StatusChip t={t} order={post} />
              {(openPins.get(post.id) ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-[var(--status-changes)]"><MessageSquareIcon className="size-3" />{openPins.get(post.id)}</span>
              )}
            </div>
          </div>
        </Link>
      ))}
      <button type="button" onClick={onAdd} className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
        <PlusIcon className="size-5" />
        {t("Add posts")}
      </button>
    </div>
  )
}

// ── bits ─────────────────────────────────────────────────

function Property({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="flex items-center gap-2 py-1 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

function StatusChip({ t, order }: { t: T; order: Order }) {
  const s = STATUS_MAP[order.status]
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {t(s.label)}
    </span>
  )
}

/** The post's file in small: the image itself, a PDF mark, or an empty "add" tile. */
function Thumb({ url, className }: { url: string | null; className?: string }) {
  const src = useFileUrl(url)
  if (!url) {
    return (
      <span className={cn("flex items-center justify-center bg-foreground/[0.04] text-muted-foreground ring-1 ring-border ring-inset", className)}>
        <ImagePlusIcon className="size-4" />
      </span>
    )
  }
  if (isPdfUrl(url)) {
    return (
      <span className={cn("flex items-center justify-center bg-foreground/[0.04] text-muted-foreground", className)}>
        <FileTextIcon className="size-4" />
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private files come through short-lived signed links
    <img src={src ?? undefined} alt="" className={cn("bg-foreground/[0.04] object-cover", className)} />
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
