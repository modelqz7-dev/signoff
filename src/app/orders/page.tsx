"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { NewOrderModal } from "@/components/dashboard/NewOrderModal"
import { OrdersList } from "@/components/orders/OrdersList"
import { Button } from "@/components/ui/button"
import type { Shop, Order } from "@/components/dashboard/types"
import { useShopPins } from "@/lib/pins"
import { PlusIcon } from "lucide-react"

export default function OrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const pins = useShopPins(orders.map((o) => o.id))

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }

      const { data: shopData, error: shopError } = await supabase
        .from("shops").select("*").eq("user_id", session.user.id).maybeSingle()

      if (shopError || !shopData) { setLoading(false); return }
      setShop(shopData as Shop)

      const { data: ordersData } = await supabase
        .from("orders").select("*").eq("shop_id", shopData.id)
        .order("created_at", { ascending: false })

      setOrders((ordersData as Order[]) || [])
      setLoading(false)
    }
    init()
  }, [router])

  function handleOrderCreated(order: Order) {
    setOrders((prev) => [order, ...prev])
  }

  function handleOrderDeleted(deleted: Order) {
    setOrders((prev) => prev.filter((o) => o.id !== deleted.id))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage="orders" />

      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          shopName={shop?.name || ""}
          avatarUrl=""
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-medium text-foreground">Orders</h2>
              <span className="text-sm text-muted-foreground">{orders.length}</span>
            </div>
            <Button size="sm" onPress={() => setModalOpen(true)}>
              <PlusIcon />
              New Order
            </Button>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl py-20 text-center ring-1 ring-foreground/10">
              <p className="text-sm text-foreground">No orders yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Create an order, upload the design and share the portal link with your client.
              </p>
              <Button size="sm" variant="outline" onPress={() => setModalOpen(true)}>
                <PlusIcon />
                Create your first order
              </Button>
            </div>
          ) : (
            <OrdersList orders={orders} pins={pins} onDeleted={handleOrderDeleted} />
          )}
        </div>
      </div>

      <NewOrderModal
        shopId={shop?.id || ""}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={handleOrderCreated}
      />
    </div>
  )
}
