"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { GettingStarted } from "@/components/dashboard/GettingStarted"
import { HomeGreeting, ProjectCards, WaitingList, YourMoveList, useHome } from "@/components/dashboard/Home"
import { CalendarDialog } from "@/components/dashboard/Insights"
import type { Shop, Order } from "@/components/dashboard/types"
import { useShopPins } from "@/lib/pins"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"
import { OPEN_CALENDAR_EVENT, OPEN_NEW_PROJECT } from "@/lib/panels"

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  // every order of the shop: projects, their posts and stand-alone files
  const [orders, setOrders] = useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [calendarOpen, setCalendarOpen] = useState(false)
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

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false })

      setOrders((ordersData as Order[]) || [])
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
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} activePage="dashboard" />
        <div className="flex min-h-screen min-w-0 flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("Loading...")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar */}
      <Sidebar open={sidebarOpen} activePage="dashboard" />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          shopName={shop?.name || ""}
          title={t("Home")}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            <HomeGreeting name={shop?.name || ""} home={home} onCalendar={() => setCalendarOpen(true)} onNewProject={newProject} />

            <GettingStarted orders={orders} shop={shop} onNewOrder={newProject} />

            <ProjectCards home={home} onNewProject={newProject} />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              <YourMoveList home={home} projectName={projectName} />
              <WaitingList home={home} projectName={projectName} />
            </div>
          </div>
        </div>
      </div>

      <CalendarDialog orders={dated} open={calendarOpen} onOpenChange={setCalendarOpen} />
    </div>
  )
}
