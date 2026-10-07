"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AwardIcon, CheckIcon, ChevronDownIcon, MoonIcon, MousePointer2Icon, MousePointerClickIcon, PencilIcon, RotateCcwIcon, SendIcon, Trash2Icon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/Logo"
import { NAV_ICONS, NavItem, SectionLabel } from "@/components/dashboard/nav"
import { STATUS_MAP, type OrderStatus } from "@/components/dashboard/types"
import { UsageMeter } from "@/components/plans/PlanBits"
import { ApprovedBanner, ReviewSteps } from "@/components/portal/ReviewFlow"
import { PinList, PinMarker, CommentsIcon } from "@/components/orders/pins"
import type { Pin } from "@/lib/pins"
import { useT, type T } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * A working copy of the product, playing itself on a loop (like Notion's and Ramp's live
 * product windows), built from the app's own components: the workshop copies the portal link
 * on the order page, Anna opens the portal, pins three comments on the website mockup, version 2
 * comes in, she approves it, and the order page shows the approval. "Try it yourself" hands
 * the portal to the visitor. Rendered at a fixed app size and scaled to fit, like a
 * screenshot. Pauses off-screen; with reduced motion it shows the approved portal.
 */

// Pin tips on the website mockup, in % of the image.
const PINS = [
  { x: 44, y: 27, key: "Shorter headline, please, it's too long" },
  { x: 19, y: 55, key: "Button in our brand colour, please" },
  { x: 84, y: 30, key: "A brighter photo, closer to our menu" },
]

// How long each step lasts (ms).
// Order page: 0 idle · 1 to Copy Link · 2 copied
// Portal: 3 opens · 4 scroll to the file · 5 to the handle · 6 pin + form · 7 typing · 8 to Add ·
// 9 added · 10 to the top · 11 pin · 12 to the cabinet · 13 pin · 14 version 2 comes in ·
// 15 to Approve · 16 dialog · 17 to the checkbox · 18 checked · 19 to Approve · 20 approved · 21 hold
// Order page: 22 approved · 23 fade
const STEPS = [1100, 900, 1300, 800, 900, 800, 900, 1400, 700, 900, 700, 600, 700, 700, 2600, 900, 800, 600, 500, 600, 2200, 600, 2800, 600]
const FINAL = 20
const FADE = 23

// The app is laid out at a fixed size, then scaled to the window.
const WIDE = { w: 1200, h: 740 }
const NARROW = { w: 440, h: 820 }

type Point = { x: number; y: number }
type Mine = Point & { title: string; description: string }

const sceneOf = (step: number) => (step <= 2 || step >= 22 ? "shop" : "portal")

export function LivePortal({ t }: { t: T }) {
  const { lang, locale } = useT()
  const rootRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLDivElement>(null)
  const fileCardRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLSpanElement>(null)
  const copyRef = useRef<HTMLSpanElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const approveRef = useRef<HTMLSpanElement>(null)
  const checkRef = useRef<HTMLSpanElement>(null)
  const confirmRef = useRef<HTMLSpanElement>(null)

  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [still, setStill] = useState(false)
  const [typed, setTyped] = useState(0)
  // The cursor is moved frame by frame (see below), not through React state.
  const cursorRef = useRef<HTMLDivElement>(null)
  const basePos = useRef<Point | null>(null)
  const path = useRef<{ from: Point; c1: Point; c2: Point; to: Point; t0: number; ms: number } | null>(null)
  const cursorScene = useRef<string | null>(null)
  const [fit, setFit] = useState<{ scale: number; narrow: boolean } | null>(null)

  // The visitor's own go at the portal.
  const [mode, setMode] = useState<"auto" | "you">("auto")
  const [mine, setMine] = useState<Mine[]>([])
  const [pending, setPending] = useState<Point | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dialog, setDialog] = useState<"approve" | "changes" | null>(null)
  const [checked, setChecked] = useState(false)
  const [youStatus, setYouStatus] = useState<OrderStatus>("await")
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(noteTimer.current), [])
  const auto = mode === "auto"

  const size = fit?.narrow ? NARROW : WIDE
  const scale = fit?.scale ?? 1

  // Scale the app to the window's width.
  useLayoutEffect(() => {
    const el = fitRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const narrow = w < 700
      setFit({ scale: w / (narrow ? NARROW.w : WIDE.w), narrow })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Only play while visible; with reduced motion show the approved portal.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => { setStill(true); setStep(FINAL) }, 0)
      return () => window.clearTimeout(timer)
    }
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.3 })
    if (rootRef.current) io.observe(rootRef.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!running || still || !auto) return
    const timer = window.setTimeout(() => {
      const next = (step + 1) % STEPS.length
      if (next === 0) setTyped(0)
      setStep(next)
    }, STEPS[step])
    return () => window.clearTimeout(timer)
  }, [step, running, still, auto])

  // Typing the first comment.
  const firstText = t(PINS[0].key)
  useEffect(() => {
    if (step !== 7 || !auto) return
    const timer = window.setInterval(() => setTyped((n) => Math.min(n + 1, firstText.length)), 1100 / firstText.length)
    return () => window.clearInterval(timer)
  }, [step, auto, firstText.length])

  // Position of an element inside the app, in the app's own (unscaled) pixels.
  const at = (el: Element | null, fx = 0.5, fy = 0.5): Point | null => {
    const app = appRef.current?.getBoundingClientRect()
    if (!el || !app) return null
    const r = el.getBoundingClientRect()
    return { x: (r.left - app.left + r.width * fx) / scale, y: (r.top - app.top + r.height * fy) / scale }
  }
  const offsetInMain = (el: Element | null) => {
    const main = mainRef.current
    if (!el || !main) return 0
    return (el.getBoundingClientRect().top - main.getBoundingClientRect().top) / scale + main.scrollTop
  }

  // Where the cursor goes on each step, measured from the live layout. It travels there on a
  // gentle arc, speeding up and slowing down like a hand, and arrives just before the click.
  useLayoutEffect(() => {
    if (!auto || !fit) return
    const rest = { x: size.w * 0.8, y: size.h * 0.72 }
    // A new person takes the mouse: their cursor starts at rest and fades in.
    const scene = sceneOf(step)
    if (cursorScene.current !== scene || !basePos.current) {
      cursorScene.current = scene
      basePos.current = rest
      path.current = null
    }
    // Clicking and typing keep the cursor where it is, even while the page scrolls under it.
    if ([2, 6, 7, 9, 11, 13, 16, 18, 20, 21].includes(step)) return
    const pin = (i: number) => at(fileRef.current, PINS[i].x / 100, PINS[i].y / 100)
    const target: Point =
      (step === 1 ? at(copyRef.current)
      : step === 5 ? pin(0)
      : step === 8 ? at(addRef.current)
      : step === 10 ? pin(1)
      : step === 12 ? pin(2)
      : step === 14 ? at(listRef.current, 0.5, 0.3)
      : step === 15 ? at(approveRef.current)
      : step === 17 ? at(checkRef.current)
      : step === 19 ? at(confirmRef.current)
      : null) ?? rest
    const from = basePos.current
    const dx = target.x - from.x, dy = target.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 2) return
    // bend the path a little to one side, alternating, as a wrist does
    const bend = Math.min(dist * 0.14, 70) * (step % 2 ? 1 : -1)
    const nx = -dy / dist, ny = dx / dist
    path.current = {
      from,
      c1: { x: from.x + dx * 0.3 + nx * bend, y: from.y + dy * 0.3 + ny * bend },
      c2: { x: from.x + dx * 0.78 + nx * bend * 0.45, y: from.y + dy * 0.78 + ny * bend * 0.45 },
      to: target,
      t0: performance.now(),
      ms: Math.max(Math.min(STEPS[step] - 60, 1150), 420),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure per step only
  }, [step, auto, fit])

  // One animation loop draws the cursor: along the current path, and with a slight drift of
  // the hand while it waits, so it never freezes.
  useEffect(() => {
    if (!auto || still || !running) return
    let frame = 0
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      const p = path.current
      if (p) {
        const k = Math.min((now - p.t0) / p.ms, 1)
        // a soft ease in and out: no sudden dash in the middle of a long move
        const e = (1 - Math.cos(Math.PI * k)) / 2
        const u = 1 - e
        basePos.current = {
          x: u * u * u * p.from.x + 3 * u * u * e * p.c1.x + 3 * u * e * e * p.c2.x + e * e * e * p.to.x,
          y: u * u * u * p.from.y + 3 * u * u * e * p.c1.y + 3 * u * e * e * p.c2.y + e * e * e * p.to.y,
        }
        if (k >= 1) path.current = null
      }
      const b = basePos.current, el = cursorRef.current
      if (!b || !el) return
      const driftX = Math.sin(now / 820) * 1.6 + Math.sin(now / 310) * 0.4
      const driftY = Math.cos(now / 1040) * 1.3 + Math.sin(now / 450) * 0.4
      el.style.transform = `translate3d(${b.x + driftX}px, ${b.y + driftY}px, 0)`
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [auto, still, running])

  // The portal scrolls like a real page: down to the file, to the comment form, and back.
  useEffect(() => {
    const main = mainRef.current
    if (!main || !auto || sceneOf(step) !== "portal") return
    const fileTop = Math.max(offsetInMain(fileCardRef.current) - 12, 0)
    const form = formRef.current
    const formBottom = form ? offsetInMain(form) + form.offsetHeight - (main.clientHeight - 88) : fileTop
    const top = step === 3 ? 0 : step >= 6 && step <= 8 ? formBottom : fileTop
    main.scrollTo({ top, behavior: step === 3 || still ? "auto" : "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll per step only
  }, [step, auto, still])

  // On the visitor's go, bring the comment form into view when it opens.
  useEffect(() => {
    const main = mainRef.current, form = formRef.current
    if (auto || !pending || !main || !form) return
    main.scrollTo({ top: offsetInMain(form) + form.offsetHeight - (main.clientHeight - 88), behavior: "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, auto])

  function showNote(text: string) {
    window.clearTimeout(noteTimer.current)
    setNote(text)
    noteTimer.current = window.setTimeout(() => setNote(null), 2800)
  }

  function takeOver() {
    setMode("you")
    setMine([])
    setPending(null)
    setTitle("")
    setDescription("")
    setDialog(null)
    setChecked(false)
    setYouStatus("await")
    setNote(null)
    mainRef.current?.scrollTo({ top: 0 })
  }

  function replay() {
    setMode("auto")
    setDialog(null)
    setPending(null)
    setTyped(0)
    setStep(0)
  }

  // ── what's on screen ──
  const scene = auto ? sceneOf(step) : "portal"
  const status: OrderStatus = auto ? (step >= FINAL ? "approved" : "await") : youStatus
  const statusInfo = STATUS_MAP[status]
  const v2 = auto && step >= 14
  const version = v2 ? 2 : 1
  const autoPins = step >= 13 ? 3 : step >= 11 ? 2 : step >= 9 ? 1 : 0
  const pins: Pin[] = auto
    ? PINS.slice(0, autoPins).map((p, i) => pinOf(i, p, t(p.key), null, v2))
    : mine.map((p, i) => pinOf(i, p, p.title, p.description || null, false))
  const numbers = new Map(pins.map((p, i) => [p.id, i + 1]))
  const openCount = pins.filter((p) => !p.resolved).length
  const draft: Point | null = auto ? (step >= 6 && step <= 8 ? PINS[0] : null) : pending
  const draftTitle = auto ? firstText.slice(0, step === 8 ? firstText.length : typed) : title
  const shownDialog = auto ? (step >= 16 && step <= 19 ? "approve" : null) : dialog
  const shownChecked = auto ? step >= 18 : checked
  const copied = auto && step === 2
  const toast = !auto ? note
    : step === 2 ? t("Portal link copied")
    : step === 14 ? t("Lumen Studio uploaded version 2")
    : step === 20 || step === 21 ? t("Approved by Anna K. · certificate saved")
    : step === 22 ? t("Anna Kovalenko approved Website “Bloom”")
    : null
  const clickStep = [2, 6, 9, 11, 13, 16, 18, 20].includes(step)
  const date = (y: number, m: number, d: number) => new Date(y, m, d).toLocaleDateString(locale, { dateStyle: "long" })
  const wide = !fit?.narrow
  const shopCursor = scene === "shop"

  const room = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- demo image */}
      <img src="/landing/bloom-site.webp" alt={t("Website “Bloom”")} className="pointer-events-none block w-full object-contain" draggable={false} />
      {/* version 2 scans in over version 1 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/bloom-site-v2.webp"
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 block w-full ease-[cubic-bezier(.45,0,.2,1)]"
        style={{ clipPath: version === 2 ? "inset(0 0 0 0)" : "inset(0 0 100% 0)", transition: auto && step === 14 && !still ? "clip-path 1.1s" : "none" }}
      />
      {auto && step === 14 && (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 animate-[scan-line_1.1s_cubic-bezier(.45,0,.2,1)_both] bg-foreground/70" />
      )}
    </>
  )

  // ── the workshop's order page ──
  const portalCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("Client Portal")}</CardTitle>
        <CardDescription>{t("Share this link with your client to view and approve.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{t("Portal Link")}</Label>
            <Input readOnly value="https://nodly.app/portal/bloom-website" className="font-mono text-xs" />
            <span ref={copyRef} className="mt-1 block">
              <Button variant="outline" size="sm" className={cn("w-full transition-transform", copied && "scale-[.98]")}>
                {copied ? (
                  <span className="flex items-center gap-1.5 text-[var(--status-approved)]">
                    <CheckIcon className="size-3.5" />
                    {t("Copied")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-3.5 w-3.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="5" width="9" height="9" rx="1.5" />
                      <path d="M5 11H3.5A1.5 1.5 0 0 1 2 9.5v-7A1.5 1.5 0 0 1 3.5 1h7A1.5 1.5 0 0 1 12 2.5V5" />
                    </svg>
                    {t("Copy Link")}
                  </span>
                )}
              </Button>
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-border/40 pt-4">
            <Label className="text-xs">{t("Access Password")}</Label>
            <Input readOnly placeholder={t("New password")} className="text-sm" />
            <div className="mt-1 flex gap-2">
              <Button variant="outline" size="sm" isDisabled className="flex-1">{t("Change password")}</Button>
              <Button variant="ghost" size="sm">{t("Remove")}</Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/60">{t("Password is set. Client needs this to access.")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const shop = (
    <div className="flex h-full">
      {wide && (
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border/50 bg-sidebar">
          <div className="flex items-center px-5 py-5"><Logo /></div>
          <nav className="flex-1 px-2.5 pt-1 pb-4">
            <SectionLabel>{t("General")}</SectionLabel>
            <NavItem icon={NAV_ICONS.dashboard} label={t("Dashboard")} />
            <NavItem icon={NAV_ICONS.orders} label={t("Orders")} active />
            <SectionLabel className="mt-5">{t("Account")}</SectionLabel>
            <NavItem icon={NAV_ICONS.profile} label={t("Profile")} />
            <NavItem icon={NAV_ICONS.billing} label={t("Billing")} />
            <NavItem icon={NAV_ICONS.notifications} label={t("Notifications")} />
            <NavItem icon={NAV_ICONS.security} label={t("Security")} />
            <NavItem icon={NAV_ICONS.appearance} label={t("Appearance")} />
            <SectionLabel className="mt-5">{t("Support")}</SectionLabel>
            <NavItem icon={NAV_ICONS.help} label={t("Help Center")} />
            <NavItem icon={NAV_ICONS.contact} label={t("Contact Us")} />
          </nav>
          <div className="mx-2.5 mb-3 flex flex-col gap-2.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <span className="text-xs font-medium text-foreground">{t("{plan} plan", { plan: t("Studio") })}</span>
            <UsageMeter used={3} limit={null} />
          </div>
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className={cn("flex h-16 shrink-0 items-center justify-between gap-3 border-b", wide ? "px-6" : "px-4")}>
          <h1 className="truncate text-base font-light tracking-wide text-foreground">
            {t("Welcome back,")} <span className="font-medium">Lumen Studio</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
                <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </span>
            <Avatar className="h-8 w-8"><AvatarFallback>LS</AvatarFallback></Avatar>
          </div>
        </header>
        <div className={cn("min-h-0 flex-1 overflow-hidden", wide ? "p-6" : "p-4")}>
          <div className="flex gap-6">
            <div className="flex min-w-0 flex-1 justify-center">
              <div className="flex w-full max-w-2xl flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-lg font-medium text-foreground">{t("Website “Bloom”")}</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">ORD-24</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {status === "approved" && (
                      <span className="mr-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground">
                        <AwardIcon className="size-3.5" />
                        {t("Certificate")}
                      </span>
                    )}
                    <Badge variant="secondary" className="border-0 px-2.5 py-1 text-xs" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                      {t(statusInfo.label)}
                    </Badge>
                    <span className="grid size-8 place-items-center text-muted-foreground"><Trash2Icon className="size-4" /></span>
                  </div>
                </div>
                {!wide && portalCard}
                <Card>
                  <CardHeader><CardTitle className="text-sm">{t("Details")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className={cn("grid gap-x-6 gap-y-4", wide ? "grid-cols-3" : "grid-cols-2")}>
                      <Info label={t("Client")} value="Anna Kovalenko" />
                      <Info label={t("Email")} value="anna@kovalenko.studio" />
                      <Info label={t("Contact")} value="—" />
                      <Info label={t("Price")} value="$8,400" />
                      <Info label={t("Deadline")} value={date(2026, 9, 5)} />
                      <Info label={t("Created")} value={date(2026, 8, 21)} />
                      <Info label={t("Status")} value={t(statusInfo.label)} color={statusInfo.color} />
                      <Info label={t("Stage")} value={t("mockup")} />
                      <Info label={t("Code")} value="ORD-24" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {t("File")}
                      {version > 1 && <span className="text-xs font-normal text-muted-foreground">{t("version {n}", { n: version })}</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative overflow-hidden rounded-lg border border-border/50 bg-muted/60">
                      {room}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {wide && <aside className="flex w-[300px] shrink-0 flex-col gap-5">{portalCard}</aside>}
          </div>
        </div>
      </div>
    </div>
  )

  // ── the client portal ──
  const portal = (
    <div className="flex h-full flex-col bg-background">
      <header className={cn("flex shrink-0 items-center justify-between gap-3 border-b border-border/40 py-2.5", wide ? "px-6" : "px-4")}>
        <span className="truncate text-sm font-medium text-foreground">Lumen Studio</span>
        <div className="flex items-center gap-3">
          {wide && (
            <span className="text-xs text-muted-foreground">
              {t("Viewing as")} <span className="font-medium text-foreground">Anna Kovalenko</span>
            </span>
          )}
          <div className="flex items-center gap-1">
            <span className="flex h-8 items-center gap-6 rounded-md border border-border px-2.5 text-sm text-foreground">
              {lang === "ru" ? "Русский" : "English"}
              <ChevronDownIcon className="size-3.5 text-muted-foreground" />
            </span>
            <span className="grid size-8 place-items-center text-muted-foreground"><MoonIcon className="size-4" /></span>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div ref={mainRef} className={cn("flex min-w-0 flex-1 justify-center pt-6 pb-28", wide ? "px-6" : "px-4", auto ? "overflow-hidden" : "overflow-y-auto")}>
          <div className="flex h-fit w-full max-w-6xl flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">ORD-24</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className={cn("font-[family-name:var(--font-brand)] leading-tight font-bold tracking-[-0.03em] text-foreground", wide ? "text-3xl" : "text-2xl")}>{t("Website “Bloom”")}</h1>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">{t(statusInfo.label)}</span>
              </div>
            </div>
            {status === "approved" ? (
              <ApprovedBanner order={{ approved_at: new Date().toISOString(), approved_by: "Anna Kovalenko" }} />
            ) : (
              <ReviewSteps status={status} commented={pins.length > 0} />
            )}
            <div className={cn("grid items-start gap-5", wide && "grid-cols-[minmax(0,1fr)_300px]")}>
            <div ref={fileCardRef} className="min-w-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {t("Design")}
                    {version > 1 && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{t("version {n}", { n: version })}</span>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t("Click on the file to leave a comment.")}</p>
                </CardHeader>
                <CardContent>
                  <div
                    ref={fileRef}
                    className="relative w-full cursor-crosshair overflow-hidden rounded-lg border border-border/50 bg-muted/60"
                    onClick={(e) => {
                      if (auto || status === "approved") return
                      const r = e.currentTarget.getBoundingClientRect()
                      setPending({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
                      setTitle("")
                      setDescription("")
                    }}
                  >
                    {room}
                    {pins.filter((p) => !p.resolved).map((p) => (
                      <div key={p.id} className="pointer-events-none absolute inset-0 animate-[pin-drop_.45s_cubic-bezier(.2,.9,.3,1)_both]">
                        <PinMarker pin={p} number={numbers.get(p.id)} />
                      </div>
                    ))}
                    {draft && <PinMarker pin={{ ...draft, resolved: false }} pending />}
                  </div>

                  {/* New pin form */}
                  {draft && (
                    <div ref={formRef} className="mt-4 flex flex-col gap-3 rounded-lg border border-border/40 p-4">
                      <p className="text-xs font-medium text-foreground">{t("New comment")}</p>
                      <Input
                        aria-label={t("Title *")}
                        placeholder={t("Title *")}
                        value={draftTitle}
                        readOnly={auto}
                        autoFocus={!auto}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                        className="text-sm"
                      />
                      <Textarea
                        aria-label={t("Description (optional)")}
                        placeholder={t("Description (optional)")}
                        value={auto ? "" : description}
                        readOnly={auto}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onPress={() => setPending(null)}>{t("Cancel")}</Button>
                        <span ref={addRef} className="inline-flex">
                          <Button
                            size="sm"
                            isDisabled={!draftTitle.trim()}
                            className={cn("transition-transform", auto && step === 9 && "scale-95")}
                            onPress={() => {
                              if (!pending || !title.trim()) return
                              setMine((list) => [...list, { ...pending, title: title.trim(), description: description.trim() }])
                              setPending(null)
                            }}
                          >
                            {t("Add comment")}
                          </Button>
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>{t("Details")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="flex flex-col divide-y divide-border/50 text-[13px]">
                    <Row label={t("Client")} value="Anna Kovalenko" />
                    <Row label={t("Price")} value="$8,400" />
                    <Row label={t("Deadline")} value={date(2026, 9, 5)} />
                    <Row label={t("Created")} value={date(2026, 8, 21)} />
                  </dl>
                </CardContent>
              </Card>
              {wide && (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>{t("Comments ({n})", { n: openCount })}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-1.5">
                    <div ref={listRef}>
                      <PinList pins={pins} numbers={numbers} emptyText="No comments yet. Click on the file to add one." />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* action bar */}
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95">
          <div className={cn("mx-auto flex max-w-6xl items-center gap-2 py-3", wide ? "px-6" : "px-4")}>
            {!wide && (
              <Button variant="outline" size="sm"><CommentsIcon />{openCount}</Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {status === "approved" ? (
                <>
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    <CheckIcon className="size-4" />
                    {t("Approved")}
                  </span>
                  <Button variant="ghost" size="sm">{t("Something's wrong? Ask for changes")}</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" isDisabled={status === "changes"} onPress={() => setDialog("changes")}>
                    <PencilIcon />
                    {status === "changes" ? t("Changes requested") : t("Request Changes")}
                  </Button>
                  <span ref={approveRef} className="inline-flex">
                    <Button
                      onPress={() => { setChecked(false); setDialog("approve") }}
                      className={cn("transition-transform", auto && step === 16 && "scale-95")}
                    >
                      <CheckIcon />
                      {t("Approve")}
                    </Button>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* confirmation dialogs, as in the portal */}
        {shownDialog && (
          <div className="absolute inset-0 z-40 animate-in bg-black/20 duration-150 fade-in-0">
            <div className="absolute top-1/2 left-1/2 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-in gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-150 fade-in-0 zoom-in-95">
              {shownDialog === "approve" ? (
                <>
                  <div className="flex flex-col gap-2">
                    <p className="font-heading text-base leading-none font-medium">{t("Approve this design?")}</p>
                    <p className="text-sm text-muted-foreground">
                      {version > 1
                        ? t("You're approving version {n} of “{title}”. Work continues from this version.", { n: version, title: t("Website “Bloom”") })
                        : t("You're approving “{title}”. Work continues from this version.", { title: t("Website “Bloom”") })}
                    </p>
                  </div>
                  {openCount > 0 && (
                    <p className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "var(--status-changes-bg)", color: "var(--status-changes)" }}>
                      {t("You still have {n} open comments. If they matter, ask for changes instead.", { n: openCount })}
                    </p>
                  )}
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <span ref={checkRef} className="mt-0.5 inline-flex">
                      <input
                        type="checkbox"
                        checked={shownChecked}
                        readOnly={auto}
                        onChange={(e) => setChecked(e.target.checked)}
                        className="size-4 shrink-0 accent-[var(--foreground)]"
                      />
                    </span>
                    <span>{t("I've checked the design and confirm it")}</span>
                  </label>
                  <div className="-mx-4 -mb-4 flex flex-row justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
                    <Button variant="outline" onPress={() => setDialog(null)}>{t("Cancel")}</Button>
                    <span ref={confirmRef} className="inline-flex">
                      <Button
                        isDisabled={!shownChecked}
                        onPress={() => {
                          setDialog(null)
                          setPending(null)
                          setYouStatus("approved")
                          showNote(t("Approved by Anna K. · certificate saved"))
                        }}
                        className={cn(auto && step === 20 && "scale-95")}
                      >
                        <CheckIcon />
                        {t("Approve")}
                      </Button>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <p className="font-heading text-base leading-none font-medium">{t("Ask for changes?")}</p>
                    <p className="text-sm text-muted-foreground">
                      {openCount > 0
                        ? t("They'll get your request with {n} comments and send a new version.", { n: openCount })
                        : t("You haven't left any comments yet. Click on the design to show what to change, so they know what to fix.")}
                    </p>
                  </div>
                  <div className="-mx-4 -mb-4 flex flex-row justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
                    <Button variant="outline" onPress={() => setDialog(null)}>{openCount > 0 ? t("Cancel") : t("Add comments first")}</Button>
                    <Button
                      onPress={() => {
                        setDialog(null)
                        setYouStatus("changes")
                        showNote(t("Lumen Studio got {n} comments", { n: openCount }))
                      }}
                    >
                      <SendIcon />
                      {openCount > 0 ? t("Send request") : t("Send without comments")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    // Wider than the text column around it, so the app reads at close to its real size.
    <div ref={rootRef} className="relative left-1/2 w-[min(1360px,calc(100vw-2rem))] -translate-x-1/2 lg:mt-14">
      <div className="relative">
        {/* Anna, the client, and the freelancer peek over the window's top edge */}
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative character art */}
        <img src="/landing/characters/client-flipped.svg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute -top-[86px] left-[12%] z-0 hidden w-[130px] select-none lg:block" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/characters/freelancer-flipped.svg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute -top-[86px] right-[12%] z-0 hidden w-[130px] select-none lg:block" />
        {/* their hands grip the window's edge, drawn over it; both hold on the whole time */}
        <Grip className="left-[calc(12%+18px)]" />
        <Grip className="left-[calc(12%+84px)]" />
        <Grip className="right-[calc(12%+84px)]" />
        <Grip className="right-[calc(12%+18px)]" />

        <div
          role="group"
          aria-label={t("A demo of the client portal: comments are pinned on a website mockup, version 2 is uploaded and the client approves it")}
          className="relative z-10 overflow-hidden rounded-xl bg-background text-foreground shadow-2xl ring-1 ring-foreground/10"
        >
          {/* window bar */}
          <div className="flex items-center border-b border-border bg-card px-4 py-2">
            <span className="mx-auto rounded-md bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">
              {scene === "shop" ? "nodly.app/orders/ord-24" : "nodly.app/portal/bloom-website"}
            </span>
          </div>

          <div ref={fitRef} className="relative w-full overflow-hidden" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
            <div
              ref={appRef}
              data-demo
              inert={auto}
              className={cn("absolute top-0 left-0 origin-top-left select-none", !fit && "opacity-0")}
              style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
            >
              <div key={scene} className={cn("h-full animate-in transition-opacity duration-500 fade-in-0", auto && step === FADE && "opacity-0")}>
                {scene === "shop" ? shop : portal}
              </div>

              {/* the cursor: the workshop on the order page, Anna in the portal */}
              {auto && fit && !still && (
                <div
                  key={`cursor-${scene}`}
                  ref={cursorRef}
                  aria-hidden="true"
                  className={cn("pointer-events-none absolute top-0 left-0 z-50 animate-in transition-opacity duration-500 fade-in-0 will-change-transform", step === FADE && "opacity-0")}
                  style={{ transform: `translate3d(${size.w * 0.8}px, ${size.h * 0.72}px, 0)` }}
                >
                  {clickStep && <span className="absolute top-0 left-0 size-12 animate-[ripple_.5s_ease-out_both] rounded-full bg-foreground/35" />}
                  <MousePointer2Icon className={cn("size-6 -translate-x-[3px] -translate-y-[2px] text-white drop-shadow", shopCursor ? "fill-[#e0913a]" : "fill-[#5b8def]")} strokeWidth={1.5} />
                  <span
                    className={cn(
                      "absolute inline-flex w-max items-center gap-1 rounded-md py-0.5 pr-2 pl-0.5 text-[13px] font-medium whitespace-nowrap text-white shadow",
                      // always above and to the left of the pointer, so it never has to jump sides at an edge
                      "right-3 bottom-full mb-0.5",
                      shopCursor ? "bg-[#e0913a]" : "bg-[#5b8def]"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shopCursor ? "/landing/characters/freelancer.svg" : "/landing/characters/client.svg"} alt="" className="size-5 rounded-full bg-white" />
                    {shopCursor ? "Lumen" : "Anna K."}
                  </span>
                </div>
              )}

              {/* notifications */}
              {toast && (
                <div key={toast} className="pointer-events-none absolute right-6 bottom-20 z-50 flex animate-[toast-in_.35s_ease-out_both] items-center gap-2 rounded-lg bg-popover px-3.5 py-2.5 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10">
                  <span className="size-2 rounded-full" style={{ backgroundColor: status === "approved" ? "var(--status-approved)" : "var(--foreground)" }} />
                  {toast}
                </div>
              )}
            </div>

            {/* while it plays itself, any click hands the portal to the visitor */}
            {auto && (
              <button type="button" onClick={takeOver} aria-label={t("Try it yourself")} className="absolute inset-0 z-20 cursor-pointer" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
        {auto ? (
          <button type="button" onClick={takeOver} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground transition-opacity hover:opacity-85">
            <MousePointerClickIcon className="size-4" />
            {t("Try it yourself")}
          </button>
        ) : (
          <>
            <span className="text-muted-foreground">{t("You're Anna now: click the design to leave a comment.")}</span>
            <button type="button" onClick={replay} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 font-medium text-foreground transition-colors hover:bg-hover">
              <RotateCcwIcon className="size-4" />
              {t("Replay demo")}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function pinOf(i: number, p: Point, title: string, description: string | null, resolved: boolean): Pin {
  return { id: `demo-${i}`, order_id: "demo", x: p.x, y: p.y, page: 1, title, description, author_name: "Anna Kovalenko", resolved, created_at: "" }
}

/** A details row, as on the portal. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground" suppressHydrationWarning>{value}</dd>
    </div>
  )
}

function Info({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground" style={color ? { color } : undefined} suppressHydrationWarning>{value}</span>
    </div>
  )
}

/** A cartoon hand whose fingers curl over the window's top edge. */
function Grip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 30" aria-hidden="true" className={cn("pointer-events-none absolute -top-[15px] z-20 hidden h-[30px] w-[38px] lg:block", className)}>
      <g fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round">
        <path d="M4 17C4 7 10 2 19 2s15 5 15 15Z" />
        {[13, 16, 15, 12].map((h, i) => (
          <rect key={i} x={4 + i * 7.6} y={10} width={7} height={h} rx={3.5} />
        ))}
      </g>
    </svg>
  )
}
