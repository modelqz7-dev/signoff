import type { MouseEvent } from "react"

export type AppMode = "orders" | "page"

/** Put on the main column of the screen each mode opens, so the switch knows when it has arrived. */
export const modeMain = (mode: AppMode) => ({ "data-mode-main": mode, style: { viewTransitionName: "mode-main" } })

/**
 * Resolves once the given mode's main column is on screen (or after a moment, so the page never
 * stays frozen). Polls with timers: the browser pauses animation frames while it waits for this.
 */
function shown(mode: AppMode) {
  return new Promise<void>((resolve) => {
    const start = performance.now()
    const check = () => {
      const el = document.querySelector(`[data-mode-main="${mode}"]`)
      if ((el && el.getClientRects().length > 0) || performance.now() - start > 1200) resolve()
      else setTimeout(check, 16)
    }
    check()
  })
}

/**
 * Switching between Orders and My page: the menu and the page slide sideways, forward into
 * My page and back out of it. Browsers without typed view transitions just navigate.
 */
export function switchMode(e: MouseEvent, push: (href: string) => void, href: string, to: AppMode) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  const canSlide = typeof window.ViewTransition !== "undefined" && "types" in window.ViewTransition.prototype
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!canSlide) { push(href); return }
  const start = document.startViewTransition as unknown as (o: { update: () => Promise<void>; types: string[] }) => unknown
  start.call(document, {
    update: () => { push(href); return shown(to) },
    types: [to === "page" ? "mode-forward" : "mode-back"],
  })
}
