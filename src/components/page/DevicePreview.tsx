"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { MonitorIcon, SmartphoneIcon } from "lucide-react"
import { useT } from "@/lib/i18n"

type Device = "phone" | "computer"

/** The width the page is laid out at in the computer preview, then scaled down to fit. */
const SITE_WIDTH = 1280
const PHONE_WIDTH = 340
const BAR_HEIGHT = 36
/** The phone's dark frame around the screen. */
const BEZEL = 11
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

  // Room for the switch and the copy/open buttons below.
  const height = box.h ? Math.max(360, Math.min(735, box.h - 120)) : 600
  const computerWidth = Math.max(PHONE_WIDTH, Math.min(1040, box.w - 48))
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
      ) : (
        // an iPhone: a dark body, the side buttons, the Dynamic Island and the status bar over the page
        <div style={{ width: PHONE_WIDTH + 2 * BEZEL, height }}
          className="relative rounded-[56px] bg-[#1d1d1f] p-[11px] shadow-[0_40px_90px_-25px_rgba(0,0,0,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.12)]">
          <span aria-hidden className="absolute top-[110px] -left-[3px] h-8 w-[3px] rounded-l bg-[#2c2c2e]" />
          <span aria-hidden className="absolute top-[160px] -left-[3px] h-14 w-[3px] rounded-l bg-[#2c2c2e]" />
          <span aria-hidden className="absolute top-[150px] -right-[3px] h-20 w-[3px] rounded-r bg-[#2c2c2e]" />
          <div className="relative h-full overflow-hidden rounded-[46px] bg-white [transform:translateZ(0)]">
            <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[46px] items-center justify-between px-7 text-[13px] font-semibold text-black">
              <span className="w-12 tabular-nums">9:41</span>
              <span className="h-[26px] w-[96px] rounded-full bg-black" />
              <span className="flex w-12 items-center justify-end gap-1">
                <svg viewBox="0 0 18 12" className="h-[10px]"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></g></svg>
                <svg viewBox="0 0 26 12" className="h-[11px]"><rect x="0.5" y="0.5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" strokeOpacity=".4" /><rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor" /><rect x="24" y="4" width="1.5" height="4" rx=".75" fill="currentColor" fillOpacity=".4" /></svg>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
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
        {side}
      </div>
    </div>
  )
}
