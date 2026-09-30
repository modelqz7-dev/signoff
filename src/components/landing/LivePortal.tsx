"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { CheckIcon, MinusIcon, MousePointer2Icon, MousePointerClickIcon, PencilIcon, PlusIcon, RotateCcwIcon } from "lucide-react"
import { STATUS_MAP } from "@/components/dashboard/types"
import { PinGlyph, PinMarker } from "@/components/orders/pins"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

/**
 * The client portal, playing itself on a loop (like Notion's live product windows):
 * Anna zooms in, pins three changes on the kitchen, the workshop is notified, version 2
 * scans in with the changes made, Anna presses Approve and the stamp lands.
 * Built from the real portal pieces (pins, status badges, the viewer's zoom bar), not a
 * video. Clicking anything hands it over to the visitor: zoom, drag, pin comments and
 * approve it yourself. Pauses off-screen; with reduced motion it shows the approved result.
 */

// Pin tips on the kitchen render, in % of the image.
const PINS = [
  { x: 17.2, y: 32.6, key: "Matte black handles, please" },
  { x: 59.7, y: 58, key: "Darker countertop" },
  { x: 81.1, y: 18.5, key: "+20 cm on this cabinet?" },
]

// How long each step lasts (ms). See the step comments in the component.
const STEPS = [900, 800, 700, 700, 350, 1500, 600, 700, 600, 700, 500, 700, 700, 1700, 1800, 900, 350, 2800, 600]
const FINAL = 17
const FADE = 18

type Point = { x: number; y: number }

// The viewer's zoom: z times, centred on (x, y) in % of the image.
type View = { z: number; x: number; y: number }
const FIT: View = { z: 1, x: 50, y: 50 }
const MAX_ZOOM = 3
function clampView(v: View): View {
  const z = Math.min(Math.max(v.z, 1), MAX_ZOOM), h = 50 / z
  return { z, x: Math.min(Math.max(v.x, h), 100 - h), y: Math.min(Math.max(v.y, h), 100 - h) }
}
const toScreen = (v: View, p: Point): Point => ({ x: (p.x - v.x) * v.z + 50, y: (p.y - v.y) * v.z + 50 })
const toImage = (v: View, p: Point): Point => ({ x: (p.x - 50) / v.z + v.x, y: (p.y - 50) / v.z + v.y })
const ZOOMED = clampView({ z: 1.8, x: PINS[0].x, y: PINS[0].y })

// 0 idle · 1 to the zoom button · 2 zoom in · 3 to the handle · 4 pin drops · 5 typing ·
// 6 posted · 7 to 100% · 8 zoom out · 9 to the top · 10 pin · 11 to the cabinet · 12 pin ·
// 13 workshop notified · 14 version 2 scans in · 15 to Approve · 16 press · 17 approved · 18 fade
const viewFor = (step: number) => (step >= 2 && step <= 7 ? ZOOMED : FIT)

type Comment = Point & { text: string }

export function LivePortal({ t }: { t: T }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<HTMLDivElement>(null)
  const zoomInRef = useRef<HTMLButtonElement>(null)
  const fitRef = useRef<HTMLButtonElement>(null)
  const approveRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [still, setStill] = useState(false)
  const [typed, setTyped] = useState(0)
  const [cursor, setCursor] = useState<(Point & { left: boolean; up: boolean }) | null>(null)

  // The visitor's own go: "auto" plays the loop, "you" hands the portal over.
  const [mode, setMode] = useState<"auto" | "you">("auto")
  const [mine, setMine] = useState<Comment[]>([])
  const [draft, setDraft] = useState<Point | null>(null)
  const [draftText, setDraftText] = useState("")
  const [youApproved, setYouApproved] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef(0)
  const auto = mode === "auto"

  // Zoom, tweened frame by frame so the image and the pins move together.
  const [view, setView] = useState<View>(FIT)
  const viewRef = useRef<View>(FIT)
  const rafRef = useRef(0)
  const animateTo = useCallback((to: View, ms = 650) => {
    cancelAnimationFrame(rafRef.current)
    const from = viewRef.current, t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min((now - t0) / ms, 1)
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      const v = clampView({ z: from.z + (to.z - from.z) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e })
      viewRef.current = v
      setView(v)
      if (k < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); window.clearTimeout(noteTimer.current) }, [])

  // Only play while visible; with reduced motion show the end state.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => { setStill(true); setStep(FINAL) }, 0)
      return () => window.clearTimeout(timer)
    }
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.35 })
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

  useEffect(() => {
    if (auto && !still) animateTo(viewFor(step))
  }, [step, auto, still, animateTo])

  // Typing the first comment.
  const firstText = t(PINS[0].key)
  useEffect(() => {
    if (step !== 5 || !auto) return
    const timer = window.setInterval(() => setTyped((n) => Math.min(n + 1, firstText.length)), 1200 / firstText.length)
    return () => window.clearInterval(timer)
  }, [step, auto, firstText.length])

  // Where the cursor goes on each step, measured from the live layout.
  useLayoutEffect(() => {
    const root = rootRef.current?.getBoundingClientRect()
    if (!root || !auto) return
    const at = (el: Element | null, fx = 0.5, fy = 0.5): Point | null => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left - root.left + r.width * fx, y: r.top - root.top + r.height * fy }
    }
    const pin = (i: number) => {
      const p = toScreen(viewFor(step), PINS[i])
      return at(drawingRef.current, p.x / 100, p.y / 100)
    }
    const start = { x: root.width * 0.82, y: root.height * 0.86 }
    const target =
      (step <= 0 || step >= FADE ? start
      : step <= 2 ? at(zoomInRef.current)
      : step <= 6 ? pin(0)
      : step <= 8 ? at(fitRef.current)
      : step <= 10 ? pin(1)
      : step <= 12 ? pin(2)
      : step <= 14 ? at(listRef.current, 0.5, 0.9)
      : at(approveRef.current, 0.55, 0.6)) ?? start
    // Near the right or bottom edge the name tag goes on the other side, so it never gets cut off.
    setCursor({ ...target, left: target.x > root.width - 120, up: target.y > root.height - 44 })
  }, [step, auto])

  function showNote(text: string) {
    window.clearTimeout(noteTimer.current)
    setNote(text)
    noteTimer.current = window.setTimeout(() => setNote(null), 2600)
  }

  // The visitor takes over: a fresh version 1 with no comments, at the current zoom.
  function takeOver(first?: Point) {
    if (!auto) return
    setMode("you")
    setMine([])
    setDraft(first ?? null)
    setDraftText("")
    setYouApproved(false)
    setNote(null)
  }

  function replay() {
    setMode("auto")
    setDraft(null)
    setTyped(0)
    setStep(0)
    animateTo(FIT)
  }

  function zoom(factor: number | "fit") {
    takeOver()
    const v = viewRef.current
    animateTo(factor === "fit" ? FIT : clampView({ ...v, z: v.z * factor }), 300)
  }

  function approve() {
    takeOver()
    setDraft(null)
    setYouApproved(true)
    showNote(t("Approved by Anna K. · certificate saved"))
  }

  function requestChanges() {
    takeOver()
    showNote(auto || mine.length === 0 ? t("Pin a comment on the kitchen first.") : t("Oak & Dot Workshop got {n} comments", { n: mine.length }))
  }

  function post(e: React.FormEvent) {
    e.preventDefault()
    const text = draftText.trim()
    if (draft && text) setMine((list) => [...list, { ...draft, text }])
    setDraft(null)
    setDraftText("")
  }

  // Click on the kitchen to pin a comment, drag to pan when zoomed in.
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null)
  function localPoint(e: React.PointerEvent) {
    const r = drawingRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, view: viewRef.current, moved: false }
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true
    if (!d.moved || d.view.z <= 1) return
    takeOver()
    const r = drawingRef.current!.getBoundingClientRect()
    cancelAnimationFrame(rafRef.current)
    const v = clampView({ z: d.view.z, x: d.view.x - ((e.clientX - d.x) / r.width) * 100 / d.view.z, y: d.view.y - ((e.clientY - d.y) / r.height) * 100 / d.view.z })
    viewRef.current = v
    setView(v)
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    dragRef.current = null
    if (!d || d.moved) return
    const p = toImage(viewRef.current, localPoint(e))
    if (auto) { takeOver(p); return }
    if (youApproved) return
    setDraft(p)
    setDraftText("")
  }

  const pinsShown = step >= 12 ? 3 : step >= 10 ? 2 : step >= 4 ? 1 : 0
  const rowsShown = step >= 12 ? 3 : step >= 10 ? 2 : step >= 6 ? 1 : 0
  const v2 = auto && step >= 14
  const approved = auto ? step >= FINAL && step < FADE : youApproved
  const status = approved ? STATUS_MAP.approved : STATUS_MAP.await
  const pins: Comment[] = auto ? PINS.slice(0, pinsShown).map((p) => ({ x: p.x, y: p.y, text: t(p.key) })) : mine
  const rows: Comment[] = auto ? PINS.slice(0, rowsShown).map((p) => ({ x: p.x, y: p.y, text: t(p.key) })) : mine
  const toast = !auto ? note
    : step === 13 ? t("Oak & Dot Workshop got 3 comments")
    : approved && !still ? t("Approved by Anna K. · certificate saved")
    : null
  const typing = auto && step >= 4 && step <= 5
  const composerAt = typing ? toScreen(view, PINS[0]) : draft && !auto ? toScreen(view, draft) : null
  const clickStep = step === 2 || step === 4 || step === 8 || step === 10 || step === 12 || step === 16

  return (
    <div className="relative lg:mt-14">
    {/* Anna, the client, and the workshop's maker peek over the window's top edge */}
    {/* eslint-disable-next-line @next/next/no-img-element -- decorative character art */}
    <img
      src="/landing/characters/client-flipped.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute -top-[86px] left-[12%] z-0 hidden w-[130px] select-none lg:block"
    />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/landing/characters/maker-flipped.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none absolute -top-[86px] right-[12%] z-0 hidden w-[130px] select-none lg:block"
    />
    {/* their hands grip the window's edge, drawn over it; both hold on the whole time */}
    <Grip className="left-[calc(12%+18px)]" />
    <Grip className="left-[calc(12%+84px)]" />
    <Grip className="right-[calc(12%+84px)]" />
    <Grip className="right-[calc(12%+18px)]" />
    <div
      ref={rootRef}
      role="group"
      aria-label={t("A demo of the client portal: comments are pinned on a kitchen drawing, version 2 is uploaded and the client approves it")}
      className="relative z-10 overflow-hidden rounded-xl bg-background text-foreground shadow-2xl ring-1 ring-foreground/10 select-none"
    >
      {/* window bar */}
      <div className="flex items-center border-b border-border bg-card px-4 py-2">
        <span className="mx-auto rounded-md bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">nodly.app/portal/kitchen-modern</span>
      </div>

      <div className={cn("transition-opacity duration-500", auto && step === FADE && "opacity-0")}>
        {/* portal header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="hidden border-r border-border/60 pr-3 font-medium sm:inline">Oak &amp; Dot Workshop</span>
            <span className="truncate font-medium">{t("Kitchen “Modern”")}</span>
            <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] transition-colors duration-500" style={{ backgroundColor: status.bg, color: status.color }}>
              {t(status.label)}
            </span>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("Viewing as")} <span className="font-medium text-foreground">Anna K.</span>
          </span>
        </div>

        <div className="grid md:grid-cols-[1fr_240px]">
          {/* the file, in the portal's viewer */}
          <div className="p-3 sm:p-5">
            <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {t("File")}
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{v2 ? t("version {n}", { n: 2 }) : t("version {n}", { n: 1 })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {auto ? (
                    <button type="button" onClick={() => takeOver()} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-foreground px-2.5 text-[11px] font-medium text-background transition-opacity hover:opacity-85">
                      <MousePointerClickIcon className="size-3.5" />
                      {t("Try it yourself")}
                    </button>
                  ) : (
                    <button type="button" onClick={replay} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                      <RotateCcwIcon className="size-3.5" />
                      {t("Replay demo")}
                    </button>
                  )}
                  <div className="flex items-center rounded-lg border border-border/60">
                    <button type="button" aria-label={t("Zoom out")} onClick={() => zoom(1 / 1.25)} disabled={!auto && view.z <= 1} className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40">
                      <MinusIcon className="size-3.5" />
                    </button>
                    <button ref={fitRef} type="button" aria-label={t("Fit page")} onClick={() => zoom("fit")} className={cn("h-7 min-w-11 rounded-md text-[11px] text-muted-foreground tabular-nums transition-[transform,background-color] hover:text-foreground", auto && step === 8 && "scale-90 bg-muted")}>
                      {Math.round(view.z * 100)}%
                    </button>
                    <button ref={zoomInRef} type="button" aria-label={t("Zoom in")} onClick={() => zoom(1.25)} disabled={!auto && view.z >= MAX_ZOOM} className={cn("grid size-7 place-items-center rounded-md text-muted-foreground transition-[transform,background-color,color] hover:text-foreground disabled:opacity-40", auto && step === 2 && "scale-90 bg-muted text-foreground")}>
                      <PlusIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div
                ref={drawingRef}
                className={cn("relative aspect-[15/11] overflow-hidden rounded-lg bg-muted ring-1 ring-black/5", view.z > 1 ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-crosshair touch-pan-y")}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { dragRef.current = null }}
              >
                {/* the image, zoomed and panned */}
                <div className="absolute inset-0 origin-top-left will-change-transform" style={{ transform: `translate(${50 - view.x * view.z}%, ${50 - view.y * view.z}%) scale(${view.z})` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- decorative demo image */}
                  <img src="/landing/kitchen.webp" alt="" className="absolute inset-0 size-full" draggable={false} />
                  {/* version 2 scans in over version 1 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing/kitchen-v2.webp"
                    alt=""
                    draggable={false}
                    className="absolute inset-0 size-full ease-[cubic-bezier(.45,0,.2,1)]"
                    style={{ clipPath: v2 ? "inset(0 0 0 0)" : "inset(0 0 100% 0)", transition: step === 0 || still || !auto ? "none" : "clip-path 1.1s" }}
                  />
                </div>
                {auto && step === 14 && (
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 animate-[scan-line_1.1s_cubic-bezier(.45,0,.2,1)_both] bg-foreground/70" />
                )}

                {pins.map((p, i) => {
                  const at = toScreen(view, p)
                  if (at.x < -2 || at.x > 102 || at.y < -2 || at.y > 102) return null
                  return (
                    <div key={`${mode}-${i}`} className="pointer-events-none absolute inset-0 animate-[pin-drop_.45s_cubic-bezier(.2,.9,.3,1)_both]">
                      <PinMarker pin={{ x: at.x, y: at.y, resolved: v2 }} number={i + 1} small selected={auto && step >= 4 && step <= 6 && i === 0} />
                    </div>
                  )
                })}
                {draft && !auto && (
                  <div className="pointer-events-none absolute inset-0">
                    <PinMarker pin={{ ...toScreen(view, draft), resolved: false }} pending />
                  </div>
                )}

                {/* the comment being written */}
                {composerAt && (
                  <div
                    className={cn(
                      "absolute z-20 w-[min(62%,260px)] rounded-lg bg-popover p-2.5 text-left text-popover-foreground shadow-xl ring-1 ring-foreground/10",
                      composerAt.y > 35 ? "-translate-y-[calc(100%+18px)]" : "translate-y-3"
                    )}
                    style={composerAt.x > 55 ? { right: `${Math.max(100 - composerAt.x - 6, 2)}%`, top: `${composerAt.y}%` } : { left: `${Math.max(composerAt.x - 6, 2)}%`, top: `${composerAt.y}%` }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                  >
                    <p className="text-[11px] text-muted-foreground">{t("New comment")}</p>
                    {typing ? (
                      <p className="mt-0.5 min-h-5 text-sm">
                        {firstText.slice(0, typed)}
                        <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />
                      </p>
                    ) : (
                      <form onSubmit={post} className="mt-1 flex flex-col gap-2">
                        <input
                          autoFocus
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setDraft(null) }}
                          placeholder={t("What should be changed?")}
                          aria-label={t("New comment")}
                          className="w-full rounded-md bg-muted px-2 py-1.5 text-sm outline-none select-text placeholder:text-muted-foreground"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setDraft(null)} className="h-7 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground">{t("Cancel")}</button>
                          <button type="submit" disabled={!draftText.trim()} className="h-7 rounded-md bg-foreground px-2.5 text-xs font-medium text-background disabled:opacity-40">{t("Post")}</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {approved && (
                  <div key={auto ? step : "you"} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className={cn("rounded-lg border-[5px] border-double border-[var(--status-approved)] bg-white/75 px-4 py-1 text-[var(--status-approved)] backdrop-blur-[1px]", !still && "animate-[stamp_.45s_cubic-bezier(.2,.9,.3,1)_both]")} style={still ? { transform: "rotate(-9deg)" } : undefined}>
                      <p className="font-[family-name:var(--font-brand)] text-2xl font-bold tracking-[0.2em] sm:text-3xl">{t("APPROVED")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* comments list */}
          <div ref={listRef} className="hidden border-l border-border/60 md:block">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-medium">{t("Comments ({n})", { n: v2 ? 0 : rows.length })}</p>
              {!auto && !approved && <p className="mt-0.5 text-xs text-muted-foreground">{t("Click anywhere on the kitchen to add one.")}</p>}
            </div>
            <ul className="flex flex-col gap-1 p-2">
              {rows.map((p, i) => (
                <li key={`${mode}-${i}`} className="flex animate-[row-in_.35s_ease-out_both] gap-2.5 rounded-lg px-2 py-2">
                  <PinGlyph label={v2 ? undefined : i + 1} resolved={v2} size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className={cn("truncate text-[13px] font-medium transition-colors", v2 && "text-muted-foreground line-through")}>{p.text}</p>
                    <p className="text-[11px] text-muted-foreground">Anna K. · {v2 ? t("resolved") : t("just now")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* action bar */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-2.5 sm:px-5">
          <button type="button" onClick={requestChanges} disabled={!auto && approved} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-hover disabled:opacity-50">
            <PencilIcon className="size-3.5" />
            {t("Request Changes")}
          </button>
          <button
            ref={approveRef}
            type="button"
            onClick={approve}
            disabled={!auto && approved}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-[transform,opacity] duration-150 hover:opacity-90",
              auto && step === 16 && "scale-95"
            )}
            style={{ backgroundColor: "var(--status-approved)" }}
          >
            <CheckIcon className="size-3.5" />
            {approved ? t("Approved") : t("Approve")}
          </button>
        </div>
      </div>

      {/* Anna's cursor */}
      {auto && cursor && !still && (
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute z-30 transition-[left,top,opacity] duration-700 ease-[cubic-bezier(.45,0,.2,1)]", step === FADE && "opacity-0")}
          style={{ left: cursor.x, top: cursor.y }}
        >
          {clickStep && (
            <span className="absolute top-0 left-0 size-10 animate-[ripple_.5s_ease-out_both] rounded-full bg-foreground/40" />
          )}
          <MousePointer2Icon className="size-5 -translate-x-[3px] -translate-y-[2px] fill-[#5b8def] text-white drop-shadow" strokeWidth={1.5} />
          <span className={cn("absolute inline-flex w-max items-center gap-1 rounded-md bg-[#5b8def] py-0.5 pr-1.5 pl-0.5 text-[11px] font-medium whitespace-nowrap text-white shadow", cursor.left ? "right-2" : "left-3", cursor.up ? "bottom-8" : "top-4")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/characters/client.svg" alt="" className="size-4 rounded-full bg-white" />
            Anna K.
          </span>
        </div>
      )}

      {/* notifications */}
      {toast && (
        <div key={toast} className="pointer-events-none absolute right-3 bottom-[5.5rem] z-20 flex animate-[toast-in_.35s_ease-out_both] items-center gap-2 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: approved ? "var(--status-approved)" : "var(--foreground)" }} />
          {toast}
        </div>
      )}
    </div>
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
