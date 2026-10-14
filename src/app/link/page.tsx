"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon, ChevronRightIcon, CopyIcon, ExternalLinkIcon, MailIcon, MessageCircleIcon, MoreHorizontalIcon, SendIcon, ShareIcon, SparklesIcon, XIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { AvatarPlaceholder } from "@/components/page/EditorBits"
import { NoNicheNotice } from "@/components/page/NoNicheNotice"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"
import { cleanPage, pagePath, type PageData } from "@/lib/page"
import type { Shop } from "@/components/dashboard/types"
import { nicheConfig } from "@/lib/niches"

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
      // a beauty or cake business counts the bookings and orders that came in, not requests
      const [{ data: viewRows }, { count }] = await Promise.all([
        supabase.from("page_views").select("day, count").eq("shop_id", shopData.id).gte("day", since),
        supabase.from(nicheConfig(shopData.niche) ? "crm_bookings" : "page_requests").select("id", { count: "exact", head: true }).eq("shop_id", shopData.id).gte("created_at", since + "T00:00:00Z"),
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

  const salon = nicheConfig(shop?.niche)
  const name = page?.data.title || shop?.name || ""
  const avatar = page ? page.data.avatar_url : shop?.logo_url ?? null
  const host = useSyncExternalStore(noop, () => window.location.host, () => "")
  const hello = hour < 5 ? t("Good evening") : hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening")
  const totalViews = days.reduce((n, d) => n + (views[d] ?? 0), 0)
  const peak = Math.max(1, ...days.map((d) => views[d] ?? 0))
  const weekday = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} activePage="link" />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* On a computer the page greets you itself, like the dashboard; phones keep the bar for the menu. */}
        <div className="lg:hidden">
          <DashboardHeader shopName={shop?.name || ""} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 sm:p-8">
            {/* Title and the page's link, like the app's other screens */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">{t("My page")}</h1>
                <p className="mt-1 text-[15px] text-muted-foreground">{hello}{name && `, ${name}`}</p>
              </div>
              {page?.published && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={copyLink} className="flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90">
                    {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}{copied ? t("Copied") : t("Copy Link")}
                  </button>
                  <button type="button" onClick={() => setShareOpen(true)} aria-label={t("Share")} title={t("Share")}
                    className="flex size-10 items-center justify-center rounded-full ring-1 ring-border hover:bg-hover"><ShareIcon className="size-4" /></button>
                </div>
              )}
            </div>

            {shop && <NoNicheNotice niche={shop.niche} />}
            {missingTable && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("Run supabase/pages.sql in Supabase first, then try again.")}</p>}

            {/* The page itself: face, name, address and the way into the editor */}
            {loading ? (
              <div className="h-[104px] animate-pulse rounded-[22px] apple-card" />
            ) : (
              <section className="flex flex-wrap items-center gap-4 rounded-[22px] apple-card p-4">
                <a href="/link/edit" aria-label={t("Edit")} className="size-[72px] shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-foreground/10">
                  {avatar
                    ? <img src={avatar} alt="" className="size-full object-cover" />
                    : salon ? <img src={`/niches/${salon.id}.svg`} alt="" className="size-full object-cover" /> : <AvatarPlaceholder className="size-full" />}
                </a>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[17px] font-semibold">{name}</span>
                  <span className="flex min-w-0 items-center gap-2 text-[14px] text-muted-foreground">
                    <span className={`size-2 shrink-0 rounded-full ${page?.published ? "bg-[var(--status-approved)]" : "bg-foreground/25"}`} />
                    {page?.published
                      ? <a href={pagePath(page.slug)} target="_blank" rel="noopener" className="truncate hover:text-foreground hover:underline">{host}{pagePath(page.slug)}</a>
                      : <span className="truncate">{page ? t("Draft") : t("Not created yet")}</span>}
                  </span>
                </div>
                <a href="/link/edit" className="flex h-10 shrink-0 items-center rounded-full bg-foreground/[0.06] px-5 text-[14px] font-medium hover:bg-foreground/[0.1]">
                  {page ? t("Edit") : t("Create")}
                </a>
              </section>
            )}

            {/* This week */}
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.01em]">{t("In the last week")}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard title={t("Visitors")} period={t("Last 7 days")}
                empty={totalViews === 0} emptyText={t("No activity during this time")} illustration={<GlobeArt />}
                footer={
                  <div className="flex flex-col items-start gap-3">
                    {tipOpen && <p className="text-[13px] text-muted-foreground">{t("Put this link in your Instagram bio and send it to clients.")}</p>}
                    <Pill onClick={() => setTipOpen((v) => !v)}><SparklesIcon className="size-4" />{t("How do I get more visitors?")}</Pill>
                  </div>
                }>
                <span className="text-[34px] leading-none font-semibold tabular-nums">{totalViews}</span>
                <div className="mt-auto flex h-24 items-end gap-2">
                  {days.map((d) => (
                    <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="w-full rounded-md bg-foreground" title={`${views[d] ?? 0}`}
                        style={{ height: `${Math.max(4, ((views[d] ?? 0) / peak) * 70)}px`, opacity: views[d] ? 0.85 : 0.12 }} />
                      <span className="text-[11px] text-muted-foreground">{weekday(d)}</span>
                    </div>
                  ))}
                </div>
              </StatCard>
              <StatCard title={salon ? (salon.kind === "order" ? t("Orders") : t("Appointments")) : t("Requests")} period={t("Last 7 days")}
                empty={requests === 0} emptyText={salon ? (salon.kind === "order" ? t("No new orders during this time") : t("No new appointments during this time")) : t("No requests during this time")} illustration={<InboxArt />}
                footer={salon
                  ? <Pill href="/dashboard">{salon.kind === "order" ? t("Open orders") : t("Open appointments")}<ChevronRightIcon className="size-4" /></Pill>
                  : <Pill href="/requests">{t("Open requests")}<ChevronRightIcon className="size-4" /></Pill>}>
                <span className="text-[34px] leading-none font-semibold tabular-nums">{requests}</span>
                <p className="mt-2 text-[14px] text-muted-foreground">{salon ? (salon.kind === "order" ? t("New orders this week") : t("New appointments this week")) : t("Requests from your page")}</p>
              </StatCard>
            </div>
            {page && !page.published && (
              <p className="text-[13px] text-muted-foreground">{t("Visits are counted once the page is live.")}</p>
            )}
          </div>
        </main>
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
    <section className="flex min-h-[300px] flex-col rounded-[22px] apple-card p-4 sm:p-5 md:h-[300px]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <span className="text-[13px] text-muted-foreground">{period}</span>
      </div>
      {empty ? (
        <>
          <p className="mt-3 text-[14px] text-muted-foreground">{emptyText}</p>
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
  const cls = "inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground/[0.06] px-4 text-[13.5px] font-medium hover:bg-foreground/[0.1]"
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
