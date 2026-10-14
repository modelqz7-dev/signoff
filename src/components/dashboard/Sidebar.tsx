"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import {
  CakeIcon, CalendarDaysIcon, ChartColumnIcon, ClipboardListIcon, ScissorsIcon, SparklesIcon, UsersIcon, CheckIcon, ChevronsUpDownIcon, CircleHelpIcon, CopyIcon, ExternalLinkIcon, HomeIcon, InboxIcon, LightbulbIcon,
  Link2Icon, LockIcon, LogOutIcon, MessageSquareTextIcon, MoonIcon, PlusIcon, QrCodeIcon, SearchIcon, ShapesIcon, SquarePenIcon, SunIcon,
  SettingsIcon, UserRoundIcon, XIcon,
} from "lucide-react"
import { OPEN_CALENDAR_EVENT, OPEN_NAV_EVENT, OPEN_NEW_BOOKING, OPEN_NEW_PROJECT, PROJECTS_CHANGED, openPanel } from "@/lib/panels"
import { TemplatesDialog } from "@/components/projects/TemplatesDialog"
import type { CanvasTemplate, PostTemplate } from "@/components/projects/templates"
import { can } from "@/lib/plans"
import { FEATURES } from "@/lib/features"
import { nicheConfig, type NicheConfig } from "@/lib/niches"
import { supabase } from "@/lib/supabase"
import { LinkMark, Logo, LogoMark } from "@/components/Logo"
import { setTheme, useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useProfile } from "@/lib/profile"
import { useFileUrl } from "@/lib/files"
import { SidebarPanel, OPEN_PANEL_EVENT, type PanelId } from "@/components/dashboard/SidebarPanels"
import { useT } from "@/lib/i18n"
import { useSyncAccountLang } from "@/lib/account-lang"
import { usePlanUsage } from "@/lib/use-plan"
import { UsageMeter } from "@/components/plans/PlanBits"
import { NavItem, SectionLabel, NAV_ICONS } from "@/components/dashboard/nav"
import { ProjectRow } from "@/components/dashboard/ProjectRow"
import { ProjectAvatar } from "@/components/ProjectAvatar"
import { cleanPage, pagePath, type PageData } from "@/lib/page"
import { siteOrigin } from "@/lib/site"

type SidebarProps = {
  open: boolean
  activePage?: string
}

export function Sidebar({ open, activePage = "dashboard" }: SidebarProps) {
  const [panel, setPanel] = useState<PanelId | null>(null)
  // Checked once here: the phone drawer mounts its own copy of the menu.
  const beta = useBetaAccess()
  // The sidebar is on every signed-in page: a good place to keep the account's language current,
  // and to wear the app's look when one was reached without a full load (the head script sets it otherwise).
  useSyncAccountLang()
  useEffect(() => {
    const root = document.documentElement
    root.classList.add("app")
    return () => root.classList.remove("app")
  }, [])
  // Phones and tablets: the sidebar slides in as a drawer from the header's menu button.
  const [drawer, setDrawer] = useState(false)

  // Other parts of the UI (e.g. the header avatar) can open a panel or the drawer too.
  useEffect(() => {
    function onOpen(e: Event) { setPanel((e as CustomEvent<PanelId>).detail); setDrawer(false) }
    function onNav() { setDrawer(true) }
    function onBooking() { setDrawer(false) }
    window.addEventListener(OPEN_PANEL_EVENT, onOpen)
    window.addEventListener(OPEN_NAV_EVENT, onNav)
    window.addEventListener(OPEN_NEW_BOOKING, onBooking)
    return () => {
      window.removeEventListener(OPEN_PANEL_EVENT, onOpen)
      window.removeEventListener(OPEN_NAV_EVENT, onNav)
      window.removeEventListener(OPEN_NEW_BOOKING, onBooking)
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
    {/* Computers: a narrow rail of icons, as in the reference design */}
    <aside
      className="sticky top-0 z-30 hidden h-screen w-[108px] shrink-0 self-start p-2.5 pr-0 transition-all duration-200 lg:flex"
      style={{ marginLeft: open ? 0 : -108, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
    >
      <Rail activePage={activePage} panel={panel} onPanel={openPanelFromNav} beta={beta} />
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
        <aside className="absolute inset-y-0 left-0 flex w-[270px] max-w-[85vw] flex-col overflow-y-auto border-r border-border/50 bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="absolute top-4 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
          <SidebarContent activePage={activePage} panel={panel} onPanel={openPanelFromNav} beta={beta} />
        </aside>
      </div>
    )}
    <SidebarPanel panel={panel} onClose={() => setPanel(null)} />
    </>
  )
}

/** The phone and tablet drawer: the full list, with names. */
function SidebarContent({ activePage, panel, onPanel, beta }: {
  activePage: string
  beta: boolean
  panel: PanelId | null
  onPanel: (id: PanelId) => void
}) {
  const { t } = useT()
  const setPanel = onPanel
  const newRequests = useNewRequestCount()
  const onPage = activePage.startsWith("link")
  const [soon, setSoon] = useState<SoonFeature | null>(null)
  const page = usePageSetup(onPage)
  const projects = useProjects()
  const [searching, setSearching] = useState(false)
  const createProject = useCreateProject()
  const [creating, setCreating] = useState(false)
  const newProject = () => setCreating(true)
  const usage = usePlanUsage()
  const canvasLocked = !!usage && !can(usage.shop, "canvas")

  const sub = "[&>a]:pl-9 [&>button]:pl-9"
  const niche = useKnownNiche(usage)
  const crm = nicheConfig(niche)
  if (niche === undefined) return <div className="flex flex-1 flex-col" />
  if (crm) {
    const items = crmNav(crm, t)
    return (
      <div className="flex flex-1 flex-col">
        <div className="px-4 pt-4 pb-2"><Link href="/dashboard" className="text-[15px] font-semibold">{usage?.shop.name || "Nodly"}</Link></div>
        <nav className="flex-1 px-3 pt-2 pb-4">
          {items.map((i) => (
            <div key={i.href}>
              <NavItem icon={<i.icon className="size-full" strokeWidth={1.6} />} label={i.label} active={crmActive(i.page, activePage)} href={i.href} />
              {/* on a phone there's no hover menu: My page's screens sit under it */}
              {i.menu && crmActive(i.page, activePage) && (
                <div className="flex flex-col pl-7">
                  {i.menu.slice(1).map((m) => (
                    <Link key={m.href} href={m.href} className="rounded-lg px-2.5 py-1.5 text-[14px] text-muted-foreground hover:bg-hover hover:text-foreground">{m.label}</Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <PlanCard onOpen={() => setPanel("billing")} />
        <AccountRow panel={panel} onPanel={setPanel} />
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col">
      <WorkspaceRow onNewProject={newProject} />
      <TemplatesDialog
        open={creating}
        onOpenChange={setCreating}
        onPosts={(plan) => createProject("posts", null, plan)}
        onPick={(tpl) => createProject("canvas", tpl)}
        canvasLocked={canvasLocked}
        onLocked={() => openPanel("billing")}
      />

      <div className="flex flex-col gap-1.5 px-3 pb-2">
        <button
          type="button"
          onClick={() => setSearching(true)}
          className="flex h-9 items-center gap-2 rounded-lg bg-foreground/[0.04] px-2.5 text-sm text-muted-foreground ring-1 ring-border transition-colors hover:bg-hover"
        >
          <SearchIcon className="size-4" />
          <span className="flex-1 text-left">{t("Search")}</span>
          <kbd className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-sans text-[11px]">Ctrl+K</kbd>
        </button>
                <TopRow activePage={activePage} />
      </div>

      <nav className="flex-1 px-3 pt-2 pb-4">
        <SectionLabel>{t("Projects")}</SectionLabel>
        {projects.map((p) => <ProjectRow key={p.id} project={p} active={activePage === `project:${p.id}`} />)}
        <NavItem icon={<PlusIcon className="size-full" strokeWidth={1.6} />} label={t("New project")} onClick={newProject} />

        <SectionLabel className="mt-5">{t("Page")}</SectionLabel>
        {beta ? (
          <>
            {FEATURES.myPage
              ? <NavItem icon={NAV_ICONS.page} label={t("My page")} active={activePage === "link"} href="/link" />
              : <NavItem icon={NAV_ICONS.page} label={t("My page")} tag={t("soon")} onClick={() => setSoon("page")} />}
            {FEATURES.myPage && onPage && (
              <div className={sub}>
                <NavItem icon={<ChartColumnIcon className="size-full" strokeWidth={1.6} />} label={t("Statistics")} active={activePage === "link-stats"} href="/link/stats" />
                <NavItem icon={<QrCodeIcon className="size-full" strokeWidth={1.6} />} label={t("QR code")} active={activePage === "link-qr"} href="/link/qr" />
                <NavItem icon={<MessageSquareTextIcon className="size-full" strokeWidth={1.6} />} label={t("Reply templates")} active={activePage === "link-replies"} href="/link/replies" />
                <NavItem icon={<LightbulbIcon className="size-full" strokeWidth={1.6} />} label={t("Post ideas")} active={activePage === "link-ideas"} href="/link/ideas" />
                {page?.published && <NavItem icon={<ExternalLinkIcon className="size-full" strokeWidth={1.6} />} label={t("Open page")} href={pagePath(page.slug)} />}
              </div>
            )}
            {FEATURES.myPage && <NavItem icon={NAV_ICONS.requests} label={t("Requests")} active={activePage === "requests"} href="/requests" badge={newRequests} />}
          </>
        ) : (
          <>
            <NavItem icon={NAV_ICONS.page} label={t("My page")} tag={t("soon")} onClick={() => setSoon("page")} />
            {FEATURES.myPage && <NavItem icon={NAV_ICONS.requests} label={t("Requests")} tag={t("soon")} onClick={() => setSoon("requests")} />}
          </>
        )}
      </nav>

      {onPage && page && page.done < page.steps.length
        ? <SetupChecklist steps={page.steps} done={page.done} />
        : <PlanCard onOpen={() => setPanel("billing")} />}
      <AccountRow panel={panel} onPanel={setPanel} />
      {soon && <ComingSoon feature={soon} onClose={() => setSoon(null)} />}
      {searching && <SearchDialog projects={projects} onClose={() => setSearching(false)} />}
    </div>
  )
}

/**
 * The computer's navigation, after the reference design: a dark rail of icons with the logo on
 * top, then the projects as coloured dots, a pink "+" for a new one, and the theme switch and the
 * account at the bottom. Names show beside an icon on hover. It stays dark in both themes.
 */
function Rail({ activePage, panel, onPanel, beta }: {
  activePage: string
  beta: boolean
  panel: PanelId | null
  onPanel: (id: PanelId) => void
}) {
  const { t } = useT()
  const newRequests = useNewRequestCount()
  const projects = useProjects()
  const createProject = useCreateProject()
  const [creating, setCreating] = useState(false)
  const [searching, setSearching] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [soon, setSoon] = useState<SoonFeature | null>(null)
  const usage = usePlanUsage()
  const canvasLocked = !!usage && !can(usage.shop, "canvas")
  const page = usePageSetup(activePage.startsWith("link"))

  // the home page's "New project" opens the gallery here; Ctrl/⌘+K opens search, like Notion
  useEffect(() => {
    const open = () => setCreating(true)
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearching(true) }
    }
    window.addEventListener(OPEN_NEW_PROJECT, open)
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener(OPEN_NEW_PROJECT, open); window.removeEventListener("keydown", onKey) }
  }, [])

  // three faces at most, so the avatar and "+" below never move; the open project always among them
  const activeProject = projects.find((p) => activePage === `project:${p.id}`)
  const shown = activeProject && !projects.slice(0, RAIL_PROJECTS).includes(activeProject)
    ? [...projects.slice(0, RAIL_PROJECTS - 1), activeProject]
    : projects.slice(0, RAIL_PROJECTS)
  const more = projects.length - shown.length
  const linkItems: { href: string; label: string }[] = [
    { href: "/link", label: t("My page") },
    { href: "/link/stats", label: t("Statistics") },
    { href: "/link/qr", label: t("QR code") },
    { href: "/link/replies", label: t("Reply templates") },
    { href: "/link/ideas", label: t("Post ideas") },
    ...(page?.published ? [{ href: pagePath(page.slug), label: t("Open page") }] : []),
  ]

  const niche = useKnownNiche(usage)
  const crm = nicheConfig(niche)
  const booking = useBookingLink(!!crm)
  const [copied, setCopied] = useState(false)
  // until the niche is known, an empty rail: no flash of the other side's buttons
  if (niche === undefined) {
    return (
      <div className="flex h-full w-[98px] flex-col items-center rounded-2xl bg-card py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]">
        <span className="mb-4 flex size-12 items-center justify-center"><LogoMark className="size-10" /></span>
        <div className="mt-auto flex flex-col items-center gap-3"><ThemeSwitch /></div>
      </div>
    )
  }
  if (crm) {
    return (
      <div className="flex h-full w-[98px] flex-col items-center rounded-2xl bg-card py-4 text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]">
        <Link href="/dashboard" aria-label="Nodly" className="mb-4 flex size-12 items-center justify-center"><LogoMark className="size-10" /></Link>
        <nav className="flex flex-col items-center gap-1.5">
          {crmNav(crm, t).map((i) => <RailItem key={i.href} label={i.label} href={i.href} active={crmActive(i.page, activePage)} icon={i.icon} menu={i.menu} />)}
        </nav>
        <div className="my-4 h-px w-10 bg-border" />
        {/* the booking link at hand: copy it for a client or look at it as they do */}
        <div className="flex flex-col items-center gap-1.5">
          {booking?.published ? (
            <>
              <RailItem label={copied ? t("Link copied") : t("Copy booking link")} icon={copied ? CheckIcon : CopyIcon} onClick={async () => {
                try { await navigator.clipboard.writeText(`${siteOrigin()}${pagePath(booking.slug)}`); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch {}
              }} />
              <RailItem label={t("Open page")} icon={ExternalLinkIcon} onClick={() => window.open(pagePath(booking.slug), "_blank", "noopener")} />
            </>
          ) : booking === null ? (
            <RailItem label={t("Set up online booking")} href="/online" icon={Link2Icon} />
          ) : null}
        </div>
        <div className="mt-auto flex flex-col items-center gap-1.5">
          <RailItem label={t("Help")} icon={CircleHelpIcon} active={HELP_PANELS.includes(panel as PanelId)} onClick={() => onPanel("help")} />
          <RailItem label={t("Settings")} icon={SettingsIcon} active={SETTINGS_PANELS.includes(panel as PanelId)} onClick={() => onPanel("notifications")} />
          <div className="my-2.5 h-px w-10 bg-border" />
          <AccountRow panel={panel} onPanel={onPanel} compact />
          <div className="mt-3"><ThemeSwitch /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[98px] flex-col items-center rounded-2xl bg-card py-4 text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none dark:ring-1 dark:ring-white/[0.06]">
      <AppSwitcher linkMode={activePage.startsWith("link")} beta={FEATURES.myPage && (beta || activePage.startsWith("link"))} onSoon={() => setSoon("page")} />

      <nav className="flex flex-col items-center gap-1.5">
        <RailItem label={t("Home")} href="/dashboard" active={activePage === "dashboard"} icon={HomeIcon} />
        {FEATURES.canvas && <RailItem label={t("Canvas")} href="/board" active={activePage === "board"} icon={ShapesIcon} locked={canvasLocked} />}
        <RailItem label={t("Search")} hint="Ctrl+K" icon={SearchIcon} onClick={() => setSearching(true)} />
        {beta ? (
          <>
            {FEATURES.myPage && <RailItem label={t("My page")} href="/link" active={activePage.startsWith("link")} icon={Link2Icon} menu={linkItems} />}
            {/* requests come from My page: they go and come back with it */}
            {FEATURES.myPage && <RailItem label={t("Requests")} href="/requests" active={activePage === "requests"} icon={InboxIcon} badge={newRequests} />}
          </>
        ) : (
          <>
            {FEATURES.myPage && <RailItem label={t("Requests")} hint={t("soon")} icon={InboxIcon} onClick={() => setSoon("requests")} />}
          </>
        )}
      </nav>

      <div className="my-4 h-px w-10 bg-border" />

      {/* projects as dots, newest first */}
      <div className="flex flex-col items-center gap-2.5">
        {shown.map((p) => <ProjectRow key={p.id} project={p} active={activePage === `project:${p.id}`} dot />)}
        {more > 0 && (
          <button type="button" onClick={() => setAllOpen(true)} aria-label={t("All projects")} title={t("All projects")}
            className="flex size-12 items-center justify-center rounded-full bg-muted text-[13px] font-semibold text-foreground transition-colors hover:bg-hover-strong">
            +{more}
          </button>
        )}
        <div className="mt-1"><AccountRow panel={panel} onPanel={onPanel} compact /></div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label={t("New project")}
          title={t("New project")}
          className="mt-1 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          <PlusIcon className="size-6" strokeWidth={1.8} />
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <ThemeSwitch />
      </div>

      <TemplatesDialog
        open={creating}
        onOpenChange={setCreating}
        onPosts={(plan) => createProject("posts", null, plan)}
        onPick={(tpl) => createProject("canvas", tpl)}
        canvasLocked={canvasLocked}
        onLocked={() => openPanel("billing")}
      />
      {soon && <ComingSoon feature={soon} onClose={() => setSoon(null)} />}
      {searching && <SearchDialog projects={projects} onClose={() => setSearching(false)} />}
      {allOpen && <AllProjectsDialog projects={projects} activePage={activePage} onClose={() => setAllOpen(false)} />}
    </div>
  )
}

/** The account's booking page for the rail: null when there is none yet, undefined while loading. */
function useBookingLink(enabled: boolean) {
  const [row, setRow] = useState<{ slug: string; published: boolean } | null | undefined>(undefined)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    supabase.from("shop_pages").select("slug, published").limit(1).maybeSingle()
      .then(({ data, error }) => { if (!cancelled && !error) setRow(data ?? null) })
    return () => { cancelled = true }
  }, [enabled])
  return enabled ? row : undefined
}

const NICHE_KEY = "nodly-niche"

/**
 * The account's niche for the menu: remembered on this device, so a reload draws the right
 * menu at once instead of the other side's for a moment; undefined until known.
 */
function useKnownNiche(usage: ReturnType<typeof usePlanUsage>) {
  const cached = useSyncExternalStore(
    (onChange) => { window.addEventListener("storage", onChange); return () => window.removeEventListener("storage", onChange) },
    () => { try { return localStorage.getItem(NICHE_KEY) } catch { return null } },
    () => null,
  )
  const live = usage ? (usage.shop.niche ?? "") : undefined
  useEffect(() => {
    if (live === undefined) return
    try { localStorage.setItem(NICHE_KEY, live) } catch {}
  }, [live])
  return live ?? cached ?? undefined
}

/** The CRM's screens: bookings (the home), clients and what the business offers. */
function crmNav(crm: NicheConfig, t: ReturnType<typeof useT>["t"]) {
  const offerIcon = crm.id === "cakes" ? CakeIcon : crm.id === "barber" ? ScissorsIcon : SparklesIcon
  return [
    { page: "dashboard", href: "/dashboard", label: crm.kind === "order" ? t("Orders") : t("Appointments"), icon: crm.kind === "order" ? ClipboardListIcon : CalendarDaysIcon },
    { page: "clients", href: "/clients", label: t("Clients"), icon: UsersIcon },
    { page: "services", href: "/services", label: crm.kind === "order" ? t("Products") : t("Services"), icon: offerIcon },
    {
      page: "link", href: "/link", label: t("My page"), icon: Link2Icon,
      // the page, how it looks, when clients can book, how it's doing and its QR code
      menu: [
        { href: "/link", label: t("My page") },
        { href: "/link/edit", label: t("Edit page") },
        { href: "/online", label: t("Online booking") },
        { href: "/link/stats", label: t("Statistics") },
        { href: "/link/qr", label: t("QR code") },
        { href: "/link/replies", label: t("Reply templates") },
        { href: "/link/ideas", label: t("Post ideas") },
      ],
    },
  ]
}

/** Whether a CRM menu item is the open page (My page covers its own screens and the booking hours). */
function crmActive(page: string, activePage: string) {
  return page === "link" ? activePage.startsWith("link") || activePage === "online" : activePage === page
}

/** One icon of the rail, its name in a dark label on hover (or, with menu, a list of links). */
function RailItem({ label, hint, href, icon: Icon, active, onClick, badge, locked, menu }: {
  label: string
  hint?: string
  href?: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  active?: boolean
  onClick?: (e: React.MouseEvent) => void
  badge?: number
  locked?: boolean
  menu?: { href: string; label: string }[]
}) {
  const cls = cn(
    "relative flex size-12 items-center justify-center rounded-2xl transition-colors",
    active ? "bg-hover-strong text-primary" : "hover:bg-hover hover:text-foreground"
  )
  const body = (
    <>
      <Icon className="size-[22px]" strokeWidth={1.6} />
      {!!badge && <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">{badge}</span>}
      {locked && <LockIcon className="absolute right-1.5 bottom-1.5 size-2.5 text-muted-foreground" />}
    </>
  )
  return (
    <div className="group relative">
      {href
        ? <Link href={href} onClick={onClick} aria-label={label} className={cls}>{body}</Link>
        : <button type="button" onClick={onClick} aria-label={label} className={cls}>{body}</button>}
      <div className="invisible absolute top-1/2 left-full z-40 -translate-y-1/2 pl-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
        {menu ? (
          <div className="flex w-52 flex-col gap-0.5 rounded-xl bg-popover p-1.5 shadow-lg ring-1 ring-border">
            {menu.map((m) => (
              <Link key={m.href} href={m.href} className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap text-popover-foreground hover:bg-hover">{m.label}</Link>
            ))}
          </div>
        ) : (
          <span className="flex items-center gap-2 rounded-lg bg-popover px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap text-popover-foreground shadow-lg ring-1 ring-border">
            {label}
            {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
            {locked && <span className="text-[11px] text-muted-foreground">Pro</span>}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * The logo: opens, straight down, the switch between Nodly's two sides as two keycaps (no words, the
 * name shows on hover): the projects (approvals) and My page (the public link page and its requests).
 */
function AppSwitcher({ linkMode, beta, onSoon }: { linkMode: boolean; beta: boolean; onSoon: () => void }) {
  const { t } = useT()
  const router = useRouter()
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
  const go = (href: string | null) => { setOpen(false); if (href) router.push(href); else onSoon() }
  const sides = [
    { id: "projects", on: !linkMode, href: "/dashboard", label: "Nodly", mark: <LogoMark className="size-9" /> },
    { id: "link", on: linkMode, href: beta ? "/link" : null, label: beta ? t("My page") : `${t("My page")} · ${t("soon")}`, mark: <LinkMark className="size-9" /> },
  ]
  return (
    <div ref={ref} className="relative mb-5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={linkMode ? t("My page") : "Nodly"} aria-haspopup="menu" aria-expanded={open}
        className={cn("flex size-12 items-center justify-center rounded-2xl transition-colors hover:bg-hover", open && "bg-hover")}>
        {linkMode ? <LinkMark className="size-9" /> : <LogoMark className="size-9" />}
      </button>
      {open && (
        <div role="menu" className="absolute top-[calc(100%+8px)] left-1/2 z-40 flex -translate-x-1/2 flex-col gap-1 rounded-2xl bg-popover p-1.5 shadow-lg ring-1 ring-border animate-in fade-in slide-in-from-top-1 duration-150">
          {sides.map((s) => (
            <div key={s.id} className="group relative">
              <button type="button" role="menuitemradio" aria-checked={s.on} aria-label={s.label} onClick={() => go(s.href)}
                className={cn("flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-hover", s.on && "bg-hover-strong")}>
                {s.mark}
              </button>
              <span className="pointer-events-none invisible absolute top-1/2 left-full z-40 ml-3 -translate-y-1/2 rounded-lg bg-popover px-2.5 py-1 text-[12.5px] font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:visible group-hover:opacity-100">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Light or dark as one switch: a knob carrying the sun or the moon slides across, the page fades over. */
function ThemeSwitch() {
  const { t } = useT()
  const dark = useTheme() === "dark"
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={t("Dark theme")}
      title={dark ? t("Light theme") : t("Dark theme")}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative h-8 w-[60px] rounded-full bg-muted p-0.5 transition-colors hover:bg-hover-strong"
    >
      <span
        className="relative flex size-7 items-center justify-center rounded-full bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-[#636366]"
        style={{ transform: `translateX(${dark ? 28 : 0}px)` }}
      >
        <SunIcon className={cn("absolute size-4 fill-[#ff9f0a] text-[#ff9f0a] transition-all duration-500", dark ? "scale-50 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100")} strokeWidth={1.8} />
        <MoonIcon className={cn("absolute size-4 fill-[#ffd60a] text-[#ffd60a] transition-all duration-500", dark ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-90 opacity-0")} strokeWidth={1.8} />
      </span>
    </button>
  )
}

type TopId = "home" | "canvas"

// The top row's open pill, kept between pages so the switch animates across navigation.
let lastTop: TopId | null = null
const rememberTop = (id: TopId | null) => { lastTop = id }

/**
 * Home (the dashboard), the workshop's own canvas and the calendar, as in Notion's top row. Only
 * the open one carries its name: picking another folds the old pill down to its icon and
 * unfolds the new one.
 */
function TopRow({ activePage }: { activePage: string }) {
  const { t } = useT()
  const current: TopId | null = activePage === "dashboard" ? "home" : activePage === "board" ? "canvas" : null
  // start from what was open on the previous page, then move to this page's pill
  const [open, setOpen] = useState<TopId | null>(lastTop ?? current)
  useEffect(() => {
    rememberTop(current)
    const frame = requestAnimationFrame(() => setOpen(current))
    return () => cancelAnimationFrame(frame)
  }, [current])
  // fold right away on click; the next page starts from this page's pill and finishes the move
  const go = (id: TopId) => setOpen(id)

  const pill = (id: TopId, href: string, Icon: typeof HomeIcon, label: string) => {
    const on = open === id
    return (
      <Link
        href={href}
        onClick={() => go(id)}
        aria-label={label}
        title={on ? undefined : label}
        className={`flex h-8 items-center rounded-lg px-2 text-sm font-medium transition-colors duration-300 motion-reduce:transition-none ${
          on ? "bg-hover-strong text-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground"
        }`}
      >
        <Icon className="size-4 shrink-0" />
        <span
          className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
            on ? "ml-1.5 max-w-28 opacity-100" : "ml-0 max-w-0 opacity-0"
          }`}
        >
          {label}
        </span>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-1 pt-1">
      {pill("home", "/dashboard", HomeIcon, t("Home"))}
      {FEATURES.canvas && pill("canvas", "/board", ShapesIcon, t("Canvas"))}
      <Link
        href="/dashboard?calendar=1"
        title={t("Calendar")}
        aria-label={t("Calendar")}
        onClick={(e) => {
          if (activePage === "dashboard") { e.preventDefault(); window.dispatchEvent(new Event(OPEN_CALENDAR_EVENT)) }
          else go("home")
        }}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
      >
        <CalendarDaysIcon className="size-4" />
      </Link>
    </div>
  )
}

/** The top of the sidebar: Nodly and "new project". */
function WorkspaceRow({ onNewProject }: { onNewProject: () => void }) {
  const { t } = useT()
  return (
    <div className="flex items-center gap-1 px-3 pt-3 pb-2 max-lg:pr-12">
      <Link href="/dashboard" className="flex h-10 min-w-0 flex-1 items-center rounded-lg px-2 hover:bg-hover">
        <Logo />
      </Link>
      <button type="button" onClick={onNewProject} title={t("New project")} aria-label={t("New project")}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground">
        <SquarePenIcon className="size-4" />
      </button>
    </div>
  )
}

/** The bottom of the sidebar, as in Notion: who you are, with the account and help in its menu. */
function AccountRow({ panel, onPanel, compact }: { panel: PanelId | null; onPanel: (id: PanelId) => void; compact?: boolean }) {
  const { t } = useT()
  const router = useRouter()
  const profile = useProfile()
  const photo = useFileUrl(profile?.avatarUrl) || ""
  const [shop, setShop] = useState<{ name: string; logo_url: string | null } | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    supabase.from("shops").select("name, logo_url").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setShop(data) })
  }, [])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])
  const name = shop?.name || profile?.email || ""
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "N"
  const go = (id: PanelId) => { setOpen(false); onPanel(id) }
  const row = "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[14px] text-foreground/90 transition-colors hover:bg-hover [&_svg]:size-[18px] [&_svg]:text-muted-foreground"
  async function signOut() {
    await supabase.auth.signOut()
    router.replace("/login")
  }
  // you, your plan in one line, then three places and signing out, Apple style
  const menuItems = (
    <>
      <div className="flex items-center gap-3 px-2.5 pt-2 pb-2.5">
        <Avatar className="size-10 shrink-0">
          <AvatarImage key={photo} src={photo} alt="" />
          <AvatarFallback className="bg-foreground/[0.08] text-[12px] font-semibold text-foreground">{initials}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{name}</span>
          {profile?.email && profile.email !== name && <span className="block truncate text-[12.5px] text-muted-foreground">{profile.email}</span>}
        </span>
      </div>
      <PlanLine onOpen={() => go("billing")} />
      <div className="my-1.5 h-px bg-border" />
      <button type="button" role="menuitem" onClick={() => go("profile")} className={row}><UserRoundIcon />{t("Profile")}</button>
      <button type="button" role="menuitem" onClick={() => go("notifications")} className={cn(row, SETTINGS_PANELS.includes(panel as PanelId) && "bg-hover")}><SettingsIcon />{t("Settings")}</button>
      <button type="button" role="menuitem" onClick={() => go("help")} className={cn(row, HELP_PANELS.includes(panel as PanelId) && "bg-hover")}><CircleHelpIcon />{t("Help")}</button>
      <div className="my-1.5 h-px bg-border" />
      <button type="button" role="menuitem" onClick={signOut} className={row}><LogOutIcon />{t("Sign out")}</button>
    </>
  )
  if (compact) {
    // the rail: just the face; the menu opens beside it, with the plan on top
    return (
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={name}
          className="flex size-12 items-center justify-center rounded-full ring-2 ring-border transition-shadow hover:ring-foreground/20">
          <Avatar className="size-11">
            <AvatarImage key={photo} src={photo} alt="" />
            <AvatarFallback className="bg-muted text-[11px] font-semibold text-foreground">{initials}</AvatarFallback>
          </Avatar>
        </button>
        {open && (
          <div role="menu" className="absolute bottom-0 left-[calc(100%+14px)] z-40 flex w-72 flex-col rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-border animate-in fade-in zoom-in-95 duration-150">
            {menuItems}
          </div>
        )}
      </div>
    )
  }
  return (
    <div ref={ref} className="relative flex items-center gap-1 border-t border-border/60 px-2.5 py-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 text-left hover:bg-hover">
        <Avatar className="size-6 shrink-0">
          <AvatarImage key={photo} src={photo} alt="" />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      <button type="button" onClick={() => onPanel("help")} title={t("Help Center")} aria-label={t("Help Center")}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground">
        <CircleHelpIcon className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute inset-x-2.5 bottom-[calc(100%+4px)] z-30 flex flex-col gap-0.5 rounded-xl bg-popover p-1.5 shadow-lg ring-1 ring-foreground/10">
          {menuItems}
        </div>
      )}
    </div>
  )
}

type ProjectLink = { id: string; title: string; client_name: string | null }

/** How many project faces the rail shows before "+N". */
const RAIL_PROJECTS = 3

/** Every project as a face and a name, from the rail's "+N". */
function AllProjectsDialog({ projects, activePage, onClose }: { projects: ProjectLink[]; activePage: string; onClose: () => void }) {
  const { t } = useT()
  const router = useRouter()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh] animate-in fade-in duration-150" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("All projects")} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-popover p-5 text-popover-foreground shadow-2xl ring-1 ring-border animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">{t("All projects")} <span className="font-medium text-muted-foreground">{projects.length}</span></p>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8 items-center justify-center rounded-full hover:bg-hover"><XIcon className="size-4" /></button>
        </div>
        <div className="mt-4 grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {projects.map((p) => (
            <button key={p.id} type="button" onClick={() => { onClose(); router.push(`/orders/${p.id}`) }}
              className={cn("flex flex-col items-center gap-2 rounded-xl px-2 py-3 transition-colors hover:bg-hover", activePage === `project:${p.id}` && "bg-hover-strong")}>
              <ProjectAvatar id={p.id} className="size-14" />
              <span className="w-full truncate text-center text-[12.5px] font-medium">{p.title || t("Untitled")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

/** The shop's projects for the sidebar, newest first. */
function useProjects() {
  const [rows, setRows] = useState<ProjectLink[]>([])
  useEffect(() => {
    let cancelled = false
    const load = () => supabase.from("orders").select("id, title, client_name").eq("kind", "project")
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data, error }) => { if (!cancelled && !error) setRows((data as ProjectLink[]) ?? []) })
    load()
    // a project renamed or created elsewhere shows up here too
    window.addEventListener(PROJECTS_CHANGED, load)
    return () => { cancelled = true; window.removeEventListener(PROJECTS_CHANGED, load) }
  }, [])
  return rows
}

/** Starts an empty project and opens it, like Notion's new page. */
function useCreateProject() {
  const { t } = useT()
  const router = useRouter()
  /**
   * A new project opening on its posts or its canvas: a canvas template laid out on first open,
   * or a post plan's posts made right away (no files yet, each on its day from next Monday).
   */
  return async (view: "posts" | "canvas", template?: CanvasTemplate | null, plan?: PostTemplate | null) => {
    const { data: shop } = await supabase.from("shops").select("id").limit(1).maybeSingle()
    if (!shop) return
    const { data, error } = await supabase.from("orders").insert({
      shop_id: shop.id,
      code: `PRJ-${Date.now().toString(36).toUpperCase()}`,
      title: template ? t(template.title) : plan ? t(plan.title) : t("Untitled"),
      client_name: "",
      status: "await",
      kind: "project",
    }).select("id, code").single()
    if (error) {
      // over the plan's limit: show the plans
      if (error.message?.includes("plan_limit")) openPanel("billing")
      return
    }
    if (plan) {
      const monday = nextMonday()
      await supabase.from("orders").insert(plan.posts.map((post, i) => ({
        shop_id: shop.id,
        code: `${data.code}-${(i + 1).toString().padStart(2, "0")}`,
        title: t(post.title, post.vars),
        client_name: "",
        status: "await",
        kind: "post",
        project_id: data.id,
        position: i + 1,
        publish_on: isoDay(addDays(monday, post.day)),
        file_url: null,
      })))
    }
    window.dispatchEvent(new Event(PROJECTS_CHANGED))
    router.push(`/orders/${data.id}?start=${view}${template ? `&template=${template.id}` : ""}`)
  }
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
/** The coming Monday (a week ahead when today is Monday: time to make and approve the posts). */
function nextMonday(now = new Date()) {
  return addDays(now, ((8 - now.getDay()) % 7) || 7)
}

/** Quick find across projects and orders (Ctrl+K). */
function SearchDialog({ projects, onClose }: { projects: ProjectLink[]; onClose: () => void }) {
  const { t } = useT()
  const [query, setQuery] = useState("")
  const [orders, setOrders] = useState<(ProjectLink & { kind: string })[]>([])
  useEffect(() => {
    supabase.from("orders").select("id, title, client_name, kind").neq("kind", "post")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setOrders((data as (ProjectLink & { kind: string })[]) ?? []))
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const q = query.trim().toLowerCase()
  const all = orders.length ? orders : projects.map((p) => ({ ...p, kind: "project" }))
  const found = (q ? all.filter((o) => `${o.title} ${o.client_name ?? ""}`.toLowerCase().includes(q)) : all).slice(0, 12)
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh] animate-in fade-in duration-150" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("Search")} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-popover p-5 text-popover-foreground shadow-2xl ring-1 ring-border animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">{t("Search")}</p>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8 items-center justify-center rounded-full hover:bg-hover"><XIcon className="size-4" /></button>
        </div>
        <label className="mt-4 flex h-11 items-center gap-2.5 rounded-full bg-muted px-4 ring-1 ring-transparent focus-within:ring-foreground/20">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search projects and orders")}
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground" />
        </label>
        <div className="-mx-2 mt-3 max-h-[50vh] overflow-y-auto">
          {found.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">{t("Nothing found.")}</p>}
          {found.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} onClick={onClose} className="flex items-center gap-3 rounded-xl px-2 py-2 text-[14px] transition-colors hover:bg-hover">
              {o.kind === "project"
                ? <ProjectAvatar id={o.id} className="size-9" />
                : <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-4">{NAV_ICONS.orders}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.title || t("Untitled")}</span>
                {o.client_name && <span className="block truncate text-[12px] text-muted-foreground">{o.client_name}</span>}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
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
    { label: t("Add 3 photos of your work"), done: (d?.projects.reduce((n, p) => n + p.photos.length, 0) ?? 0) >= 3 },
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
            <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-primary"
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
              <span className={`flex size-4 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-primary text-primary-foreground" : "ring-1 ring-foreground/25"}`}>
                {s.done && <CheckIcon className="size-3" />}
              </span>
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <a href="/link/edit" className="flex h-11 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground hover:opacity-90">
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
/** The plan in one line, with the one thing to do about it. */
function PlanLine({ onOpen }: { onOpen: () => void }) {
  const usage = usePlanUsage()
  const { t } = useT()
  if (!usage) return null
  const onTrial = usage.trialDays > 0 && usage.chosen.id === "free"
  const action = onTrial ? t("Choose a plan") : usage.chosen.id !== "pro" ? t("Upgrade") : null
  return (
    <button type="button" onClick={onOpen} className="mx-1 flex items-center gap-2 rounded-xl bg-foreground/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.1]">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          {onTrial ? t("{plan} trial", { plan: t(usage.plan.name) }) : t("{plan} plan", { plan: t(usage.plan.name) })}
        </span>
        {onTrial && <span className="block text-[12px] text-muted-foreground">{t("{n} days left", { n: usage.trialDays })}</span>}
      </span>
      {action && <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground">{action}</span>}
    </button>
  )
}

const SETTINGS_PANELS: PanelId[] = ["notifications", "security", "appearance", "billing"]
const HELP_PANELS: PanelId[] = ["help", "contact", "docs", "status"]

function PlanCard({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const usage = usePlanUsage()
  const { t } = useT()
  if (!usage) return null
  const onTrial = usage.trialDays > 0 && usage.chosen.id === "free"
  const nearLimit = !nicheConfig(usage.shop.niche) && usage.plan.activeOrders !== null && usage.activeOrders >= usage.plan.activeOrders - 1

  return (
    <div className={cn("mx-2.5 mb-3 flex flex-col gap-2.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs whitespace-nowrap">
        <span className="truncate font-medium text-foreground">
          {onTrial ? t("{plan} trial", { plan: t(usage.plan.name) }) : t("{plan} plan", { plan: t(usage.plan.name) })}
        </span>
        {onTrial && (
          <span className="text-[11px] text-muted-foreground">{t("{n}d left", { n: usage.trialDays })}</span>
        )}
      </div>
      {!nicheConfig(usage.shop.niche) && <UsageMeter used={usage.activeOrders} limit={usage.plan.activeOrders} />}
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

/**
 * Requests and My page are still being finished: only addresses in NEXT_PUBLIC_BETA_EMAILS
 * (comma-separated) see them; everyone else gets a "coming soon" note.
 */
// Kept between pages, so the menu doesn't flash "soon" while the next page asks again.
let knownEmail: string | null = null

function useBetaAccess() {
  const [email, setEmail] = useState<string | null>(knownEmail)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      knownEmail = data.session?.user.email?.toLowerCase() ?? null
      setEmail(knownEmail)
    })
  }, [])
  const list = (process.env.NEXT_PUBLIC_BETA_EMAILS ?? "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean)
  return !!email && list.includes(email)
}

type SoonFeature = "requests" | "page"

function ComingSoon({ feature, onClose }: { feature: SoonFeature; onClose: () => void }) {
  const { t } = useT()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const text = feature === "page"
    ? t("Your own page for Instagram: work, prices, contacts and a request form, all on one link. We're finishing it now.")
    : t("Requests clients leave on your page will arrive here and turn into orders in one click. We're finishing it now.")
  // Portal: the phone drawer is animated with a transform, which would trap a fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("Coming soon")} onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[420px] flex-col items-center gap-4 rounded-t-[28px] bg-card px-6 pt-8 pb-6 text-center shadow-2xl sm:rounded-[28px]">
        <button type="button" aria-label={t("Close")} onClick={onClose}
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full hover:bg-hover"><XIcon className="size-5" /></button>
        {feature === "page" ? <LinkMark className="size-16" /> : (
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-7">{NAV_ICONS.requests}</span>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="mx-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{t("Coming soon")}</span>
          <h2 className="text-lg font-bold">{feature === "page" ? t("My page") : t("Requests")}</h2>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
        {feature === "page" && (
          <ul className="flex w-full flex-col gap-2 rounded-2xl bg-foreground/[0.04] p-4 text-left">
            {[
              [t("Your work"), t("Cases and posts you're proud of, as a gallery")],
              [t("Services and prices"), t("What you do and what it costs, so the client knows before writing")],
              [t("Reviews"), t("What your clients say, with their names")],
              [t("A request button"), t("A client leaves a request, and it becomes a project in Nodly in one tap")],
              [t("Statistics and QR"), t("How many people visit, and a QR code for print and stories")],
            ].map(([title, line]) => (
              <li key={title} className="flex gap-2.5">
                <CheckIcon className="mt-0.5 size-4 shrink-0" />
                <span className="text-[13.5px] leading-snug"><span className="font-semibold">{title}.</span> <span className="text-muted-foreground">{line}</span></span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={onClose} className="mt-2 h-11 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground hover:opacity-90">{t("Got it")}</button>
      </div>
    </div>,
    document.body,
  )
}
