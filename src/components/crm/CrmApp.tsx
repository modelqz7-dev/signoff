"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import type { Shop } from "@/components/dashboard/types"
import { BookingDialog, type BookingPreset } from "@/components/crm/BookingDialog"
import { AppointmentsHome } from "@/components/crm/AppointmentsHome"
import { OrdersHome } from "@/components/crm/OrdersHome"
import { ClientsView } from "@/components/crm/ClientsView"
import { ServicesView } from "@/components/crm/ServicesView"
import { HistoryView } from "@/components/crm/HistoryView"
import { BookingLinkButton, OnlineBookingView } from "@/components/crm/OnlineBookingView"
import { translateStarterTitles, useCrmData, type CrmBooking } from "@/lib/crm"
import { nicheConfig, type CrmNiche } from "@/lib/niches"
import { getOrCreateShop } from "@/lib/shop"
import { supabase } from "@/lib/supabase"
import { useT } from "@/lib/i18n"
import { OPEN_NEW_BOOKING } from "@/lib/panels"

export type CrmPage = "home" | "clients" | "services" | "online" | "history"

/** The signed-in user's shop for the CRM pages; sends visitors without an account to sign in. */
export function useCrmShop() {
  const router = useRouter()
  const [shop, setShop] = useState<Shop | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace("/login"); return }
      const { data } = await getOrCreateShop(session.user)
      if (!data) return
      // only CRM accounts have these pages
      if (!nicheConfig(data.niche)) { router.replace("/dashboard"); return }
      setShop(data)
    })
  }, [router])
  return shop
}

/** One CRM screen: the menu, the page and the booking dialog every screen can open. */
export function CrmApp({ shop: initialShop, page }: { shop: Shop; page: CrmPage }) {
  const [shop, setShop] = useState(initialShop)
  const { t, lang } = useT()
  const config = nicheConfig(shop.niche as CrmNiche)!
  const data = useCrmData(shop.id)
  // starter services made before the account's language was known take its words once
  const { services, setServices, loading } = data
  useEffect(() => {
    if (loading || !services.length) return
    translateStarterTitles(services, t).then((fixed) => { if (fixed) setServices(fixed) }).catch(() => {})
  }, [loading, lang, services, setServices, t])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // a link with ?new=1 opens on a new booking
  const [dialog, setDialog] = useState<{ booking?: CrmBooking | null; preset?: BookingPreset } | null>(
    () => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") ? {} : null))

  useEffect(() => {
    const open = () => setDialog({})
    window.addEventListener(OPEN_NEW_BOOKING, open)
    if (new URLSearchParams(window.location.search).get("new")) window.history.replaceState(null, "", window.location.pathname)
    return () => window.removeEventListener(OPEN_NEW_BOOKING, open)
  }, [])

  const newBooking = (preset?: BookingPreset) => setDialog({ preset })
  const openBooking = (booking: CrmBooking) => setDialog({ booking })
  const replace = (b: CrmBooking) => data.setBookings((prev) => (prev.some((x) => x.id === b.id) ? prev.map((x) => (x.id === b.id ? b : x)) : [b, ...prev]))

  const titles: Record<CrmPage, string> = { home: config.kind === "order" ? t("Orders") : t("Appointments"), clients: t("Clients"), services: config.kind === "order" ? t("Products") : t("Services"), online: t("Online booking"), history: t("History") }
  const activePage = page === "home" ? "dashboard" : page

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} activePage={activePage} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden">
          <DashboardHeader shopName={shop.name} title={titles[page]} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <main className="flex min-w-0 flex-1 flex-col bg-background">
          {data.loading ? (
            <p className="m-auto text-sm text-muted-foreground">{t("Loading...")}</p>
          ) : data.error ? (
            <div className="m-auto max-w-sm p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t("Couldn't load the data")}</p>
              <p className="mt-1">{data.error}</p>
            </div>
          ) : page === "home" ? (
            config.kind === "order"
              ? <OrdersHome data={data} onNew={newBooking} onOpen={openBooking} onChanged={replace} cta={<BookingLinkButton shopId={shop.id} />} />
              : <AppointmentsHome data={data} onNew={newBooking} onOpen={openBooking} cta={<BookingLinkButton shopId={shop.id} />} />
          ) : page === "clients" ? (
            <ClientsView data={data} config={config} shopId={shop.id} onNew={newBooking} onOpen={openBooking} />
          ) : page === "history" ? (
            <HistoryView data={data} config={config} onOpen={openBooking} />
          ) : page === "online" ? (
            <OnlineBookingView shop={shop} config={config} onShopChanged={setShop} />
          ) : (
            <ServicesView data={data} config={config} shopId={shop.id} />
          )}
        </main>
      </div>

      <BookingDialog
        open={!!dialog}
        booking={dialog?.booking}
        preset={dialog?.preset}
        config={config}
        shopId={shop.id}
        services={data.services}
        clients={data.clients}
        bookings={data.bookings}
        onClose={() => setDialog(null)}
        onSaved={replace}
        onDeleted={(id) => data.setBookings((prev) => prev.filter((b) => b.id !== id))}
        onClientAdded={(c) => data.setClients((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c].sort((a, b) => a.name.localeCompare(b.name))))}
      />
    </div>
  )
}
