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
    <div ref={boxRef} className="flex size-full flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-4">
        <div
          style={{ width: computer ? computerWidth : PHONE_WIDTH, height }}
          className={`overflow-hidden bg-background shadow-[0_8px_40px_rgba(0,0,0,0.12)] [transform:translateZ(0)] ring-1 ring-foreground/10 transition-[width,border-radius] duration-300 ease-out motion-reduce:transition-none ${computer ? "rounded-2xl" : "rounded-[40px]"}`}
        >
          {computer ? (
            <div className="flex h-full flex-col">
              <div style={{ height: BAR_HEIGHT }} className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-3">
                <span className="flex gap-1.5">
                  {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-foreground/15" />)}
                </span>
                <span className="mx-auto flex h-6 max-w-[360px] min-w-0 flex-1 items-center justify-center truncate rounded-md bg-background px-3 text-xs text-muted-foreground">
                  {host}{path}
                </span>
                <span className="w-[42px]" />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {/* Scaled (so the page's own pop-ups stay inside this window), and scrolls inside */}
                <div style={{ width: SITE_WIDTH, height: (height - BAR_HEIGHT) / scale, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
                  <div className="h-full overflow-y-auto">{children}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">{children}</div>
          )}
        </div>
        {side}
      </div>

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
  )
}
