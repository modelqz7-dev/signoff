"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { XIcon } from "lucide-react"
import { OPEN_NAV_EVENT } from "@/lib/panels"
import { supabase } from "@/lib/supabase"
import { Logo } from "@/components/Logo"
import { SidebarPanel, OPEN_PANEL_EVENT, type PanelId } from "@/components/dashboard/SidebarPanels"
import { useT } from "@/lib/i18n"
import { useSyncAccountLang } from "@/lib/account-lang"
import { usePlanUsage } from "@/lib/use-plan"
import { UsageMeter } from "@/components/plans/PlanBits"
import { NavItem, SectionLabel, NAV_ICONS } from "@/components/dashboard/nav"

type SidebarProps = {
  open: boolean
  activePage?: string
}

export function Sidebar({ open, activePage = "dashboard" }: SidebarProps) {
  const [panel, setPanel] = useState<PanelId | null>(null)
  // The sidebar is on every signed-in page: a good place to keep the account's language current.
  useSyncAccountLang()
  // Phones and tablets: the sidebar slides in as a drawer from the header's menu button.
  const [drawer, setDrawer] = useState(false)

  // Other parts of the UI (e.g. the header avatar) can open a panel or the drawer too.
  useEffect(() => {
    function onOpen(e: Event) { setPanel((e as CustomEvent<PanelId>).detail); setDrawer(false) }
    function onNav() { setDrawer(true) }
    window.addEventListener(OPEN_PANEL_EVENT, onOpen)
    window.addEventListener(OPEN_NAV_EVENT, onNav)
    return () => {
      window.removeEventListener(OPEN_PANEL_EVENT, onOpen)
      window.removeEventListener(OPEN_NAV_EVENT, onNav)
    }
  }, [])

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false) }
    const onResize = () => { if (window.innerWidth >= 1024) setDrawer(false) }
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", onResize)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onResize)
      document.body.style.overflow = ""
    }
  }, [drawer])

  const openPanelFromNav = (id: PanelId) => { setPanel(id); setDrawer(false) }

  return (
    <>
    {/* Desktop */}
    <aside
      className="sticky top-0 self-start hidden h-screen w-[241px] shrink-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-200 overflow-y-auto lg:flex"
      style={{
        marginLeft: open ? 0 : -241,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <SidebarContent activePage={activePage} panel={panel} onPanel={openPanelFromNav} />
    </aside>

    {/* Phones and tablets */}
    {drawer && (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-200"
          onClick={() => setDrawer(false)}
        />
        <aside className="absolute inset-y-0 left-0 flex w-[260px] max-w-[85vw] flex-col overflow-y-auto border-r border-border/50 bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="absolute top-4 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
          <SidebarContent activePage={activePage} panel={panel} onPanel={openPanelFromNav} />
        </aside>
      </div>
    )}
    <SidebarPanel panel={panel} onClose={() => setPanel(null)} />
    </>
  )
}

function SidebarContent({ activePage, panel, onPanel }: {
  activePage: string
  panel: PanelId | null
  onPanel: (id: PanelId) => void
}) {
  const { t } = useT()
  const setPanel = onPanel
  const newRequests = useNewRequestCount()
  return (
    <>
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center px-5 py-5">
        <Logo />
      </Link>

      {/* A touch larger than the landing page's copy: 15px labels, 18px icons. */}
      <nav className="flex-1 px-3 pt-1 pb-4 [&>a]:gap-3 [&>a]:py-2 [&>a]:text-[15px] [&>button]:gap-3 [&>button]:py-2 [&>button]:text-[15px] [&>*>span:first-child]:size-[18px]">
        <SectionLabel>{t("General")}</SectionLabel>
        <NavItem icon={NAV_ICONS.dashboard} label={t("Dashboard")} active={activePage === "dashboard"} href="/dashboard" />
        <NavItem icon={NAV_ICONS.orders} label={t("Orders")} active={activePage === "orders"} href="/orders" />
        <NavItem icon={NAV_ICONS.requests} label={t("Requests")} active={activePage === "requests"} href="/requests" badge={newRequests} />
        <NavItem icon={NAV_ICONS.page} label={t("My page")} active={activePage === "link"} href="/link" />

        <SectionLabel className="mt-5">{t("Account")}</SectionLabel>
        <NavItem icon={NAV_ICONS.profile} label={t("Profile")} active={panel === "profile"} onClick={() => setPanel("profile")} />
        <NavItem icon={NAV_ICONS.billing} label={t("Billing")} active={panel === "billing"} onClick={() => setPanel("billing")} />
        <NavItem icon={NAV_ICONS.notifications} label={t("Notifications")} active={panel === "notifications"} onClick={() => setPanel("notifications")} />
        <NavItem icon={NAV_ICONS.security} label={t("Security")} active={panel === "security"} onClick={() => setPanel("security")} />
        <NavItem icon={NAV_ICONS.appearance} label={t("Appearance")} active={panel === "appearance"} onClick={() => setPanel("appearance")} />

        <SectionLabel className="mt-5">{t("Support")}</SectionLabel>
        <NavItem icon={NAV_ICONS.help} label={t("Help Center")} active={panel === "help"} onClick={() => setPanel("help")} />
        <NavItem icon={NAV_ICONS.contact} label={t("Contact Us")} active={panel === "contact"} onClick={() => setPanel("contact")} />
        <NavItem icon={NAV_ICONS.docs} label={t("Documentation")} active={panel === "docs"} onClick={() => setPanel("docs")} />
        <NavItem icon={NAV_ICONS.status} label={t("Status")} active={panel === "status"} onClick={() => setPanel("status")} />
      </nav>

      <PlanCard onOpen={() => setPanel("billing")} />
    </>
  )
}

/** New requests from the workshop's page; 0 until supabase/pages.sql has been run. */
function useNewRequestCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let cancelled = false
    supabase.from("page_requests").select("id", { count: "exact", head: true }).eq("status", "new")
      .then(({ count, error }) => { if (!cancelled && !error) setCount(count ?? 0) })
    return () => { cancelled = true }
  }, [])
  return count
}

/** Plan, trial and active-order usage at the bottom of the sidebar. */
function PlanCard({ onOpen }: { onOpen: () => void }) {
  const usage = usePlanUsage()
  const { t } = useT()
  if (!usage) return null
  const onTrial = usage.trialDays > 0 && usage.chosen.id === "free"
  const nearLimit = usage.plan.activeOrders !== null && usage.activeOrders >= usage.plan.activeOrders - 1

  return (
    <div className="mx-2.5 mb-3 flex flex-col gap-2.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between gap-2 text-xs whitespace-nowrap">
        <span className="truncate font-medium text-foreground">
          {onTrial ? t("{plan} trial", { plan: t(usage.plan.name) }) : t("{plan} plan", { plan: t(usage.plan.name) })}
        </span>
        {onTrial && (
          <span className="text-[11px] text-muted-foreground">{t("{n}d left", { n: usage.trialDays })}</span>
        )}
      </div>
      <UsageMeter used={usage.activeOrders} limit={usage.plan.activeOrders} />
      {(onTrial || usage.chosen.id !== "pro") && (
        <button
          type="button"
          onClick={onOpen}
          className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            nearLimit || onTrial
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-muted text-foreground hover:bg-hover"
          }`}
        >
          {onTrial ? t("Choose a plan") : t("Upgrade")}
        </button>
      )}
    </div>
  )
}
