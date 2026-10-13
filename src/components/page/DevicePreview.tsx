"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { MonitorIcon, SmartphoneIcon } from "lucide-react"
import { useT } from "@/lib/i18n"

type Device = "phone" | "computer"

/** The width the page is laid out at in the computer preview, then scaled down to fit. */
const SITE_WIDTH = 1280
const PHONE_WIDTH = 340
const BAR_HEIGHT = 36
const noop = () => () => {}

/**
 * The editor's live preview: the page in a phone, or in a browser window on a computer.
 * The page lays itself out by its own width, so the computer view is the real thing, scaled.
 */
export function DevicePreview({ children, path, side }: { children: React.ReactNode; path: string; side?: React.ReactNode }) {
  const { t } = useT()
  const [device, setDevice] = useState<Device>("phone")
  const host = useSyncExternalStore(noop, () => window.location.host, () => "")
  const boxRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Room for the switch below; the copy/open buttons sit beside the frame.
  const height = box.h ? Math.max(360, Math.min(735, box.h - 120)) : 600
  const computerWidth = Math.max(PHONE_WIDTH, Math.min(1040, box.w - (side ? 120 : 48)))
  const scale = computerWidth / SITE_WIDTH
  const computer = device === "computer"

  const options: { id: Device; label: string; icon: React.ReactNode }[] = [
    { id: "phone", label: t("Phone"), icon: <SmartphoneIcon className="size-4" /> },
    { id: "computer", label: t("Computer"), icon: <MonitorIcon className="size-4" /> },
  ]

  return (
    <div ref={boxRef} className="flex size-full flex-col items-center justify-center gap-6">
      {computer ? (
        // a macOS window: traffic lights and the address, the page scaled inside
        <div className="flex items-center gap-4">
          <div style={{ width: computerWidth, height }}
            className="overflow-hidden rounded-xl bg-background shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/10 [transform:translateZ(0)] dark:ring-white/10">
            <div className="flex h-full flex-col">
              <div style={{ height: BAR_HEIGHT }} className="flex shrink-0 items-center gap-3 border-b border-black/[0.06] bg-[#f2f2f4] px-3.5 dark:border-white/[0.06] dark:bg-[#2a2a2c]">
                <span className="flex gap-2">
                  {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} className="size-3 rounded-full" style={{ background: c }} />)}
                </span>
                <span className="mx-auto flex h-6 max-w-[360px] min-w-0 flex-1 items-center justify-center truncate rounded-md bg-black/[0.05] px-3 text-xs text-muted-foreground dark:bg-white/[0.08]">
                  {host}{path}
                </span>
                <span className="w-[52px]" />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {/* Scaled (so the page's own pop-ups stay inside this window), and scrolls inside */}
                <div style={{ width: SITE_WIDTH, height: (height - BAR_HEIGHT) / scale, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
                  <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
                </div>
              </div>
            </div>
          </div>
        {side}
        </div>
      ) : (
        // a plain rounded card, like Linktree's preview: the page scrolls, the scrollbar doesn't show
        <div className="flex items-center gap-4">
          <div style={{ width: PHONE_WIDTH, height }}
            className="overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.06] [transform:translateZ(0)]">
            <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
          </div>
          {side}
        </div>
      )}

      <div className="flex items-center">
        <div role="tablist" aria-label={t("Preview")} className="flex rounded-full bg-muted p-1">
          {options.map((o) => (
            <button key={o.id} type="button" role="tab" aria-selected={device === o.id} onClick={() => setDevice(o.id)}
              className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
                device === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {o.icon}{o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
