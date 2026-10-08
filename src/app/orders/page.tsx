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
import { getOrCreateShop } from "@/lib/shop"
import { PlusIcon } from "lucide-react"
import { useT } from "@/lib/i18n"

export default function OrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const pins = useShopPins(orders.map((o) => o.id))
  const { t } = useT()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }

      const { data: shopData, error: shopError } = await getOrCreateShop(session.user)

      if (shopError || !shopData) { setLoading(false); return }
      setShop(shopData as Shop)

      const { data: ordersData } = await supabase
        .from("orders").select("*").eq("shop_id", shopData.id).neq("kind", "post")
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
        <p className="text-muted-foreground text-sm">{t("Loading...")}</p>
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {t("{n} orders", { n: orders.length })}
                </p>
                <h1 className="font-[family-name:var(--font-brand)] text-2xl leading-tight font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
                  {t("Orders")}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <PlusIcon className="size-4" />
                {t("New Order")}
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl py-20 text-center ring-1 ring-foreground/10">
                <p className="text-sm text-foreground">{t("No orders yet")}</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  {t("Create an order, upload the design and share the portal link with your client.")}
                </p>
                <Button size="sm" variant="outline" onPress={() => setModalOpen(true)}>
                  <PlusIcon />
                  {t("Create your first order")}
                </Button>
              </div>
            ) : (
              <OrdersList orders={orders} pins={pins} onDeleted={handleOrderDeleted} />
            )}
          </div>
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
