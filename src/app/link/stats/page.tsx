"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { PageNotice, PageShell, usePageContext } from "@/components/page/PageShell"
import { useT } from "@/lib/i18n"

/** The last `n` days, oldest first, as YYYY-MM-DD (visits are counted by UTC day). */
function lastDays(n: number) {
  const today = new Date()
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (n - 1 - i))).toISOString().slice(0, 10))
}

/** Visitors and requests for the last 30 days. */
export default function PageStats() {
  const { t, locale } = useT()
  const { shop, page, loading, missingTable } = usePageContext()
  const [days] = useState(() => lastDays(30))
  const [views, setViews] = useState<Record<string, number>>({})
  const [requests, setRequests] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!shop || !page) return
    const since = days[0]
    Promise.all([
      supabase.from("page_views").select("day, count").eq("shop_id", shop.id).gte("day", since),
      supabase.from("page_requests").select("created_at").eq("shop_id", shop.id).gte("created_at", since + "T00:00:00Z"),
    ]).then(([v, r]) => {
      setViews(Object.fromEntries(((v.data as { day: string; count: number }[]) || []).map((x) => [x.day, x.count])))
      const byDay: Record<string, number> = {}
      for (const x of (r.data as { created_at: string }[]) || []) {
        const d = x.created_at.slice(0, 10)
        byDay[d] = (byDay[d] ?? 0) + 1
      }
      setRequests(byDay)
    })
  }, [shop, page, days])

  const sum = (rec: Record<string, number>, from: number) => days.slice(from).reduce((n, d) => n + (rec[d] ?? 0), 0)
  const views30 = sum(views, 0)
  const views7 = sum(views, 23)
  const req30 = sum(requests, 0)
  const conversion = views30 ? Math.round((req30 / views30) * 1000) / 10 : 0
  const peak = Math.max(1, ...days.map((d) => views[d] ?? 0))
  const label = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" })

  return (
    <PageShell activePage="link-stats" title={t("Statistics")} shopName={shop?.name ?? ""}
      subtitle={t("How many people opened your page and how many of them left a request.")}>
      {!loading && <PageNotice missingTable={missingTable} hasPage={!!page} />}
      {page && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label={t("Visitors, 7 days")} value={views7} />
            <Metric label={t("Visitors, 30 days")} value={views30} />
            <Metric label={t("Requests, 30 days")} value={req30} />
            <Metric label={t("Visitors who left a request")} value={`${conversion}%`} />
          </div>

          <section className="mt-6 flex flex-col gap-5 rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">{t("Visitors by day")}</h2>
              <span className="text-sm text-muted-foreground">{t("Last 30 days")}</span>
            </div>
            {views30 === 0 ? (
              <p className="py-16 text-center text-[15px] text-muted-foreground">{page.published ? t("No activity during this time") : t("Visits are counted once the page is live.")}</p>
            ) : (
              <div className="flex h-48 items-end gap-1">
                {days.map((d) => (
                  <div key={d} className="group relative flex h-full flex-1 flex-col justify-end">
                    <div className="w-full rounded-t-md bg-primary/80 group-hover:bg-primary"
                      style={{ height: `${Math.max(2, ((views[d] ?? 0) / peak) * 100)}%`, opacity: views[d] ? 1 : 0.15 }} />
                    <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[11px] whitespace-nowrap text-background group-hover:block">
                      {label(d)}: {views[d] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{label(days[0])}</span><span>{label(days[days.length - 1])}</span>
            </div>
          </section>
          <p className="mt-4 text-xs text-muted-foreground">{t("Search engines, link previews and bots are not counted.")}</p>
        </>
      )}
    </PageShell>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
    </div>
  )
}
