"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  ChartColumnIcon, CheckIcon, ChevronDownIcon, ExternalLinkIcon, LightbulbIcon, MessageSquareTextIcon, QrCodeIcon, XIcon,
} from "lucide-react"
import { OPEN_NAV_EVENT } from "@/lib/panels"
import { supabase } from "@/lib/supabase"
import { Logo } from "@/components/Logo"
import { SidebarPanel, OPEN_PANEL_EVENT, type PanelId } from "@/components/dashboard/SidebarPanels"
import { useT } from "@/lib/i18n"
import { useSyncAccountLang } from "@/lib/account-lang"
import { usePlanUsage } from "@/lib/use-plan"
import { UsageMeter } from "@/components/plans/PlanBits"
import { NavItem, SectionLabel, NAV_ICONS } from "@/components/dashboard/nav"
import { cleanPage, pagePath, type PageData } from "@/lib/page"

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
      className="sticky top-0 self-start hidden h-screen w-[240px] shrink-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-200 overflow-y-auto lg:flex"
      style={{
        marginLeft: open ? 0 : -240,
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
  const mode = useMode(activePage)
  const page = usePageSetup(mode === "page")
  return (
    <>
      <ModeSwitcher mode={mode} />

      {/* A touch larger than the landing page's copy: 15px labels, 18px icons. */}
      <nav className="flex-1 px-3 pt-1 pb-4 [&>a]:gap-3 [&>a]:py-2 [&>a]:text-[15px] [&>button]:gap-3 [&>button]:py-2 [&>button]:text-[15px] [&>*>span:first-child]:size-[18px]">
        {mode === "page" ? (
          <>
            <NavItem icon={NAV_ICONS.page} label={t("My page")} active={activePage === "link"} href="/link" />
            <NavItem icon={<ChartColumnIcon className="size-full" strokeWidth={1.6} />} label={t("Statistics")} active={activePage === "link-stats"} href="/link/stats" />
            {page?.published && (
              <NavItem icon={<ExternalLinkIcon className="size-full" strokeWidth={1.6} />} label={t("Open page")} href={pagePath(page.slug)} />
            )}

            <SectionLabel className="mt-5">{t("Tools")}</SectionLabel>
            <NavItem icon={<QrCodeIcon className="size-full" strokeWidth={1.6} />} label={t("QR code")} tag={t("new")} active={activePage === "link-qr"} href="/link/qr" />
            <NavItem icon={<MessageSquareTextIcon className="size-full" strokeWidth={1.6} />} label={t("Reply templates")} active={activePage === "link-replies"} href="/link/replies" />
            <NavItem icon={<LightbulbIcon className="size-full" strokeWidth={1.6} />} label={t("Post ideas")} active={activePage === "link-ideas"} href="/link/ideas" />
          </>
        ) : (
          <>
            <SectionLabel>{t("General")}</SectionLabel>
            <NavItem icon={NAV_ICONS.dashboard} label={t("Dashboard")} active={activePage === "dashboard"} href="/dashboard" />
            <NavItem icon={NAV_ICONS.orders} label={t("Orders")} active={activePage === "orders"} href="/orders" />
            <NavItem icon={NAV_ICONS.requests} label={t("Requests")} active={activePage === "requests"} href="/requests" badge={newRequests} />
            <NavItem icon={NAV_ICONS.page} label={t("My page")} active={activePage === "link"} href="/link" />
          </>
        )}

        {/* My page keeps its own short menu; the account lives in the orders side. */}
        {mode === "orders" && (
          <>
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
          </>
        )}
      </nav>

      {mode === "page" && page && page.done < page.steps.length
        ? <SetupChecklist steps={page.steps} done={page.done} />
        : <PlanCard onOpen={() => setPanel("billing")} />}
    </>
  )
}

type Mode = "orders" | "page"
const MODE_KEY = "nodly-mode"
const MODE_EVENT = "nodly-mode"

/**
 * Which half of the app the sidebar shows: orders and approvals, or the public page.
 * Orders pages and /link decide it; shared pages (Requests) keep the last one.
 */
function useMode(activePage: string): Mode {
  const forced: Mode | null = activePage.startsWith("link") ? "page" : activePage === "dashboard" || activePage === "orders" ? "orders" : null
  const stored = useSyncExternalStore(
    (cb) => { window.addEventListener(MODE_EVENT, cb); return () => window.removeEventListener(MODE_EVENT, cb) },
    () => { try { return localStorage.getItem(MODE_KEY) === "page" ? "page" : "orders" } catch { return "orders" } },
    () => "orders" as Mode,
  )
  useEffect(() => {
    if (!forced) return
    try { localStorage.setItem(MODE_KEY, forced) } catch {}
  }, [forced])
  return forced ?? stored
}

/** The top of the sidebar: Nodly or My page, with a menu to switch. */
function ModeSwitcher({ mode }: { mode: Mode }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])
  const options: { id: Mode; href: string; title: string; hint: string; icon: React.ReactNode }[] = [
    { id: "orders", href: "/dashboard", title: t("Orders"), hint: t("Drawings, approvals, clients"), icon: <span className="size-[18px]">{NAV_ICONS.orders}</span> },
    { id: "page", href: "/link", title: t("My page"), hint: t("Link for Instagram and requests"), icon: <span className="size-[18px]">{NAV_ICONS.page}</span> },
  ]
  return (
    <div ref={ref} className="relative px-3 pt-3 pb-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
        className="flex h-12 w-full items-center gap-2.5 rounded-xl px-2.5 text-left hover:bg-hover">
        {mode === "page"
          ? <><span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background [&_svg]:size-4">{NAV_ICONS.page}</span><span className="flex-1 truncate text-[15px] font-semibold">{t("My page")}</span></>
          : <span className="flex-1"><Logo /></span>}
        <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute inset-x-3 top-[60px] z-30 flex flex-col gap-0.5 rounded-xl bg-popover p-1.5 shadow-lg ring-1 ring-foreground/10">
          {options.map((o) => (
            <Link key={o.id} href={o.href} role="menuitem" onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-hover">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">{o.icon}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{o.title}</span>
                <span className="truncate text-xs text-muted-foreground">{o.hint}</span>
              </span>
              {mode === o.id && <CheckIcon className="size-4 shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

type SetupStep = { label: string; done: boolean }

/** The page's slug, whether it is live, and the setup steps (for the checklist). */
function usePageSetup(enabled: boolean) {
  const { t } = useT()
  const [row, setRow] = useState<{ slug: string; published: boolean; data: PageData } | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    supabase.from("shop_pages").select("slug, published, data").limit(1).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return
        if (data) setRow({ slug: data.slug, published: data.published, data: cleanPage(data.data, "") })
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [enabled])
  if (!enabled || !loaded) return null
  const d = row?.data
  const steps: SetupStep[] = [
    { label: t("Create your page"), done: !!row },
    { label: t("Add a photo or logo"), done: !!d?.avatar_url },
    { label: t("Write a line about you"), done: !!(d?.tagline || d?.bio) },
    { label: t("Add 3 photos of your work"), done: (d?.portfolio.length ?? 0) >= 3 },
    { label: t("Add a contact"), done: !!d && Object.values(d.contacts).some(Boolean) },
    { label: t("Publish the page"), done: !!row?.published },
  ]
  return { slug: row?.slug ?? "", published: !!row?.published, steps, done: steps.filter((s) => s.done).length }
}

/** "Your setup checklist" at the bottom of the sidebar in page mode. */
function SetupChecklist({ steps, done }: { steps: SetupStep[]; done: number }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const pct = Math.round((done / steps.length) * 100)
  const r = 24
  const c = 2 * Math.PI * r
  return (
    <div className="mx-3 mb-3 flex flex-col gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex flex-col items-start gap-3 text-left">
        <span className="relative flex size-14 items-center justify-center">
          <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
            <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
            <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-foreground"
              strokeDasharray={c} strokeDashoffset={c * (1 - done / steps.length)} />
          </svg>
          <span className="text-sm font-medium tabular-nums">{pct}%</span>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{t("Your setup checklist")}</span>
          <span className="text-sm text-muted-foreground">{t("{done} of {total} complete", { done, total: steps.length })}</span>
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {steps.map((s) => (
            <li key={s.label} className={`flex items-center gap-2 ${s.done ? "text-muted-foreground line-through" : ""}`}>
              <span className={`flex size-4 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-foreground text-background" : "ring-1 ring-foreground/25"}`}>
                {s.done && <CheckIcon className="size-3" />}
              </span>
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <a href="/link/edit" className="flex h-11 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background hover:opacity-90">
        {t("Finish setup")}
      </a>
    </div>
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
