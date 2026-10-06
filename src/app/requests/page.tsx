"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { InboxIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { Button } from "@/components/ui/button"
import { getOrCreateShop } from "@/lib/shop"
import { useFileUrl } from "@/lib/files"
import { isPlanLimitError } from "@/lib/plans"
import { openPanel } from "@/lib/panels"
import { useT } from "@/lib/i18n"
import type { Shop } from "@/components/dashboard/types"

export type PageRequest = {
  id: string
  shop_id: string
  name: string
  contact: string
  message: string
  files: string[]
  status: "new" | "done"
  order_id: string | null
  created_at: string
}

/** Same format as orders made in "New order". */
function newOrderCode() {
  return `ORD-${Date.now().toString(36).toUpperCase()}`
}

/** Requests clients left on the workshop's public page. */
export default function RequestsPage() {
  const router = useRouter()
  const { t, locale } = useT()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [requests, setRequests] = useState<PageRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [missingTable, setMissingTable] = useState(false)
  const [filter, setFilter] = useState<"new" | "all">("new")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: shopData } = await getOrCreateShop(session.user)
      if (!shopData) { setLoading(false); return }
      setShop(shopData)
      const { data, error } = await supabase.from("page_requests").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false })
      if (error && /page_requests|relation|schema cache/i.test(error.message)) setMissingTable(true)
      setRequests((data as PageRequest[]) || [])
      setLoading(false)
    }
    init()
  }, [router])

  async function setStatus(req: PageRequest, status: PageRequest["status"]) {
    setBusy(req.id)
    const { error } = await supabase.from("page_requests").update({ status }).eq("id", req.id)
    if (!error) setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status } : r)))
    setBusy(null)
  }

  async function remove(req: PageRequest) {
    if (!window.confirm(t("Delete this request?"))) return
    setBusy(req.id)
    const { error } = await supabase.from("page_requests").delete().eq("id", req.id)
    if (!error) setRequests((prev) => prev.filter((r) => r.id !== req.id))
    setBusy(null)
  }

  /** Turns the request into an order and opens it, ready for a drawing or sketch. */
  async function toOrder(req: PageRequest) {
    if (!shop) return
    setBusy(req.id)
    setError(null)
    const { data: order, error } = await supabase.from("orders").insert({
      shop_id: shop.id,
      code: newOrderCode(),
      title: t("Request from {name}", { name: req.name }),
      client_name: req.name,
      client_contact: req.contact,
      client_email: /@.+\./.test(req.contact) && !req.contact.startsWith("@") ? req.contact : "",
      value: 0,
      notes: req.message,
      status: "await",
      deadline: null,
      file_url: req.files[0] ?? null,
    }).select().single()
    if (error || !order) {
      setBusy(null)
      if (isPlanLimitError(error)) { setError(t("You've reached your plan's limit of active orders.")); openPanel("billing"); return }
      setError(error?.message || t("Couldn't create the order"))
      return
    }
    await supabase.from("page_requests").update({ status: "done", order_id: order.id }).eq("id", req.id)
    router.push(`/orders/${order.id}`)
  }

  const shown = filter === "new" ? requests.filter((r) => r.status === "new") : requests
  const newCount = requests.filter((r) => r.status === "new").length

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">{t("Loading...")}</p></div>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage="requests" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader shopName={shop?.name || ""} avatarUrl="" sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 p-4 sm:p-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-medium tracking-tight">{t("Requests")}</h1>
                <p className="text-sm text-muted-foreground">{t("Clients leave them on your page. Turn one into an order in a click.")}</p>
              </div>
              <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
                {(["new", "all"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)}
                    className={`rounded-md px-3 py-1 ${filter === f ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>
                    {f === "new" ? `${t("New")} ${newCount ? `(${newCount})` : ""}` : t("All")}
                  </button>
                ))}
              </div>
            </div>

            {missingTable && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("Run supabase/pages.sql in Supabase first, then try again.")}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {shown.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-14 text-center ring-1 ring-foreground/10">
                <InboxIcon className="size-8 text-muted-foreground" />
                <p className="font-medium">{filter === "new" ? t("No new requests") : t("No requests yet")}</p>
                <p className="max-w-sm text-sm text-muted-foreground">{t("Publish your page and put its link in your Instagram bio: requests will show up here.")}</p>
                <a href="/link" className="text-sm font-medium underline underline-offset-4">{t("Set up my page")}</a>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {shown.map((r) => (
                  <article key={r.id} className={`flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5 ${r.status === "done" ? "opacity-70" : ""}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <h2 className="font-medium">{r.name}</h2>
                        <span className="text-sm text-muted-foreground select-all">{r.contact}</span>
                      </div>
                      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {new Date(r.created_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {r.message && <p className="text-sm whitespace-pre-line">{r.message}</p>}
                    {r.files.length > 0 && (
                      <div className="flex gap-2">{r.files.map((f) => <RequestPhoto key={f} url={f} />)}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {r.order_id ? (
                        <a href={`/orders/${r.order_id}`} className="text-sm font-medium underline underline-offset-4">{t("Open order")}</a>
                      ) : (
                        <Button size="sm" onPress={() => toOrder(r)} isDisabled={busy === r.id}>{t("Create order")}</Button>
                      )}
                      {r.status === "new"
                        ? <Button size="sm" variant="outline" onPress={() => setStatus(r, "done")} isDisabled={busy === r.id}>{t("Mark as done")}</Button>
                        : <Button size="sm" variant="outline" onPress={() => setStatus(r, "new")} isDisabled={busy === r.id}>{t("Back to new")}</Button>}
                      <button type="button" onClick={() => remove(r)} className="ml-auto text-xs text-muted-foreground hover:text-destructive">{t("Delete")}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RequestPhoto({ url }: { url: string }) {
  const src = useFileUrl(url)
  return (
    <a href={src ?? undefined} target="_blank" rel="noopener" className="block size-20 overflow-hidden rounded-lg bg-muted">
      {src && <img src={src} alt="" className="size-full object-cover" />}
    </a>
  )
}
