"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CopyButton, PageNotice, PageShell, usePageContext } from "@/components/page/PageShell"
import { useT } from "@/lib/i18n"

type RequestRow = { name: string; contact: string; status: "new" | "done"; order_id: string | null; created_at: string }
type Client = { key: string; name: string; contact: string; requests: number; orders: number; last: string; waiting: boolean }

/** Everyone who left a request on the page, one row per contact. */
function groupClients(rows: RequestRow[]): Client[] {
  const map = new Map<string, Client>()
  for (const r of rows) {
    const key = r.contact.trim().toLowerCase().replace(/[\s()-]/g, "")
    const c = map.get(key) ?? { key, name: r.name, contact: r.contact, requests: 0, orders: 0, last: r.created_at, waiting: false }
    c.requests++
    if (r.order_id) c.orders++
    if (r.status === "new") c.waiting = true
    if (r.created_at > c.last) { c.last = r.created_at; c.name = r.name }
    map.set(key, c)
  }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last))
}

export default function PageClients() {
  const { t, locale } = useT()
  const { shop, page, loading, missingTable } = usePageContext()
  const [clients, setClients] = useState<Client[] | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!shop) return
    supabase.from("page_requests").select("name, contact, status, order_id, created_at").eq("shop_id", shop.id)
      .then(({ data }) => setClients(groupClients((data as RequestRow[]) || [])))
  }, [shop])

  const q = query.trim().toLowerCase()
  const shown = (clients ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q))
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })

  return (
    <PageShell activePage="link-clients" title={t("Clients")} shopName={shop?.name ?? ""}
      subtitle={t("People who left a request on your page. Copy a contact to write to them.")}
      actions={clients && clients.length > 0 ? (
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by name or contact")}
          className="h-10 w-64 max-w-full rounded-full bg-muted px-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20" />
      ) : undefined}>
      {!loading && <PageNotice missingTable={missingTable} hasPage={!!page || (clients?.length ?? 0) > 0} />}
      {clients && clients.length === 0 && !missingTable && page && (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-3xl bg-card px-6 py-16 text-center ring-1 ring-foreground/10">
          <p className="text-base font-bold">{t("No clients yet")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("When someone leaves a request on your page, they appear here.")}</p>
        </div>
      )}
      {shown.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
          {shown.map((c, i) => (
            <div key={c.key} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${i ? "border-t border-border" : ""}`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {c.name.trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 truncate text-[15px] font-medium">
                  {c.name}
                  {c.waiting && <span className="rounded-full bg-foreground px-1.5 text-[10.5px] leading-4 font-medium text-background">{t("New request")}</span>}
                </span>
                <span className="truncate text-sm text-muted-foreground">{c.contact}</span>
              </div>
              <div className="flex flex-col text-right text-sm">
                <span>{t("Requests: {n}", { n: c.requests })}{c.orders > 0 && ` · ${t("Orders: {n}", { n: c.orders })}`}</span>
                <span className="text-muted-foreground">{t("Last: {date}", { date: date(c.last) })}</span>
              </div>
              <CopyButton text={c.contact} />
            </div>
          ))}
        </div>
      )}
      {clients && clients.length > 0 && shown.length === 0 && <p className="mt-8 text-sm text-muted-foreground">{t("Nothing found")}</p>}
    </PageShell>
  )
}
