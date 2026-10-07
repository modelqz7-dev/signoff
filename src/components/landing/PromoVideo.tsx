"use client"

import { useEffect, useRef, useState } from "react"
import type { T } from "@/lib/i18n"

/**
 * The 13-second promo, right under the first screen: silent, looping, plays when it scrolls into
 * view. With reduced motion it stays on its poster and shows the player controls instead.
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
    <section className="px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-card shadow-[0_24px_80px_-32px_rgba(0,0,0,0.35)] ring-1 ring-foreground/10">
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
    </section>
  )
}
