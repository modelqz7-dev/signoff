"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

/** A hand gripping the frame's top edge, drawn over it. */
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

/** The promos, each with the pair of characters peeking over the frame while it plays. */
const CLIPS = [
  { file: "nodly-approved", tab: "Revisions", label: "From 12 comments to approved: a short video about Nodly", people: ["client-flipped", "freelancer-flipped"] },
  { file: "nodly-smm", tab: "For SMM", label: "From 48 chat messages to an approved post: a short video about Nodly for SMM", people: ["smm-glasses", "brand-owner"] },
  { file: "nodly-page", tab: "My page", label: "Your page with projects, services and reviews: a short video about Nodly", people: ["owner-glasses", "visitor"] },
] as const

/**
 * "How it works": short silent promos in a frame, played one after another while in view, with
 * tabs underneath to jump between them. With reduced motion nothing autoplays: the poster shows
 * with the player controls, and the tabs still switch clips.
 */
export function PromoVideo({ t }: { t: T }) {
  const ref = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const bar = useRef<HTMLSpanElement>(null)
  const [inView, setInView] = useState(false)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const box = frame.current
    if (!box) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setStill(true), 0)
      return () => window.clearTimeout(timer)
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 })
    // watch the frame, not the <video>: that one is replaced on every clip change
    io.observe(box)
    return () => io.disconnect()
  }, [])

  // The <video> is keyed by clip, so this runs on a fresh element each time the clip changes.
  useEffect(() => {
    const video = ref.current
    if (!video || still) return
    if (inView) video.play().catch(() => {})
    else video.pause()
  }, [inView, active, still])

  // The active tab's line follows the clip every frame (timeupdate only fires ~4 times a second).
  useEffect(() => {
    if (still) return
    let raf = 0
    const tick = () => {
      const video = ref.current
      if (video && bar.current && video.duration) bar.current.style.width = `${(video.currentTime / video.duration) * 100}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, still])

  const pick = (i: number) => setActive(i)
  const clip = CLIPS[active]

  return (
    <section id="product" className="scroll-mt-16 px-4 pt-4 pb-16 sm:px-6 lg:pt-28">
      <div className="relative mx-auto max-w-5xl">
        {/* each clip's pair peeks over the frame; the others wait out of sight below the edge */}
        {CLIPS.map((c, i) => c.people.map((who, side) => (
          // eslint-disable-next-line @next/next/no-img-element -- decorative character art
          <img
            key={who}
            src={`/landing/characters/${who}.svg`}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={cn(
              "pointer-events-none absolute -top-[86px] z-0 hidden w-[130px] select-none transition-[opacity,translate] duration-500 ease-out lg:block",
              side === 0 ? "left-[10%]" : "right-[10%]",
              i === active ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            )}
          />
        )))}
        <Grip className="left-[calc(10%+18px)]" />
        <Grip className="left-[calc(10%+84px)]" />
        <Grip className="right-[calc(10%+84px)]" />
        <Grip className="right-[calc(10%+18px)]" />

        <div ref={frame} className="relative z-10 overflow-hidden rounded-2xl bg-card shadow-[0_24px_80px_-32px_rgba(0,0,0,0.35)] ring-1 ring-foreground/10">
          <video
            key={clip.file}
            ref={ref}
            poster={`/landing/${clip.file}-poster.webp`}
            muted
            playsInline
            preload="metadata"
            controls={still}
            aria-label={t(clip.label)}
            onEnded={() => pick((active + 1) % CLIPS.length)}
            className="block aspect-video w-full bg-muted"
          >
            {/* VP9 first (smaller, plays in every browser), H.264 for older Safari */}
            <source src={`/landing/${clip.file}.webm`} type="video/webm" />
            <source src={`/landing/${clip.file}.mp4`} type="video/mp4" />
          </video>
        </div>

        <div role="tablist" aria-label={t("How it works")} className="mx-auto mt-5 flex max-w-md gap-2">
          {CLIPS.map((c, i) => (
            <button
              key={c.file}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => pick(i)}
              className={cn(
                "flex-1 rounded-lg px-2 pt-2 pb-2.5 text-center text-sm transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
                i === active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(c.tab)}
              <span className="mt-2 block h-0.5 overflow-hidden rounded-full bg-foreground/10">
                <span
                  key={i === active ? clip.file : undefined}
                  ref={i === active ? bar : undefined}
                  className="block h-full rounded-full bg-foreground"
                  style={{ width: i === active && still ? "100%" : "0%" }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
