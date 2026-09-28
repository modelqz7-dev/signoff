"use client"

import { useSyncExternalStore } from "react"
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme-script"

export type Theme = "dark" | "light"

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "dark")
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
}

/**
 * Switches the theme. With View Transitions the new theme is revealed as a circle
 * growing from `origin` (e.g. the clicked button); otherwise colors cross-fade.
 * Respects prefers-reduced-motion.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  if (theme === readTheme()) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }

  if (reduce) {
    apply(theme)
    return
  }

  if (!doc.startViewTransition) {
    const root = document.documentElement
    root.classList.add("theme-fade")
    apply(theme)
    window.setTimeout(() => root.classList.remove("theme-fade"), 400)
    return
  }

  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  doc.startViewTransition(() => apply(theme)).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
    )
  }).catch(() => {})
}
