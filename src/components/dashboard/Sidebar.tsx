"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileTextIcon, LayoutDashboardIcon, LogOutIcon, SettingsIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type SidebarProps = {
  open: boolean
  activePage?: "dashboard" | "orders" | "settings"
}

export function Sidebar({ open, activePage = "dashboard" }: SidebarProps) {
  const router = useRouter()

  async function signOut() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <aside
      className="flex h-screen w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 overflow-y-auto"
      style={{
        marginLeft: open ? 0 : -220,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="16" height="16" rx="3" stroke="#fff" strokeWidth="1" fill="none" />
          <line x1="3" y1="8.5" x2="14" y2="8.5" stroke="#fff" strokeWidth="1" />
        </svg>
        <span className="text-[15px] tracking-tight text-foreground">Signoff</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2.5 pt-1 pb-4">
        <NavItem icon={LayoutDashboardIcon} label="Dashboard" href="/" active={activePage === "dashboard"} />
        <NavItem icon={FileTextIcon} label="Orders" href="/orders" active={activePage === "orders"} />

        <div className="mt-auto flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
          <NavItem icon={SettingsIcon} label="Settings" href="/settings" active={activePage === "settings"} />
          <NavItem icon={LogOutIcon} label="Sign out" onClick={signOut} />
        </div>
      </nav>
    </aside>
  )
}

function NavItem({ icon: Icon, label, active, href, onClick }: {
  icon: LucideIcon
  label: string
  active?: boolean
  href?: string
  onClick?: () => void
}) {
  const cls = cn(
    "flex w-full items-center gap-2.5 rounded-[7px] px-3 py-[7px] text-[13.5px] transition-colors",
    active
      ? "bg-white/[.09] text-foreground font-medium"
      : "text-muted-foreground hover:bg-white/[.06] hover:text-foreground"
  )
  const content = (
    <>
      <Icon className={cn("size-4 shrink-0", active ? "opacity-100" : "opacity-60")} strokeWidth={1.6} />
      {label}
    </>
  )

  return href ? (
    <Link href={href} className={cls} aria-current={active ? "page" : undefined}>{content}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{content}</button>
  )
}
