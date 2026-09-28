"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { OrderActivityChart } from "@/components/dashboard/OrderActivityChart"
import { KpiRow } from "@/components/dashboard/KpiRow"
import { NeedsAttention } from "@/components/dashboard/NeedsAttention"
import { ClientActivity } from "@/components/dashboard/ClientActivity"
import { CalendarWidget } from "@/components/dashboard/CalendarWidget"
import { UpcomingOrders } from "@/components/dashboard/UpcomingOrders"
import { StatusDonut } from "@/components/dashboard/StatusDonut"
import { QuickOrderCard } from "@/components/dashboard/QuickOrderCard"
import type { Shop, Order } from "@/components/dashboard/types"
import { useShopPins } from "@/lib/pins"

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pins = useShopPins(orders.map((o) => o.id))

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

      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

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
        <p className="text-muted-foreground text-sm">Loading...</p>
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
          avatarUrl=""
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex flex-1 gap-5 overflow-y-auto p-6">
          {/* Center content */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            <KpiRow orders={orders} pins={pins} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <OrderActivityChart orders={orders} />
              </div>
              <QuickOrderCard
                orders={orders}
                shopId={shop?.id || ""}
                onOrderCreated={(order) => setOrders((prev) => [order, ...prev])}
                onOrderUpdated={(updated) => setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o))}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <NeedsAttention orders={orders} pins={pins} />
              <ClientActivity orders={orders} pins={pins} />
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="hidden w-[300px] shrink-0 flex-col gap-5 xl:flex sticky top-0 self-start max-h-[calc(100vh-88px)] overflow-y-auto">
            <CalendarWidget orders={orders} />
            <UpcomingOrders orders={orders} />
            <StatusDonut orders={orders} />
          </aside>
        </div>
      </div>
    </div>
  )
}
