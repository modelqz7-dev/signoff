"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, CheckIcon, CopyIcon, ExternalLinkIcon, EyeIcon, InboxIcon, PencilIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { PageView } from "@/components/page/PageView"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"
import { cleanPage, pagePath, type PageData } from "@/lib/page"
import type { Shop } from "@/components/dashboard/types"

type PageRow = { slug: string; published: boolean; data: PageData }

/** The last 7 days, oldest first, as YYYY-MM-DD in the visitor's day (the server counts in UTC). */
function lastWeek() {
  const days: string[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i))
    days.push(d.toISOString().slice(0, 10))
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
  const [views, setViews] = useState<Record<string, number>>({})
  const [requests, setRequests] = useState(0)
  const [copied, setCopied] = useState(false)

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

  const url = page ? (typeof window === "undefined" ? "" : window.location.host) + pagePath(page.slug) : ""
  async function copy() {
    if (!page) return
    await navigator.clipboard.writeText(window.location.origin + pagePath(page.slug)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const totalViews = days.reduce((n, d) => n + (views[d] ?? 0), 0)
  const peak = Math.max(1, ...days.map((d) => views[d] ?? 0))
  const linkCount = page ? page.data.links.length : 0
  const weekday = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage="link" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader shopName={shop?.name || ""} avatarUrl="" sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 p-4 sm:p-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-tight">{t("My page")}</h1>
              <p className="text-sm text-muted-foreground">{t("One link for Instagram and clients: your work, prices, contacts and a request form.")}</p>
            </div>

            {missingTable && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("Run supabase/pages.sql in Supabase first, then try again.")}</p>}

            {loading ? (
              <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
            ) : !page ? (
              <section className="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted"><EyeIcon className="size-6 text-muted-foreground" /></div>
                <div className="flex max-w-sm flex-col gap-1">
                  <h2 className="text-lg font-medium">{t("Create your page")}</h2>
                  <p className="text-sm text-muted-foreground">{t("Your work, prices and contacts on one link. Clients leave requests right there.")}</p>
                </div>
                <a href="/link/edit" className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90">
                  {t("Create page")}<ArrowRightIcon className="size-4" />
                </a>
              </section>
            ) : (
              <>
                {/* The page card */}
                <section className="flex flex-col gap-5 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:p-5">
                  <a href="/link/edit" aria-label={t("Edit")} className="relative mx-auto h-[260px] w-[150px] shrink-0 overflow-hidden rounded-[22px] bg-muted ring-4 ring-foreground/90 sm:mx-0">
                    <div className="pointer-events-none absolute left-0 top-0 h-[693px] w-[400px] origin-top-left scale-[0.375] overflow-hidden">
                      <PageView data={page.data} slug={page.slug} preview />
                    </div>
                  </a>
                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-xl font-medium">{page.data.title || shop?.name}</h2>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${page.published ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {page.published ? t("Live") : t("Draft")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("{n} links", { n: linkCount })} · {t("{n} services", { n: page.data.services.length })} · {t("{n} photos", { n: page.data.portfolio.length })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-full bg-muted py-1 pl-4 pr-1">
                      <span className="min-w-0 flex-1 truncate text-sm">{url}</span>
                      <button type="button" aria-label={t("Copy Link")} title={t("Copy Link")} onClick={copy}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-background">
                        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                      </button>
                      {page.published && (
                        <a href={pagePath(page.slug)} target="_blank" rel="noopener" aria-label={t("Open page")} title={t("Open page")}
                          className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-background">
                          <ExternalLinkIcon className="size-4" />
                        </a>
                      )}
                    </div>

                    {!page.published && <p className="text-xs text-muted-foreground">{t("The page is hidden until you publish it.")}</p>}

                    <div className="flex flex-wrap gap-2">
                      <a href="/link/edit" className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-90">
                        <PencilIcon className="size-4" />{t("Edit")}
                      </a>
                      {page.published && (
                        <button type="button" onClick={copy} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium hover:bg-hover">
                          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}{copied ? t("Copied") : t("Copy Link")}
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* This week */}
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-medium">{t("In the last week")}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("Visitors")}</span>
                        <EyeIcon className="size-4 text-muted-foreground" />
                      </div>
                      <span className="text-3xl font-medium tabular-nums">{totalViews}</span>
                      <div className="flex h-16 items-end gap-1.5">
                        {days.map((d) => (
                          <div key={d} className="flex flex-1 flex-col items-center gap-1">
                            <div className="w-full rounded-md bg-foreground/80" style={{ height: `${Math.max(4, ((views[d] ?? 0) / peak) * 48)}px`, opacity: views[d] ? 1 : 0.15 }}
                              title={`${views[d] ?? 0}`} />
                            <span className="text-[10px] text-muted-foreground">{weekday(d)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <a href="/requests" className="group flex flex-col gap-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/10 hover:ring-foreground/25">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t("Requests")}</span>
                        <InboxIcon className="size-4 text-muted-foreground" />
                      </div>
                      <span className="text-3xl font-medium tabular-nums">{requests}</span>
                      <span className="mt-auto inline-flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground">
                        {t("Open requests")}<ArrowRightIcon className="size-4" />
                      </span>
                    </a>
                  </div>
                  {!page.published && <p className="text-xs text-muted-foreground">{t("Visits are counted once the page is live.")}</p>}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
