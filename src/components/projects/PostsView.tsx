"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckIcon, CopyIcon, ImagePlusIcon, LinkIcon, MessageSquareIcon, UploadIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Order } from "@/components/dashboard/types"
import { StatusChip, Thumb } from "@/components/projects/PostBits"
import { markLinkShared } from "@/lib/onboarding"
import { siteOrigin } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// The simple way through a project, and the one it opens on: upload the posts, send the client
// their links, watch each one turn approved. The canvas is there for whoever wants more.

const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf"

const portalLink = (post: Order) => `${siteOrigin()}/portal/${post.id}`

export function PostsView({ posts, onUpload, busy }: {
  posts: Order[]
  onUpload: (files: File[]) => Promise<unknown>
  busy: boolean
}) {
  const { t } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const openPins = useOpenPins(posts)

  const approved = posts.filter((p) => p.status === "approved" || p.status === "prod").length
  const changes = posts.filter((p) => p.status === "changes").length
  const waiting = posts.length - approved - changes

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      markLinkShared()
      setCopied(key)
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000)
    } catch {}
  }

  /** Every post's link in one message, ready to paste to the client. */
  const allLinks = () => posts.map((p, i) => `${i + 1}. ${p.title}: ${portalLink(p)}`).join("\n")

  const pick = () => fileRef.current?.click()
  const files = (list: FileList | null) => Array.from(list ?? []).filter((f) => /\.(png|jpe?g|webp|pdf)$/i.test(f.name))

  return (
    <div
      className="relative h-full overflow-y-auto"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = files(e.dataTransfer.files); if (f.length) onUpload(f) }}
    >
      <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => { const f = files(e.target.files); e.target.value = ""; if (f.length) onUpload(f) }} />

      <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 sm:px-8">
        {posts.length === 0 ? (
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="mt-6 flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-6 py-20 text-center transition-colors hover:bg-hover disabled:opacity-60"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-foreground/[0.06]">
              <ImagePlusIcon className="size-6 text-foreground" />
            </span>
            <span className="text-base font-semibold text-foreground">{busy ? t("Uploading…") : t("Upload posts")}</span>
            <span className="max-w-sm text-sm text-muted-foreground">
              {t("Pick or drop your posts: PNG, JPG or PDF. Each one gets its own link, and your client approves them one by one.")}
            </span>
          </button>
        ) : (
          <>
            {/* where things stand, and the two things to do */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-60 flex-1 flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  {t("{n} posts", { n: posts.length })} · <span className="text-[var(--status-approved)]">{t("{n} approved", { n: approved })}</span>
                  {changes > 0 && <> · <span className="text-[var(--status-changes)]">{t("{n} with changes", { n: changes })}</span></>}
                  {waiting > 0 && <> · {t("{n} waiting", { n: waiting })}</>}
                </p>
                <div className="flex h-1.5 max-w-md overflow-hidden rounded-full bg-foreground/[0.08]">
                  <span className="bg-[var(--status-approved)] transition-[width]" style={{ width: `${(approved / posts.length) * 100}%` }} />
                  <span className="bg-[var(--status-changes)] transition-[width]" style={{ width: `${(changes / posts.length) * 100}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(allLinks(), "all")}
                  className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-border transition-colors hover:bg-hover"
                >
                  {copied === "all" ? <CheckIcon className="size-4 text-[var(--status-approved)]" /> : <LinkIcon className="size-4" />}
                  {copied === "all" ? t("Copied") : t("Copy links for the client")}
                </button>
                <button
                  type="button"
                  onClick={pick}
                  disabled={busy}
                  className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
                >
                  <UploadIcon className="size-4" />
                  {busy ? t("Uploading…") : t("Upload posts")}
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {posts.map((post) => (
                <div key={post.id} className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border">
                  <Link href={`/orders/${post.id}`} className="block">
                    <Thumb url={post.file_url} className="aspect-[4/5] w-full" />
                  </Link>
                  <div className="flex flex-1 flex-col gap-2 border-t border-border p-3">
                    <Link href={`/orders/${post.id}`} className="truncate text-sm font-medium text-foreground hover:underline">{post.title}</Link>
                    <div className="flex items-center justify-between gap-2">
                      <StatusChip t={t} order={post} />
                      {(openPins.get(post.id) ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-[var(--status-changes)]">
                          <MessageSquareIcon className="size-3" />
                          {openPins.get(post.id)}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex gap-1.5 pt-1">
                      <Link href={`/orders/${post.id}`} className="flex h-8 flex-1 items-center justify-center rounded-md text-xs font-medium ring-1 ring-border transition-colors hover:bg-hover">
                        {t("Open")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => copy(portalLink(post), post.id)}
                        title={t("Copy the client link")}
                        aria-label={t("Copy the client link")}
                        className={cn(
                          "flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium ring-1 ring-border transition-colors hover:bg-hover",
                          copied === post.id && "text-[var(--status-approved)]"
                        )}
                      >
                        {copied === post.id ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                        {copied === post.id ? t("Copied") : t("Link")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={pick}
                disabled={busy}
                className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-hover hover:text-foreground disabled:opacity-60"
              >
                <ImagePlusIcon className="size-5" />
                {t("Add posts")}
              </button>
            </div>
          </>
        )}
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl border-2 border-dashed border-foreground/40 bg-background/80 text-sm font-medium text-foreground backdrop-blur-sm">
          {t("Drop to add posts")}
        </div>
      )}
    </div>
  )
}

/** Open (unresolved) client comments per post. */
function useOpenPins(posts: Order[]) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const ids = posts.map((p) => p.id).join(",")
  useEffect(() => {
    if (!ids) return
    let cancelled = false
    supabase.from("order_pins").select("order_id").in("order_id", ids.split(",")).eq("resolved", false)
      .then(({ data }) => {
        if (cancelled) return
        const m = new Map<string, number>()
        for (const p of (data as { order_id: string }[] | null) ?? []) m.set(p.order_id, (m.get(p.order_id) ?? 0) + 1)
        setCounts(m)
      })
    return () => { cancelled = true }
  }, [ids])
  return counts
}
