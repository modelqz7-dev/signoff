"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/Logo"
import { SidebarPanel, OPEN_PANEL_EVENT, type PanelId } from "@/components/dashboard/SidebarPanels"
import { useT } from "@/lib/i18n"

type SidebarProps = {
  open: boolean
  activePage?: string
}

export function Sidebar({ open, activePage = "dashboard" }: SidebarProps) {
  const [panel, setPanel] = useState<PanelId | null>(null)
  const { t } = useT()

  // Other parts of the UI (e.g. the header avatar) can open a panel too.
  useEffect(() => {
    function onOpen(e: Event) { setPanel((e as CustomEvent<PanelId>).detail) }
    window.addEventListener(OPEN_PANEL_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_PANEL_EVENT, onOpen)
  }, [])

  return (
    <>
    <aside
      className="sticky top-0 self-start flex h-screen w-[220px] shrink-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-200 overflow-y-auto"
      style={{
        marginLeft: open ? 0 : -220,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center px-5 py-5">
        <Logo />
      </Link>

      <nav className="flex-1 px-2.5 pt-1 pb-4">
        <SectionLabel>{t("General")}</SectionLabel>
        <NavItem icon={dashboardIcon} label={t("Dashboard")} active={activePage === "dashboard"} href="/dashboard" />
        <NavItem icon={ordersIcon} label={t("Orders")} active={activePage === "orders"} href="/orders" />

        <SectionLabel className="mt-5">{t("Account")}</SectionLabel>
        <NavItem icon={profileIcon} label={t("Profile")} active={panel === "profile"} onClick={() => setPanel("profile")} />
        <NavItem icon={billingIcon} label={t("Billing")} active={panel === "billing"} onClick={() => setPanel("billing")} />
        <NavItem icon={notifIcon} label={t("Notifications")} active={panel === "notifications"} onClick={() => setPanel("notifications")} />
        <NavItem icon={securityIcon} label={t("Security")} active={panel === "security"} onClick={() => setPanel("security")} />
        <NavItem icon={appearanceIcon} label={t("Appearance")} active={panel === "appearance"} onClick={() => setPanel("appearance")} />

        <SectionLabel className="mt-5">{t("Support")}</SectionLabel>
        <NavItem icon={helpIcon} label={t("Help Center")} active={panel === "help"} onClick={() => setPanel("help")} />
        <NavItem icon={contactIcon} label={t("Contact Us")} active={panel === "contact"} onClick={() => setPanel("contact")} />
        <NavItem icon={docsIcon} label={t("Documentation")} active={panel === "docs"} onClick={() => setPanel("docs")} />
        <NavItem icon={statusIcon} label={t("Status")} active={panel === "status"} onClick={() => setPanel("status")} />
      </nav>
    </aside>
    <SidebarPanel panel={panel} onClose={() => setPanel(null)} />
    </>
  )
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-3 pb-1.5 pt-2 text-[11.5px] font-medium tracking-wide text-accent ${className || ""}`}>
      {children}
    </div>
  )
}

function NavItem({ icon, label, active, href, onClick }: {
  icon: React.ReactNode
  label: string
  active?: boolean
  href?: string
  onClick?: () => void
}) {
  const cls = `flex w-full items-center gap-2.5 rounded-[7px] px-3 py-[7px] text-[13.5px] transition-colors ${
    active
      ? "bg-hover-strong text-foreground font-medium"
      : "text-muted-foreground hover:bg-hover hover:text-foreground"
  }`

  if (href) {
    return (
      <a href={href} className={cls}>
        <span className={`h-4 w-4 shrink-0 ${active ? "opacity-100" : "opacity-60"}`}>{icon}</span>
        {label}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      <span className={`h-4 w-4 shrink-0 ${active ? "opacity-100" : "opacity-60"}`}>{icon}</span>
      {label}
    </button>
  )
}

const dashboardIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
    <rect x="9" y="1.5" width="5.5" height="3" rx="1" />
    <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" />
    <rect x="9" y="6.5" width="5.5" height="8" rx="1" />
  </svg>
)

const ordersIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 1.5h10a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 14V3A1.5 1.5 0 0 1 3 1.5z" />
    <line x1="5" y1="5" x2="11" y2="5" />
    <line x1="5" y1="8" x2="11" y2="8" />
    <line x1="5" y1="11" x2="9" y2="11" />
  </svg>
)

const profileIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <circle cx="8" cy="5" r="3" />
    <path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
  </svg>
)

const billingIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="3" width="13" height="10" rx="2" />
    <line x1="1.5" y1="7" x2="14.5" y2="7" />
  </svg>
)

const notifIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6a4 4 0 0 1 8 0c0 3 1.5 4.5 1.5 4.5H2.5S4 9 4 6z" />
    <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0" />
  </svg>
)

const securityIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
    <path d="M5 7V5a3 3 0 0 1 6 0v2" />
  </svg>
)

const appearanceIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" />
  </svg>
)

const helpIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M6 6.5a2 2 0 0 1 3.5 1.5c0 1-1.5 1.5-1.5 1.5" />
    <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
  </svg>
)

const contactIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="3" width="13" height="10" rx="2" />
    <path d="M1.5 5l6.5 4 6.5-4" />
  </svg>
)

const docsIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2.5h4.5a2 2 0 0 1 2 2v9.5a1.5 1.5 0 0 0-1.5-1.5H2z" />
    <path d="M14 2.5H9.5a2 2 0 0 0-2 2v9.5a1.5 1.5 0 0 1 1.5-1.5H14z" />
  </svg>
)

const statusIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12l3-4 3 2 3-5 3 4" />
    <line x1="2" y1="14" x2="14" y2="14" />
  </svg>
)
