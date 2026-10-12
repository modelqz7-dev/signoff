"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowRightIcon, CheckIcon, FileTextIcon, Grid3x3Icon, ImageIcon, LayoutListIcon, LockIcon, MessageSquareIcon } from "lucide-react"
import type { PortalOrder } from "@/lib/portal-client"
import { isPdfUrl, cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BrandMark, MadeWithNodly, PortalContactCard, PortalWelcome, usePortalBrand } from "@/components/portal/PortalBrand"
import { POST_FORMATS } from "@/components/projects/PostTools"

// The client's side of a project: the whole content plan behind one link. They see every post
// with its picture, caption, day and format, approve them one by one or all at once, and open a
// post to leave comments right on the picture. Everything goes through /api/plan/[id]/*.

/** A plan's post; `locked` when it has a password of its own and opens only in its portal. */
type Post = PortalOrder & { locked?: boolean }
type Plan = { project: { id: string; title: string; client_name: string }; posts: Post[]; open: Record<string, number>; viewer: string }
type Phase = "loading" | "auth" | "view" | "missing"

const POLL_MS = 8000
const isDone = (p: Post) => p.status === "approved" || p.status === "prod"

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store", credentials: "same-origin" })
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { res, body }
}

export default function PlanPage() {
  const id = useParams().id as string
  const { t, locale } = useT()
  const brand = usePortalBrand(id)
  const [phase, setPhase] = useState<Phase>("loading")
  const [plan, setPlan] = useState<Plan | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [view, setView] = useState<"plan" | "feed">("plan")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  const load = useCallback(async () => {
    const { res, body } = await api(`/api/plan/${id}/state`)
    if (res.ok && body) { setPlan(body as Plan); setPhase("view"); return }
    if (res.status === 401) { setHasPassword(!!body?.hasPassword); setPhase((p) => (p === "view" ? "view" : "auth")); return }
    if (res.status === 404) setPhase("missing")
  }, [id])

  useEffect(() => {
    const first = window.setTimeout(load, 0)
    const timer = window.setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => { window.clearTimeout(first); window.clearInterval(timer) }
  }, [load])

  async function decide(postIds: string[], status: "approved" | "changes") {
    setBusy(postIds.length > 1 ? "all" : postIds[0])
    setError(null)
    const { res, body } = await api(`/api/plan/${id}/decision`, { method: "POST", body: JSON.stringify({ postIds, status }) })
    setBusy(null)
    if (!res.ok) { setError(body?.error === "slow_down" ? t("Too many in a row. Wait a minute and try again.") : t("Something went wrong")); return }
    const updated = new Map((body.posts as Post[]).map((p) => [p.id, p]))
    setPlan((prev) => prev && { ...prev, posts: prev.posts.map((p) => updated.get(p.id) ?? p) })
  }

  if (phase === "loading") return <Screen><p className="text-sm text-muted-foreground">{t("Loading...")}</p></Screen>
  if (phase === "missing") return <Screen><p className="text-sm text-muted-foreground">{t("This link doesn't open anything. Ask for a new one.")}</p></Screen>
  if (phase === "auth" || !plan) return <SignIn id={id} brand={brand} hasPassword={hasPassword} onDone={load} />

  const ready = plan.posts.filter((p) => p.file_url)
  const making = plan.posts.filter((p) => !p.file_url && !p.locked).length
  const approved = ready.filter(isDone)
  const toApprove = ready.filter((p) => !isDone(p))
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long" })

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <BrandMark brand={brand} className="min-w-0 flex-1" />
          <LanguageSwitcher className="hidden sm:flex" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-32 sm:px-6">
        <p className="text-[13px] font-medium text-muted-foreground">{t("Content plan")}{plan.project.client_name ? ` · ${plan.project.client_name}` : ""}</p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-[-0.02em] sm:text-[34px]">{plan.project.title || t("Untitled")}</h1>
        <PortalWelcome brand={brand} className="mt-3 max-w-2xl" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-56 flex-1 flex-col gap-2">
            <p className="text-[14px]">
              <span className="font-semibold">{t("{n} of {m} approved", { n: approved.length, m: ready.length })}</span>
              {making > 0 && <span className="text-muted-foreground"> · {t("{n} still being made", { n: making })}</span>}
            </p>
            <div className="h-1.5 max-w-sm overflow-hidden rounded-full bg-foreground/[0.08]">
              <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${ready.length ? (approved.length / ready.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div role="tablist" className="flex rounded-[9px] bg-foreground/[0.06] p-0.5">
            {([["plan", t("Posts"), LayoutListIcon], ["feed", t("As in the feed"), Grid3x3Icon]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={cn("flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  view === v ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:bg-[#636366]" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        {plan.posts.length === 0 ? (
          <p className="mt-16 text-center text-[15px] text-muted-foreground">{t("The posts aren't here yet. You'll see them as soon as they're ready.")}</p>
        ) : view === "feed" ? (
          <Feed posts={plan.posts} />
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plan.posts.map((post) => (
              <PostCard key={post.id} post={post} open={plan.open[post.id] ?? 0} day={day} busy={busy === post.id || busy === "all"}
                onApprove={() => decide([post.id], "approved")} />
            ))}
          </div>
        )}

        <PortalContactCard brand={brand} className="mt-10 max-w-md" />
        <MadeWithNodly brand={brand} className="mt-10" />
      </main>

      {/* approve everything that's ready in one go */}
      {toApprove.length > 1 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-[13.5px] text-muted-foreground">{t("{n} posts wait for your decision", { n: toApprove.length })}</p>
            {confirmAll ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setConfirmAll(false)} className="h-10 rounded-full px-4 text-[14px] font-medium hover:bg-hover">{t("Cancel")}</button>
                <button type="button" disabled={busy !== null} onClick={async () => { await decide(toApprove.map((p) => p.id), "approved"); setConfirmAll(false) }}
                  className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  <CheckIcon className="size-4" />{busy === "all" ? t("Approving…") : t("Yes, approve {n}", { n: toApprove.length })}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmAll(true)}
                className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:opacity-90">
                <CheckIcon className="size-4" />{t("Approve all")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">{children}</div>
}

/** A post of the plan: picture, day and format, name, caption, and the decision. */
function PostCard({ post, open, day, busy, onApprove }: { post: Post; open: number; day: (iso: string) => string; busy: boolean; onApprove: () => void }) {
  const { t } = useT()
  const [more, setMore] = useState(false)
  const done = isDone(post)
  const format = POST_FORMATS.find(([f]) => f === post.format)
  const href = `/portal/${post.id}`
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      {post.file_url ? (
        <a href={href} className="relative block aspect-[4/5] overflow-hidden bg-foreground/[0.04]">
          {isPdfUrl(post.file_url) ? (
            <span className="flex size-full flex-col items-center justify-center gap-2 text-[13px] text-muted-foreground"><FileTextIcon className="size-8" />PDF</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived links
            <img src={post.file_url} alt={post.title} className="size-full object-cover" loading="lazy" />
          )}
          {done && <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[12px] font-semibold backdrop-blur"><CheckIcon className="size-3.5" />{t("Approved")}</span>}
        </a>
      ) : post.locked ? (
        <a href={href} className="flex aspect-[4/5] flex-col items-center justify-center gap-2 bg-foreground/[0.04] px-6 text-center text-[13px] text-muted-foreground hover:bg-foreground/[0.07]">
          <LockIcon className="size-7" />{t("This post has its own password. Open it to see it.")}
        </a>
      ) : (
        <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 bg-foreground/[0.04] text-[13px] text-muted-foreground">
          <ImageIcon className="size-7" />{t("Being made")}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
          {post.publish_on && <span>{day(post.publish_on)}</span>}
          {format && format[0] !== "post" && <span className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[11.5px] font-medium">{t(format[1])}</span>}
        </p>
        <h2 className="text-[15.5px] leading-snug font-semibold">{post.title}</h2>
        {post.caption && (
          <button type="button" onClick={() => setMore((v) => !v)} className="text-left">
            <p className={cn("text-[14px] leading-relaxed whitespace-pre-line text-foreground/80", !more && "line-clamp-4")}>{post.caption}</p>
          </button>
        )}
        {open > 0 && <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><MessageSquareIcon className="size-3.5" />{t("{n} open comments", { n: open })}</p>}
        {post.locked && (
          <a href={href} className="mt-auto flex h-10 items-center justify-center gap-1.5 rounded-full bg-foreground/[0.06] text-[14px] font-medium hover:bg-foreground/[0.1]">{t("Open")}<ArrowRightIcon className="size-4" /></a>
        )}
        {post.file_url && (
          <div className="mt-auto flex gap-2 pt-2">
            {done ? (
              <a href={href} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground/[0.06] text-[14px] font-medium hover:bg-foreground/[0.1]">{t("Open")}<ArrowRightIcon className="size-4" /></a>
            ) : (
              <>
                <button type="button" onClick={onApprove} disabled={busy}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  <CheckIcon className="size-4" />{busy ? t("Approving…") : t("Approve")}
                </button>
                <a href={href} className="flex h-10 flex-1 items-center justify-center rounded-full bg-foreground/[0.06] text-[14px] font-medium hover:bg-foreground/[0.1]">{t("Changes")}</a>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

/** The posts as the account's grid will show them: newest first, three square tiles a row. */
function Feed({ posts }: { posts: Post[] }) {
  const { t } = useT()
  const shown = [...posts].reverse()
  return (
    <div className="mx-auto mt-6 max-w-[480px] overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      <div className="grid grid-cols-3 gap-0.5">
        {shown.map((post) => (
          <a key={post.id} href={post.file_url || post.locked ? `/portal/${post.id}` : undefined} className="relative aspect-square overflow-hidden bg-foreground/[0.05]">
            {post.file_url && !isPdfUrl(post.file_url)
              // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived links
              ? <img src={post.file_url} alt={post.title} className="size-full object-cover" loading="lazy" />
              : <span className="flex size-full items-center justify-center p-2 text-center text-[11px] text-muted-foreground">{post.file_url ? "PDF" : post.locked ? <LockIcon className="size-4" /> : t("Being made")}</span>}
            {isDone(post) && <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-background/90"><CheckIcon className="size-3" strokeWidth={3} /></span>}
          </a>
        ))}
      </div>
    </div>
  )
}

/** The client's name (and the plan's password, if there is one), asked once per device. */
function SignIn({ id, brand, hasPassword, onDone }: { id: string; brand: ReturnType<typeof usePortalBrand>; hasPassword: boolean; onDone: () => void }) {
  const { t } = useT()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(t("Enter your name")); return }
    setBusy(true)
    setError("")
    const { res, body } = await api(`/api/plan/${id}/session`, { method: "POST", body: JSON.stringify({ name: name.trim(), password }) })
    setBusy(false)
    if (res.ok) { onDone(); return }
    setError(body?.error === "wrong_password" ? t("Incorrect password") : body?.error === "too_many_attempts" ? t("Too many attempts. Try again in 15 minutes.") : t("Something went wrong"))
  }
  const field = "h-11 w-full rounded-xl bg-foreground/[0.06] px-3.5 text-[15px] outline-none ring-1 ring-transparent placeholder:text-muted-foreground focus:ring-foreground/25"
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <div className="flex justify-end gap-1 p-3"><LanguageSwitcher /><ThemeToggle /></div>
      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
          <BrandMark brand={brand} />
          <div>
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{t("Your content plan")}</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">{t("All the posts in one place. Enter your name to see them, comment and approve.")}</p>
          </div>
          <PortalWelcome brand={brand} />
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name")} aria-label={t("Your name")} maxLength={80} className={field} />
          {hasPassword && <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("Password")} aria-label={t("Password")} className={field} />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={busy} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy ? t("Loading...") : t("Open the plan")}<ArrowRightIcon className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
