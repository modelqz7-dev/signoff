"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { NewOrderModal } from "@/components/dashboard/NewOrderModal"
import { OrderDetail } from "@/components/orders/OrderDetail"
import { Badge } from "@/components/ui/badge"
import type { Shop, Order } from "@/components/dashboard/types"
import { STATUS_MAP } from "@/components/dashboard/types"

export default function OrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedOrder = orders.find((o) => o.id === selectedId) || null

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
    setSelectedId(order.id)
  }

  function handleOrderUpdated(updated: Order) {
    setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o))
  }

  function handleOrderDeleted(deleted: Order) {
    setOrders((prev) => prev.filter((o) => o.id !== deleted.id))
    setSelectedId(null)
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
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-medium text-foreground">Orders</h2>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm text-[#4e99a3] transition-colors hover:bg-white/[.06]"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" strokeLinecap="round">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
              New Order
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" className="h-12 w-12 opacity-30" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 1.5h10a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 14V3A1.5 1.5 0 0 1 3 1.5z" />
                <line x1="5" y1="5" x2="11" y2="5" />
                <line x1="5" y1="8" x2="11" y2="8" />
                <line x1="5" y1="11" x2="9" y2="11" />
              </svg>
              <p className="text-sm">No orders yet</p>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-[#4e99a3] hover:text-foreground transition-colors"
              >
                Create your first order
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Order list as clickable rows */}
              {orders.map((order) => {
                const status = STATUS_MAP[order.status]
                const isActive = selectedId === order.id
                return (
                  <div key={order.id}>
                    <button
                      onClick={() => setSelectedId(isActive ? null : order.id)}
                      className={`w-full text-left rounded-lg border transition-colors px-4 py-3 ${
                        isActive
                          ? "border-[#4e99a3]/30 bg-white/[.04]"
                          : "border-border/40 hover:bg-white/[.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{order.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{order.client_name}
                              {order.client_email && <span> &middot; {order.client_email}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                            {order.value > 0 && <span>${order.value.toLocaleString()}</span>}
                            {order.deadline && <span>Due {new Date(order.deadline).toLocaleDateString()}</span>}
                            {order.file_url && (
                              <span className="text-[#4e99a3]">PDF</span>
                            )}
                            {!order.file_url && (
                              <span className="text-muted-foreground/50">No file</span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 border-0 text-[11px] px-2 py-0.5"
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {status.label}
                        </Badge>
                        <svg
                          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isActive ? "rotate-180" : ""}`}
                          strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M4 6l4 4 4-4" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isActive && (
                      <div className="mt-1 rounded-lg border border-border/30 bg-[#1e1d1c]">
                        <OrderDetail order={order} onUpdated={handleOrderUpdated} onDeleted={handleOrderDeleted} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
