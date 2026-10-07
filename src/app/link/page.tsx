"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon, ChevronRightIcon, CopyIcon, ExternalLinkIcon, Link2Icon, MailIcon, MessageCircleIcon, MoreHorizontalIcon, SendIcon, ShareIcon, SparklesIcon, XIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { AvatarPlaceholder } from "@/components/page/EditorBits"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"
import { modeMain } from "@/lib/mode-transition"
import { cleanPage, pagePath, suggestSlug, type PageData } from "@/lib/page"
import type { Shop } from "@/components/dashboard/types"

type PageRow = { slug: string; published: boolean; data: PageData }

const noop = () => () => {}

/** The last 7 days, oldest first, as YYYY-MM-DD (the server counts visits by UTC day). */
function lastWeek() {
  const days: string[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i)).toISOString().slice(0, 10))
  }
  return days
}

/** "My page": the page card, its address and how it did this week. Editing happens in /link/edit. */
export default function MyPage() {
  const router = useRouter()
  const { t, locale } = useT()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [page, setPage] = useState<PageRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [missingTable, setMissingTable] = useState(false)
  const [days] = useState(lastWeek)
  const [hour] = useState(() => new Date().getHours())
  const [views, setViews] = useState<Record<string, number>>({})
  const [requests, setRequests] = useState(0)
  const [copied, setCopied] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: shopData } = await getOrCreateShop(session.user)
      if (!shopData) { setLoading(false); return }
      setShop(shopData)
      const { data: row, error } = await supabase.from("shop_pages").select("slug, published, data").eq("shop_id", shopData.id).maybeSingle()
      if (error && /shop_pages|relation|schema cache/i.test(error.message)) setMissingTable(true)
      if (row) setPage({ slug: row.slug, published: row.published, data: cleanPage(row.data, shopData.name) })
      setLoading(false)
      if (!row) return
      const since = days[0]
      const [{ data: viewRows }, { count }] = await Promise.all([
        supabase.from("page_views").select("day, count").eq("shop_id", shopData.id).gte("day", since),
        supabase.from("page_requests").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id).gte("created_at", since + "T00:00:00Z"),
      ])
      setViews(Object.fromEntries(((viewRows as { day: string; count: number }[]) || []).map((v) => [v.day, v.count])))
      setRequests(count ?? 0)
    }
    init()
  }, [router, days])

  async function copyLink() {
    if (!page) return
    await navigator.clipboard.writeText(window.location.origin + pagePath(page.slug)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const name = page?.data.title || shop?.name || ""
  const avatar = page ? page.data.avatar_url : shop?.logo_url ?? null
  const host = useSyncExternalStore(noop, () => window.location.host, () => "")
  const hello = hour < 5 ? t("Good evening") : hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening")
  const totalViews = days.reduce((n, d) => n + (views[d] ?? 0), 0)
  const peak = Math.max(1, ...days.map((d) => views[d] ?? 0))
  const weekday = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage="link" />
      <div {...modeMain("page")} className="flex min-w-0 flex-1 flex-col">
        {/* On a computer the page greets you itself, like the dashboard; phones keep the bar for the menu. */}
        <div className="lg:hidden">
          <DashboardHeader shopName={shop?.name || ""} avatarUrl="" sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        <div className="flex-1 px-4 pb-10 sm:px-8">
          <div className="mx-auto flex w-full max-w-[1216px] flex-col">
            {/* Greeting and the address, pinned to the top */}
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background pt-8 pb-4">
              <h1 className="min-w-0 truncate text-2xl leading-7 font-bold tracking-tight">{hello}{name && `, ${name}`}</h1>
              <div className="flex h-10 max-w-full items-center gap-2 rounded-full bg-muted pr-1.5 pl-4 text-[15px] font-medium">
                <Link2Icon className="size-4 shrink-0" />
                {page?.published
                  ? <a href={pagePath(page.slug)} target="_blank" rel="noopener" className="truncate hover:underline">{host}{pagePath(page.slug)}</a>
                  : <a href="/link/edit" className="truncate text-muted-foreground hover:underline">{host}{pagePath(page?.slug ?? (shop ? suggestSlug(shop.name) : ""))}</a>}
                <button type="button" onClick={() => setShareOpen(true)} aria-label={t("Share")} title={t("Share")}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-background">
                  <ShareIcon className="size-4" />
                </button>
              </div>
            </div>

            {missingTable && <p className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("Run supabase/pages.sql in Supabase first, then try again.")}</p>}

            {/* The page card */}
            <h2 className="mt-9 mb-6 text-xl leading-7 font-bold tracking-tight">{t("Your page")}</h2>
            {loading ? (
              <div className="h-[356px] w-[280px] animate-pulse rounded-3xl bg-muted" />
            ) : (
              <div className="relative flex h-[356px] w-[280px] max-w-full flex-col rounded-3xl bg-muted p-px">
                {/* The preview area is 278×276, the name and buttons sit in the 78px under it. */}
                <a href="/link/edit" aria-label={t("Edit")} className="flex h-[276px] w-[278px] max-w-full shrink-0 items-center justify-center rounded-t-[23px]">
                  {avatar
                    ? <img src={avatar} alt="" className="size-[164px] rounded-full object-cover" />
                    : <AvatarPlaceholder className="size-[164px]" />}
                </a>
                <div className="flex flex-1 items-center gap-2 px-4 pb-px">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xl leading-7 font-bold tracking-tight">{name}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {page ? (page.published ? t("{n} links", { n: page.data.links.length }) : t("Draft")) : t("Not created yet")}
                    </span>
                  </div>
                  {page && (
                    <button type="button" onClick={() => setShareOpen(true)} aria-label={t("Share")} title={t("Share")}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70 hover:bg-background">
                      <ShareIcon className="size-[18px]" />
                    </button>
                  )}
                  <a href="/link/edit" className="flex h-10 shrink-0 items-center rounded-full bg-background/70 px-4 text-sm font-medium hover:bg-background">
                    {page ? t("Edit") : t("Create")}
                  </a>
                </div>
              </div>
            )}

            {/* This week */}
            <h2 className="mt-[29px] mb-6 text-xl leading-7 font-bold tracking-tight">{t("In the last week")}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <StatCard title={t("Visitors")} period={t("Last 7 days")}
                empty={totalViews === 0} emptyText={t("No activity during this time")} illustration={<GlobeArt />}
                footer={
                  <div className="flex flex-col items-start gap-3">
                    {tipOpen && <p className="text-sm text-muted-foreground">{t("Put this link in your Instagram bio and send it to clients.")}</p>}
                    <Pill onClick={() => setTipOpen((v) => !v)}><SparklesIcon className="size-4 text-violet-500" />{t("How do I get more visitors?")}</Pill>
                  </div>
                }>
                <span className="text-4xl font-bold tabular-nums">{totalViews}</span>
                <div className="mt-auto flex h-24 items-end gap-2">
                  {days.map((d) => (
                    <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="w-full rounded-md bg-primary/80" title={`${views[d] ?? 0}`}
                        style={{ height: `${Math.max(4, ((views[d] ?? 0) / peak) * 70)}px`, opacity: views[d] ? 1 : 0.15 }} />
                      <span className="text-[11px] text-muted-foreground">{weekday(d)}</span>
                    </div>
                  ))}
                </div>
              </StatCard>
              <StatCard title={t("Requests")} period={t("Last 7 days")}
                empty={requests === 0} emptyText={t("No requests during this time")} illustration={<InboxArt />}
                footer={<Pill href="/requests">{t("Open requests")}<ChevronRightIcon className="size-4" /></Pill>}>
                <span className="text-4xl font-bold tabular-nums">{requests}</span>
                <p className="mt-2 text-sm text-muted-foreground">{t("Requests from your page")}</p>
              </StatCard>
            </div>
            {page && !page.published && (
              <p className="mt-4 text-sm text-muted-foreground">{t("Visits are counted once the page is live.")}</p>
            )}
          </div>
        </div>
      </div>
      {shareOpen && <ShareSheet page={page} copied={copied} onCopy={copyLink} onClose={() => setShareOpen(false)} />}
    </div>
  )
}

/** "Share your page": the link with Copy, quick ways to send it, or what to do first. */
function ShareSheet({ page, copied, onCopy, onClose }: { page: PageRow | null; copied: boolean; onCopy: () => void; onClose: () => void }) {
  const { t } = useT()
  const link = page && typeof window !== "undefined" ? window.location.origin + pagePath(page.slug) : ""
  const text = encodeURIComponent(link)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const canShare = typeof navigator !== "undefined" && !!navigator.share
  const item = "flex flex-col items-center gap-2 text-xs"
  const circle = "flex size-14 items-center justify-center rounded-full bg-muted hover:bg-hover-strong [&_svg]:size-5"
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("Share your page")} onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col gap-5 rounded-t-3xl bg-card p-6 shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("Share your page")}</h2>
          <button type="button" aria-label={t("Close")} onClick={onClose} className="flex size-8 items-center justify-center rounded-full hover:bg-hover"><XIcon className="size-4" /></button>
        </div>
        {!page || !page.published ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{!page ? t("Create your page first, then share its link anywhere.") : t("Publish your page to share it")}</p>
            <a href="/link/edit" className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90">
              {!page ? t("Create page") : t("Open the editor to publish")}
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              <a className={item} href={`https://t.me/share/url?url=${text}`} target="_blank" rel="noopener"><span className={circle}><SendIcon /></span>Telegram</a>
              <a className={item} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener"><span className={circle}><MessageCircleIcon /></span>WhatsApp</a>
              <a className={item} href={`mailto:?body=${text}`}><span className={circle}><MailIcon /></span>{t("Email")}</a>
              {canShare
                ? <button type="button" className={item} onClick={() => navigator.share({ url: link }).catch(() => {})}><span className={circle}><MoreHorizontalIcon /></span>{t("More")}</button>
                : <a className={item} href={link} target="_blank" rel="noopener"><span className={circle}><ExternalLinkIcon /></span>{t("Open")}</a>}
            </div>
            <div className="flex h-12 items-center gap-2 rounded-2xl bg-muted pr-1.5 pl-4">
              <span className="min-w-0 flex-1 truncate text-sm">{link.replace(/^https?:\/\//, "")}</span>
              <button type="button" onClick={onCopy} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground">
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}{copied ? t("Copied") : t("Copy")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t("Put this link in your Instagram bio and send it to clients.")}</p>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, period, empty, emptyText, illustration, footer, children }: {
  title: string; period: string; empty: boolean; emptyText: string; illustration: React.ReactNode; footer: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="flex min-h-[340px] flex-col rounded-3xl md:h-[340px] bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold">{title}</h3>
        <span className="flex items-center gap-1 text-sm">{period}<ChevronRightIcon className="size-4 text-muted-foreground" /></span>
      </div>
      {empty ? (
        <>
          <p className="mt-4 text-[15px]">{emptyText}</p>
          <div className="flex flex-1 items-center justify-center py-6 text-muted-foreground/70">{illustration}</div>
        </>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">{children}</div>
      )}
      <div className="mt-4">{footer}</div>
    </section>
  )
}

function Pill({ href, onClick, children }: { href?: string; onClick?: () => void; children: React.ReactNode }) {
  const cls = "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm ring-1 ring-foreground/10 hover:bg-hover"
  return href ? <a href={href} className={cls}>{children}</a> : <button type="button" onClick={onClick} className={cls}>{children}</button>
}

function GlobeArt() {
  return (
    <svg viewBox="0 0 110 120" className="h-28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="55" cy="70" r="47" />
      <path d="M55 23c-15 14-15 80 0 94M55 23c15 14 15 80 0 94M8 70h94" />
      <path d="M72 6a14 14 0 0 1 14 14c0 11-14 24-14 24S58 31 58 20A14 14 0 0 1 72 6Z" className="fill-current" stroke="none" />
      <circle cx="72" cy="20" r="5" className="fill-card" stroke="none" />
      <path d="M38 50a13 13 0 0 1 13 13c0 10-13 22-13 22S25 73 25 63a13 13 0 0 1 13-13Z" className="fill-current" stroke="none" />
      <circle cx="38" cy="63" r="4.5" className="fill-card" stroke="none" />
    </svg>
  )
}

function InboxArt() {
  return (
    <svg viewBox="0 0 120 100" className="h-24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M10 55 28 18h64l18 37v32H10Z" />
      <path d="M10 55h30c0 9 9 15 20 15s20-6 20-15h30" />
      <path d="M40 34h40M44 44h32" strokeLinecap="round" />
    </svg>
  )
}
