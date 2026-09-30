"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type Word = { text: string; color: string }

/**
 * A word in a coloured pill that cycles through a list: the pill resizes to the next word,
 * the dot and tint change colour, and the word itself slides up and out. Holds still with
 * reduced motion. With `hashtag`, a coloured # leads the word
 * instead of the dot and swaps together with it.
 */
export function RotatingWord({ words, interval = 2200, hashtag = false, className }: { words: Word[]; interval?: number; hashtag?: boolean; className?: string }) {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState<number | null>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const word = words[index % words.length]

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval)
    return () => window.clearInterval(timer)
  }, [words.length, interval])

  // The pill animates to the width of the next word, measured off-screen.
  useLayoutEffect(() => {
    const measure = () => measureRef.current && setWidth(measureRef.current.getBoundingClientRect().width)
    measure()
    document.fonts?.ready.then(measure)
  }, [word.text])

  return (
    <span
      className={cn("relative inline-flex items-center gap-[0.18em] rounded-full px-[0.32em] align-baseline transition-[background-color,width] duration-[450ms] ease-[cubic-bezier(.16,1,.3,1)]", className)}
      style={{ backgroundColor: `color-mix(in oklab, ${word.color} 16%, transparent)`, width: width ? width : undefined }}
    >
      {!hashtag && <span aria-hidden="true" className="size-[0.22em] shrink-0 rounded-full transition-colors duration-500" style={{ backgroundColor: word.color }} />}
      <span className="relative inline-block overflow-hidden pb-[0.06em] leading-[1.05]">
        <span key={word.text} className="inline-block animate-[word-in_.5s_cubic-bezier(.16,1,.3,1)_both] font-normal tracking-[-0.03em] whitespace-nowrap">
          {/* the # swaps together with the word, in the new colour right away */}
          {hashtag && <span aria-hidden="true" className="mr-[0.04em]" style={{ color: word.color }}>#</span>}
          {word.text}
        </span>
      </span>
      {/* invisible copy used to measure the pill for the current word */}
      <span ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 inline-flex items-center gap-[0.18em] px-[0.32em] whitespace-nowrap">
        {!hashtag && <span className="size-[0.22em]" />}
        <span className="font-normal tracking-[-0.03em]">{hashtag && <span className="mr-[0.04em]">#</span>}{word.text}</span>
      </span>
    </span>
  )
}
