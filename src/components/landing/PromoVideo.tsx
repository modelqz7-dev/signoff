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

/**
 * "How it works": the 13-second promo in a frame, with the client and the SMM specialist peeking
 * over its top edge. Silent and looping, it plays while in view; with reduced motion it stays on
 * its poster and shows the player controls instead.
 */
export function PromoVideo({ t }: { t: T }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setStill(true), 0)
      return () => window.clearTimeout(timer)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) video.play().catch(() => {})
      else video.pause()
    }, { threshold: 0.3 })
    io.observe(video)
    return () => io.disconnect()
  }, [])

  return (
    <section id="product" className="scroll-mt-16 px-4 pt-4 pb-16 sm:px-6 lg:pt-28">
      <div className="relative mx-auto max-w-5xl">
        {/* the client and the SMM specialist peek over the frame */}
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative character art */}
        <img src="/landing/characters/client-flipped.svg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute -top-[86px] left-[10%] z-0 hidden w-[130px] select-none lg:block" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/characters/freelancer-flipped.svg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute -top-[86px] right-[10%] z-0 hidden w-[130px] select-none lg:block" />
        <Grip className="left-[calc(10%+18px)]" />
        <Grip className="left-[calc(10%+84px)]" />
        <Grip className="right-[calc(10%+84px)]" />
        <Grip className="right-[calc(10%+18px)]" />

        <div className="relative z-10 overflow-hidden rounded-2xl bg-card shadow-[0_24px_80px_-32px_rgba(0,0,0,0.35)] ring-1 ring-foreground/10">
          <video
            ref={ref}
            poster="/landing/nodly-approved-poster.webp"
            muted
            loop
            playsInline
            preload="metadata"
            controls={still}
            aria-label={t("From 12 comments to approved: a short video about Nodly")}
            className="block aspect-video w-full bg-muted"
          >
            {/* VP9 first (smaller, plays in every browser), H.264 for older Safari */}
            <source src="/landing/nodly-approved.webm" type="video/webm" />
            <source src="/landing/nodly-approved.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  )
}
