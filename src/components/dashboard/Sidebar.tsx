"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import {
  CalendarDaysIcon, ChartColumnIcon, CheckIcon, ChevronsUpDownIcon, CircleHelpIcon, ExternalLinkIcon, HomeIcon, LightbulbIcon,
  LogOutIcon, MessageSquareTextIcon, PlusIcon, QrCodeIcon, SearchIcon, ShapesIcon, SquarePenIcon, WaypointsIcon, XIcon,
} from "lucide-react"
import { OPEN_CALENDAR_EVENT, OPEN_NAV_EVENT, OPEN_NEW_PROJECT, PROJECTS_CHANGED, openPanel } from "@/lib/panels"
import { TemplatesDialog } from "@/components/projects/TemplatesDialog"
import type { CanvasTemplate, PostTemplate } from "@/components/projects/templates"
import { can } from "@/lib/plans"
import { supabase } from "@/lib/supabase"
import { Logo } from "@/components/Logo"
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
import { cleanPage, pagePath, type PageData } from "@/lib/page"

type SidebarProps = {
  open: boolean
  activePage?: string
}

export function Sidebar({ open, activePage = "dashboard" }: SidebarProps) {
  const [panel, setPanel] = useState<PanelId | null>(null)
  // Checked once here: the phone drawer mounts its own copy of the menu.
  const beta = useBetaAccess()
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
      className="sticky top-0 self-start hidden h-screen w-[270px] shrink-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-200 overflow-y-auto lg:flex"
      style={{
        marginLeft: open ? 0 : -270,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <SidebarContent activePage={activePage} panel={panel} onPanel={openPanelFromNav} beta={beta} slides />
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

function SidebarContent({ activePage, panel, onPanel, beta, slides }: {
  activePage: string
  beta: boolean
  /** The computer sidebar (the phone drawer is a second copy). */
  slides?: boolean
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
  // the home page's "New project" asks the (computer) sidebar to open its gallery
  useEffect(() => {
    if (!slides) return
    const open = () => setCreating(true)
    window.addEventListener(OPEN_NEW_PROJECT, open)
    return () => window.removeEventListener(OPEN_NEW_PROJECT, open)
  }, [slides])
  const usage = usePlanUsage()
  const canvasLocked = !!usage && !can(usage.shop, "canvas")

  // Ctrl/⌘+K opens search from anywhere, like Notion.
  useEffect(() => {
    if (!slides) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearching(true) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [slides])

  const sub = "[&>a]:pl-9 [&>button]:pl-9"
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
            <NavItem icon={NAV_ICONS.page} label={t("My page")} active={activePage === "link"} href="/link" />
            {onPage && (
              <div className={sub}>
                <NavItem icon={<ChartColumnIcon className="size-full" strokeWidth={1.6} />} label={t("Statistics")} active={activePage === "link-stats"} href="/link/stats" />
                <NavItem icon={<QrCodeIcon className="size-full" strokeWidth={1.6} />} label={t("QR code")} active={activePage === "link-qr"} href="/link/qr" />
                <NavItem icon={<MessageSquareTextIcon className="size-full" strokeWidth={1.6} />} label={t("Reply templates")} active={activePage === "link-replies"} href="/link/replies" />
                <NavItem icon={<LightbulbIcon className="size-full" strokeWidth={1.6} />} label={t("Post ideas")} active={activePage === "link-ideas"} href="/link/ideas" />
                {page?.published && <NavItem icon={<ExternalLinkIcon className="size-full" strokeWidth={1.6} />} label={t("Open page")} href={pagePath(page.slug)} />}
              </div>
            )}
            <NavItem icon={NAV_ICONS.requests} label={t("Requests")} active={activePage === "requests"} href="/requests" badge={newRequests} />
          </>
        ) : (
          <>
            <NavItem icon={NAV_ICONS.page} label={t("My page")} tag={t("soon")} onClick={() => setSoon("page")} />
            <NavItem icon={NAV_ICONS.requests} label={t("Requests")} tag={t("soon")} onClick={() => setSoon("requests")} />
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
      {pill("canvas", "/board", ShapesIcon, t("Canvas"))}
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
function AccountRow({ panel, onPanel }: { panel: PanelId | null; onPanel: (id: PanelId) => void }) {
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
  const item = (id: PanelId, icon: React.ReactNode, label: string) => (
    <NavItem key={id} icon={icon} label={label} active={panel === id} onClick={() => { setOpen(false); onPanel(id) }} />
  )
  async function signOut() {
    await supabase.auth.signOut()
    router.replace("/login")
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
          <SectionLabel>{t("Account")}</SectionLabel>
          {item("profile", NAV_ICONS.profile, t("Profile"))}
          {item("billing", NAV_ICONS.billing, t("Billing"))}
          {item("notifications", NAV_ICONS.notifications, t("Notifications"))}
          {item("security", NAV_ICONS.security, t("Security"))}
          {item("appearance", NAV_ICONS.appearance, t("Appearance"))}
          <SectionLabel className="mt-1">{t("Support")}</SectionLabel>
          {item("help", NAV_ICONS.help, t("Help Center"))}
          {item("contact", NAV_ICONS.contact, t("Contact Us"))}
          {item("docs", NAV_ICONS.docs, t("Documentation"))}
          {item("status", NAV_ICONS.status, t("Status"))}
          <div className="my-1 h-px bg-border" />
          <NavItem icon={<LogOutIcon className="size-full" strokeWidth={1.6} />} label={t("Sign out")} onClick={signOut} />
        </div>
      )}
    </div>
  )
}

type ProjectLink = { id: string; title: string; client_name: string | null }

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
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("Search")} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl bg-popover shadow-2xl ring-1 ring-foreground/10">
        <label className="flex items-center gap-2 border-b border-border px-4">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search projects and orders")}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {found.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("Nothing found.")}</p>}
          {found.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} onClick={onClose} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-hover">
              <span className="size-4 shrink-0 text-muted-foreground">
                {o.kind === "project" ? <WaypointsIcon className="size-4" /> : NAV_ICONS.orders}
              </span>
              <span className="min-w-0 flex-1 truncate">{o.title || t("Untitled")}</span>
              {o.client_name && <span className="truncate text-xs text-muted-foreground">{o.client_name}</span>}
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
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-7">
          {feature === "page" ? NAV_ICONS.page : NAV_ICONS.requests}
        </span>
        <div className="flex flex-col gap-1.5">
          <span className="mx-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{t("Coming soon")}</span>
          <h2 className="text-lg font-bold">{feature === "page" ? t("My page") : t("Requests")}</h2>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
        <button type="button" onClick={onClose} className="mt-2 h-11 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground hover:opacity-90">{t("Got it")}</button>
      </div>
    </div>,
    document.body,
  )
}
