"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { ClientActivity } from "@/components/dashboard/ClientActivity"
import { GettingStarted } from "@/components/dashboard/GettingStarted"
import { ComingUp, Greeting, StatsStrip, useToday, WaitingOnClients, YourMove } from "@/components/dashboard/Today"
import { NewOrderModal } from "@/components/dashboard/NewOrderModal"
import { CalendarDialog, StatsDialog } from "@/components/dashboard/Insights"
import type { Shop, Order } from "@/components/dashboard/types"
import { useShopPins } from "@/lib/pins"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const { t } = useT()
  const pins = useShopPins(orders.map((o) => o.id))
  const today = useToday(orders, pins)

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
    }

    init()
  }, [router])

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
          if (payload.eventType === "DELETE") return
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("Loading...")}</p>
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
          title={t("Dashboard")}
          avatarUrl=""
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            <Greeting
              name={shop?.name || ""}
              today={today}
              onNewOrder={() => setNewOrderOpen(true)}
              onCalendar={() => setCalendarOpen(true)}
              onStats={() => setStatsOpen(true)}
            />

            <GettingStarted orders={orders} shop={shop} onNewOrder={() => setNewOrderOpen(true)} />

            {/* what needs me, who I'm waiting on, what's due */}
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div className="flex min-w-0 flex-col gap-5">
                <YourMove today={today} />
                <WaitingOnClients today={today} />
              </div>
              <div className="flex min-w-0 flex-col gap-5">
                <ComingUp today={today} />
                <ClientActivity orders={orders} pins={pins} />
              </div>
            </div>

            <StatsStrip today={today} />
          </div>
        </div>
      </div>

      <CalendarDialog orders={orders} open={calendarOpen} onOpenChange={setCalendarOpen} />
      <StatsDialog orders={orders} open={statsOpen} onOpenChange={setStatsOpen} />

      <NewOrderModal
        shopId={shop?.id || ""}
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        onCreated={(order) => setOrders((prev) => [order, ...prev])}
      />
    </div>
  )
}
