"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { GettingStarted } from "@/components/dashboard/GettingStarted"
import { useHome } from "@/components/dashboard/Home"
import { BentoHome } from "@/components/dashboard/Bento"
import { CalendarDialog } from "@/components/dashboard/Insights"
import type { Shop, Order } from "@/components/dashboard/types"
import { useShopPins } from "@/lib/pins"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"
import { OPEN_CALENDAR_EVENT, OPEN_NEW_PROJECT } from "@/lib/panels"
import { isCrmNiche } from "@/lib/niches"
import { CrmApp } from "@/components/crm/CrmApp"
import { NichePicker } from "@/components/crm/NichePicker"

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  // every order of the shop: projects, their posts and stand-alone files
  const [orders, setOrders] = useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [calendarOpen, setCalendarOpen] = useState(false)
  // a new account first says what it does
  const [needsNiche, setNeedsNiche] = useState(false)
  const { t } = useT()
  const projects = useMemo(() => orders.filter((o) => o.kind === "project"), [orders])
  const items = useMemo(() => orders.filter((o) => o.kind !== "project"), [orders])
  // comments only matter on what's still with the client
  const pins = useShopPins(items.filter((o) => o.file_url && (o.status === "await" || o.status === "changes")).map((o) => o.id))
  const home = useHome(projects, items, pins)
  const titles = useMemo(() => new Map(projects.map((p) => [p.id, p.title || t("Untitled")])), [projects, t])
  const projectName = (o: Order) => (o.project_id ? titles.get(o.project_id) ?? "" : o.client_name || t("Single file"))
  // the calendar shows posts on their publishing day and files on their deadline
  const dated = useMemo(() => items.map((o) => (o.deadline || !o.publish_on ? o : { ...o, deadline: o.publish_on })), [items])
  const newProject = () => window.dispatchEvent(new Event(OPEN_NEW_PROJECT))

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/login")
        return
      }

      const user = session.user

      const { data: shopData, error: shopError } = await getOrCreateShop(user)

      if (shopError || !shopData) {
        console.error("Shop error:", shopError)
        setLoading(false)
        return
      }

      setShop(shopData as Shop)
      // the CRM niches have their own screens and data
      if (isCrmNiche(shopData.niche)) { setLoading(false); return }

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false })

      setOrders((ordersData as Order[]) || [])
      // without the niche column (supabase/crm.sql not run yet) everyone stays on content plans
      if (!shopData.niche && "niche" in shopData) {
        // accounts from before the niches already work with content plans
        if (ordersData?.length) await supabase.from("shops").update({ niche: "smm" }).eq("id", shopData.id)
        else setNeedsNiche(true)
      }
      setLoading(false)
      // the sidebar's calendar button lands here with ?calendar=1
      if (new URLSearchParams(window.location.search).get("calendar")) {
        setCalendarOpen(true)
        window.history.replaceState(null, "", "/dashboard")
      }
    }

    init()
  }, [router])

  // ...or asks for it directly when the dashboard is already open.
  useEffect(() => {
    const open = () => setCalendarOpen(true)
    window.addEventListener(OPEN_CALENDAR_EVENT, open)
    return () => window.removeEventListener(OPEN_CALENDAR_EVENT, open)
  }, [])

  // Status changes made by clients in the portal show up without a reload.
  const shopId = shop?.id
  useEffect(() => {
    if (!shopId) return
    const channel = supabase
      .channel(`dashboard-orders-${shopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const gone = (payload.old as Partial<Order>).id
            setOrders((prev) => prev.filter((o) => o.id !== gone))
            return
          }
          const row = payload.new as Order
          setOrders((prev) =>
            prev.some((o) => o.id === row.id)
              ? prev.map((o) => (o.id === row.id ? row : o))
              : [row, ...prev]
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [shopId])

  // The sidebar stays while loading, so switching here from My page slides in one piece.
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar open={sidebarOpen} activePage="dashboard" />
        <div className="flex min-h-screen min-w-0 flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("Loading...")}</p>
        </div>
      </div>
    )
  }

  if (shop && isCrmNiche(shop.niche)) return <CrmApp shop={shop} page="home" />
  if (shop && needsNiche) {
    return (
      <div className="flex min-h-screen bg-background">
        <NichePicker shopId={shop.id} onChosen={(niche) => { setShop({ ...shop, niche }); setNeedsNiche(false) }} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar */}
      <Sidebar open={sidebarOpen} activePage="dashboard" />

      {/* Main content: the bento home */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="lg:hidden">
          <DashboardHeader
            shopName={shop?.name || ""}
            title={t("Home")}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
        <BentoHome
          home={home}
          projects={projects}
          items={items}
          projectName={projectName}
          onNewProject={newProject}
          onPostChanged={(post) => setOrders((prev) => prev.map((o) => (o.id === post.id ? post : o)))}
          onPostDeleted={(id) => setOrders((prev) => prev.filter((o) => o.id !== id))}
          onPlanned={(rows) => setOrders((prev) => [...rows.filter((r) => !prev.some((o) => o.id === r.id)), ...prev])}
          intro={<GettingStarted orders={orders} shop={shop} onNewOrder={newProject} />}
        />
      </div>

      <CalendarDialog orders={dated} open={calendarOpen} onOpenChange={setCalendarOpen} />
    </div>
  )
}
