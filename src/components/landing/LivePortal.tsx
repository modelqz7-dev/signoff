"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { CheckIcon, MousePointer2Icon, PencilIcon } from "lucide-react"
import { STATUS_MAP } from "@/components/dashboard/types"
import { PinGlyph, PinMarker } from "@/components/orders/pins"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

/**
 * The client portal, playing itself on a loop (like Notion's live product windows):
 * Anna pins three changes on the kitchen drawing, the workshop is notified, version 2
 * scans in with the changes made, Anna presses Approve and the stamp lands.
 * Built from the real portal pieces (pins, status badges), not a video. Pauses off-screen;
 * with reduced motion it simply shows the approved result.
 */

// Pin tips on the drawing, in % of the image.
const PINS = [
  { x: 28.5, y: 33, key: "Matte black handles, please" },
  { x: 62, y: 55, key: "Darker countertop" },
  { x: 79, y: 23, key: "+20 cm on this cabinet?" },
]

// How long each step lasts (ms). See the step comments in the component.
const STEPS = [900, 900, 350, 1500, 600, 850, 500, 850, 700, 1700, 1800, 900, 350, 2800, 600]
const FINAL = 13

type Point = { x: number; y: number }

export function LivePortal({ t }: { t: T }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<HTMLDivElement>(null)
  const approveRef = useRef<HTMLSpanElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [still, setStill] = useState(false)
  const [typed, setTyped] = useState(0)
  const [cursor, setCursor] = useState<Point | null>(null)

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
    if (!running || still) return
    const timer = window.setTimeout(() => {
      const next = (step + 1) % STEPS.length
      if (next === 0) setTyped(0)
      setStep(next)
    }, STEPS[step])
    return () => window.clearTimeout(timer)
  }, [step, running, still])

  // Typing the first comment.
  const firstText = t(PINS[0].key)
  useEffect(() => {
    if (step !== 3) return
    const timer = window.setInterval(() => setTyped((n) => Math.min(n + 1, firstText.length)), 1200 / firstText.length)
    return () => window.clearInterval(timer)
  }, [step, firstText.length])

  // Where the cursor goes on each step, measured from the live layout.
  useLayoutEffect(() => {
    const root = rootRef.current?.getBoundingClientRect()
    if (!root) return
    const at = (el: Element | null, fx = 0.5, fy = 0.5): Point | null => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left - root.left + r.width * fx, y: r.top - root.top + r.height * fy }
    }
    const pin = (i: number) => at(drawingRef.current, PINS[i].x / 100, PINS[i].y / 100)
    const start = { x: root.width * 0.82, y: root.height * 0.86 }
    const target =
      step <= 0 || step >= 14 ? start
      : step <= 4 ? pin(0)
      : step <= 6 ? pin(1)
      : step <= 8 ? pin(2)
      : step <= 10 ? at(listRef.current, 0.5, 0.9) ?? start
      : at(approveRef.current, 0.55, 0.6)
    setCursor(target)
  }, [step])

  const pinsShown = step >= 8 ? 3 : step >= 6 ? 2 : step >= 2 ? 1 : 0
  const rowsShown = step >= 8 ? 3 : step >= 6 ? 2 : step >= 4 ? 1 : 0
  const v2 = step >= 10
  const approved = step >= FINAL && step < 14
  const status = approved ? STATUS_MAP.approved : STATUS_MAP.await
  const toast = step === 9 ? t("Oak & Dot Workshop got 3 comments") : approved && !still ? t("Approved by Anna K. · certificate saved") : null

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden rounded-xl bg-background text-foreground shadow-2xl ring-1 ring-foreground/10 select-none"
      aria-label={t("A demo of the client portal: comments are pinned on a kitchen drawing, version 2 is uploaded and the client approves it")}
      role="img"
    >
      {/* window bar */}
      <div className="flex items-center border-b border-border bg-card px-4 py-2">
        <span className="mx-auto rounded-md bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">nodly.app/portal/kitchen-modern</span>
      </div>

      <div className={cn("transition-opacity duration-500", step === 14 && "opacity-0")}>
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
          {/* the drawing */}
          <div className="p-3 sm:p-5">
            <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                {t("File")}
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{v2 ? t("version {n}", { n: 2 }) : t("version {n}", { n: 1 })}</span>
              </div>
              <div ref={drawingRef} className="relative overflow-hidden rounded-lg ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative demo image */}
                <img src="/landing/kitchen.webp" alt="" className="block w-full" draggable={false} />
                {/* version 2 scans in over version 1 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/kitchen-v2.webp"
                  alt=""
                  draggable={false}
                  className="absolute inset-0 block w-full ease-[cubic-bezier(.45,0,.2,1)]"
                  style={{ clipPath: v2 ? "inset(0 0 0 0)" : "inset(0 0 100% 0)", transition: step === 0 || still ? "none" : "clip-path 1.1s" }}
                />
                {step === 10 && (
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 animate-[scan-line_1.1s_cubic-bezier(.45,0,.2,1)_both] bg-foreground/70" />
                )}

                {PINS.slice(0, pinsShown).map((p, i) => (
                  <div key={i} className="pointer-events-none absolute inset-0 animate-[pin-drop_.45s_cubic-bezier(.2,.9,.3,1)_both]">
                    <PinMarker pin={{ x: p.x, y: p.y, resolved: v2 }} number={i + 1} small selected={step >= 2 && step <= 4 && i === 0} />
                  </div>
                ))}

                {/* the comment being typed */}
                {step >= 2 && step <= 3 && (
                  <div
                    className="absolute z-20 w-[min(62%,260px)] -translate-y-[calc(100%+18px)] rounded-lg bg-popover p-2.5 text-left text-popover-foreground shadow-xl ring-1 ring-foreground/10"
                    style={{ left: `${PINS[0].x - 6}%`, top: `${PINS[0].y}%` }}
                  >
                    <p className="text-[11px] text-muted-foreground">{t("New comment")}</p>
                    <p className="mt-0.5 min-h-5 text-sm">
                      {firstText.slice(0, typed)}
                      <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />
                    </p>
                  </div>
                )}

                {approved && (
                  <div key={step} className="pointer-events-none absolute inset-0 flex items-center justify-center">
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
            <p className="border-b border-border/60 px-4 py-3 text-sm font-medium">{t("Comments ({n})", { n: v2 ? 0 : rowsShown })}</p>
            <ul className="flex flex-col gap-1 p-2">
              {PINS.slice(0, rowsShown).map((p, i) => (
                <li key={i} className="flex animate-[row-in_.35s_ease-out_both] gap-2.5 rounded-lg px-2 py-2">
                  <PinGlyph label={v2 ? undefined : i + 1} resolved={v2} size="sm" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className={cn("truncate text-[13px] font-medium transition-colors", v2 && "text-muted-foreground line-through")}>{t(p.key)}</p>
                    <p className="text-[11px] text-muted-foreground">Anna K. · {v2 ? t("resolved") : t("just now")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* action bar */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-2.5 sm:px-5">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground">
            <PencilIcon className="size-3.5" />
            {t("Request Changes")}
          </span>
          <span
            ref={approveRef}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-transform duration-150",
              step === 12 && "scale-95"
            )}
            style={{ backgroundColor: "var(--status-approved)" }}
          >
            <CheckIcon className="size-3.5" />
            {approved ? t("Approved") : t("Approve")}
          </span>
        </div>
      </div>

      {/* Anna's cursor */}
      {cursor && !still && (
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute z-30 transition-[left,top,opacity] duration-700 ease-[cubic-bezier(.45,0,.2,1)]", step === 14 && "opacity-0")}
          style={{ left: cursor.x, top: cursor.y }}
        >
          {(step === 2 || step === 6 || step === 8 || step === 12) && (
            <span className="absolute top-0 left-0 size-10 animate-[ripple_.5s_ease-out_both] rounded-full bg-foreground/40" />
          )}
          <MousePointer2Icon className="size-5 -translate-x-[3px] -translate-y-[2px] fill-[#5b8def] text-white drop-shadow" strokeWidth={1.5} />
          <span className="ml-3 inline-block rounded-md bg-[#5b8def] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-white shadow">Anna K.</span>
        </div>
      )}

      {/* notifications */}
      {toast && (
        <div key={toast} className="absolute right-3 bottom-14 z-20 flex animate-[toast-in_.35s_ease-out_both] items-center gap-2 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: approved ? "var(--status-approved)" : "var(--foreground)" }} />
          {toast}
        </div>
      )}
    </div>
  )
}
