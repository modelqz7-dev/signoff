"use client"

import { useEffect } from "react"

/**
 * Keeps --vvh and --vvt (the visible part of the screen and where it starts) on <html>. On
 * phones the on-screen keyboard covers the bottom of the page without resizing it, so dialogs
 * sized to the screen would hide their text fields behind it; sized to these, they fit above.
 */
export function VisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty("--vvh", `${vv.height}px`)
      root.style.setProperty("--vvt", `${vv.offsetTop}px`)
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])
  return null
}
