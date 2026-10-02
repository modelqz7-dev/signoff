"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon } from "lucide-react"
import { PinGlyph, PinMarker } from "@/components/orders/pins"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// "We fixed it", shown rather than said: the client's three comments on version 1 of the
// kitchen, and version 2 under a before / after slider. Pins on the "after" side turn into
// checks. The two renders really differ in exactly those three things.

const PINS = [
  { x: 17.2, y: 32.6, title: "Matte black handles, please", reply: "Matte black, the same as on your wardrobe." },
  { x: 59.7, y: 58, title: "Darker countertop", reply: "Graphite oak. A sample is at the showroom." },
  { x: 81.1, y: 18.5, title: "+20 cm on this cabinet?", reply: "Raised to the ceiling, the doors stay the same." },
]

export function BeforeAfter({ t }: { t: T }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(62)
  const [touched, setTouched] = useState(false)
  const [visible, setVisible] = useState(false)
  const dragging = useRef(false)

  // Sweeps back and forth by itself while on screen, until someone takes the handle.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (touched || !visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      // 7s per sweep, gently easing at both ends
      const p = 50 + 38 * Math.sin(((now - start) / 7000) * Math.PI * 2 + Math.PI / 4)
      setPos(p)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [touched, visible])

  function moveTo(clientX: number) {
    const r = boxRef.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  const fixed = PINS.filter((p) => p.x > pos).length

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      {/* the slider */}
      <div
        ref={boxRef}
        role="slider"
        tabIndex={0}
        aria-label={t("Before and after: drag to compare version 1 and version 2")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onPointerDown={(e) => {
          setTouched(true)
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          moveTo(e.clientX)
        }}
        onPointerMove={(e) => { if (dragging.current) moveTo(e.clientX) }}
        onPointerUp={() => { dragging.current = false }}
        onPointerCancel={() => { dragging.current = false }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
          e.preventDefault()
          setTouched(true)
          setPos((p) => Math.min(100, Math.max(0, p + (e.key === "ArrowLeft" ? -5 : 5))))
        }}
        className="relative aspect-[1200/880] cursor-ew-resize touch-pan-y overflow-hidden rounded-xl bg-muted shadow-2xl ring-1 ring-foreground/10 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* after underneath, before on top clipped to the left of the handle */}
        <img src="/landing/kitchen-v2.webp" alt={t("Version 2 of the kitchen")} draggable={false} className="pointer-events-none absolute inset-0 size-full object-cover" />
        <img
          src="/landing/kitchen.webp"
          alt={t("Version 1 of the kitchen")}
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />

        {/* the client's comments: numbered on the left, done on the right */}
        {PINS.map((p, i) => (
          <PinMarker key={p.title} pin={{ x: p.x, y: p.y, resolved: p.x > pos }} number={i + 1} />
        ))}

        <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium tracking-wide text-white uppercase backdrop-blur-sm">
          {t("Before · version {n}", { n: 1 })}
        </span>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium tracking-wide text-white uppercase backdrop-blur-sm">
          {t("After · version {n}", { n: 2 })}
        </span>

        {/* the handle */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]" style={{ left: `${pos}%` }}>
          <span className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 7-5 5 5 5" /><path d="m15 7 5 5-5 5" />
            </svg>
          </span>
        </div>

        {!touched && (
          <span className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full whitespace-nowrap bg-black/55 px-3 py-1 text-xs text-white backdrop-blur-sm">
            {t("Drag to compare")}
          </span>
        )}
      </div>

      {/* what the client reads next to it, as in the portal */}
      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">{t("What changed in version {n}", { n: 2 })}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{t("{fixed} of {total} comments fixed", { fixed: 3, total: 3 })}</p>
        </div>
        <ul className="flex flex-col divide-y divide-border/60">
          {PINS.map((p, i) => {
            const shown = p.x > pos
            return (
              <li key={p.title} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <PinGlyph label={i + 1} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-foreground">{t(p.title)}</p>
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors", shown ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
                      <CheckIcon className="size-3" strokeWidth={3} />
                      {t("Fixed")}
                    </span>
                  </div>
                  <p className="mt-1 border-l-2 border-foreground/20 pl-2 text-xs text-muted-foreground">{t(p.reply)}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {fixed === PINS.length
            ? t("The client sees every fix on the spot, and can reopen anything that isn't right.")
            : t("Move the handle: each comment turns into a check on version 2.")}
        </p>
      </div>
    </div>
  )
}
