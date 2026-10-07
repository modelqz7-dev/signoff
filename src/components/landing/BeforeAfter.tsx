"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// The client's three comments on version 1 of the website, one tab each, with the same
// spot on version 1 and version 2 side by side, like the before / after view in the portal.
// The two renders really differ in exactly these three things.

const CHANGES = [
  {
    tab: "Headline",
    ask: "Shorter headline, please, it's too long",
    reply: "Cut it to four words and made it bigger.",
    x: 26, y: 28, zoom: 2,
  },
  {
    tab: "Button",
    ask: "Button in our brand colour, please",
    reply: "Done: terracotta, like on your logo.",
    x: 22, y: 60, zoom: 2.8,
  },
  {
    tab: "Photo",
    ask: "A brighter photo, closer to our menu",
    reply: "Swapped for the latte shot from your photo shoot.",
    x: 76, y: 43, zoom: 1.7,
  },
] as const

const HOLD_MS = 5000
// The renders are 1200 × 880; the windows on them are 4:3.
const IMAGE_RATIO = 880 / 1200
const WINDOW_RATIO = 3 / 4

/** A 4:3 window on the render, zoomed in on (x, y) in % of the image. */
function Spot({ src, alt, x, y, zoom }: { src: string; alt: string; x: number; y: number; zoom: number }) {
  // Image size relative to the window, then shift it so (x, y) sits in the middle, without
  // letting an edge of the image show.
  const h = (zoom * IMAGE_RATIO) / WINDOW_RATIO
  const left = Math.min(0, Math.max((1 - zoom) * 100, 50 - x * zoom))
  const top = Math.min(0, Math.max((1 - h) * 100, 50 - y * h))
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute max-w-none transition-[left,top,width] duration-500 ease-out"
        style={{ width: `${zoom * 100}%`, left: `${left}%`, top: `${top}%` }}
      />
    </div>
  )
}

export function BeforeAfter({ t }: { t: T }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [held, setHeld] = useState(false)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setAuto(false), 0)
      return () => window.clearTimeout(timer)
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 })
    if (rootRef.current) io.observe(rootRef.current)
    return () => io.disconnect()
  }, [])

  const change = CHANGES[index]
  const playing = auto && visible && !held

  return (
    <div ref={rootRef} className="flex flex-col gap-5" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}>
      <div role="tablist" aria-label={t("The client's comments")} className="flex gap-6 border-b border-border/60">
        {CHANGES.map((c, i) => {
          const active = i === index
          return (
            <button
              key={c.tab}
              type="button"
              role="tab"
              id={`change-tab-${i}`}
              aria-selected={active}
              aria-controls="change-panel"
              onClick={() => { setIndex(i); setAuto(false) }}
              className={cn(
                "relative -mb-px pb-3 text-sm transition-colors",
                active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="mr-1.5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              {t(c.tab)}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-foreground/15">
                  <span
                    key={index}
                    className={cn("block h-full bg-primary", auto && "animate-[tab-progress_linear_both]")}
                    style={auto ? { animationDuration: `${HOLD_MS}ms`, animationPlayState: playing ? "running" : "paused" } : undefined}
                    onAnimationEnd={() => setIndex((n) => (n + 1) % CHANGES.length)}
                  />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div id="change-panel" role="tabpanel" aria-labelledby={`change-tab-${index}`} className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-end">
        <div className="grid grid-cols-2 gap-3">
          <figure className="flex flex-col gap-2">
            <Spot src="/landing/bloom-site.webp" alt={t("Version 1 of the website")} x={change.x} y={change.y} zoom={change.zoom} />
            <figcaption className="text-xs text-muted-foreground">{t("Version 1, what Anna commented on")}</figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <Spot src="/landing/bloom-site-v2.webp" alt={t("Version 2 of the website")} x={change.x} y={change.y} zoom={change.zoom} />
            <figcaption className="text-xs text-foreground">{t("Version 2, what she got")}</figcaption>
          </figure>
        </div>

        {/* the exchange, as short as it is in the portal */}
        <div key={index} className="flex animate-in flex-col gap-4 duration-300 fade-in-0 slide-in-from-bottom-1">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Anna Kovalenko</p>
            <p className="text-lg leading-snug text-foreground">{t(change.ask)}</p>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-foreground/25 pl-3">
            <p className="text-xs text-muted-foreground">Lumen Studio</p>
            <p className="text-lg leading-snug text-foreground">{t(change.reply)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
