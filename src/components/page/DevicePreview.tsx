"use client"

import { useEffect, useRef, useState } from "react"
import { MonitorIcon, SmartphoneIcon } from "lucide-react"
import { useT } from "@/lib/i18n"

export type Device = "phone" | "computer"

/** The width the page is laid out at in the computer preview, then scaled down to fit (a laptop's). */
const SITE_WIDTH = 1180
const PHONE_WIDTH = 340

/**
 * The editor's live preview: the page in a phone-sized card, or a computer-sized one.
 * The page lays itself out by its own width, so the computer view is the real thing, scaled.
 */
export function DevicePreview({ children, side, dark, onDeviceChange }: {
  children: React.ReactNode
  side?: React.ReactNode
  /** The page's own theme: the card is filled with it, so no light rim shows at the rounded corners. */
  dark?: boolean
  /** Told when the view switches, so the editor can give a computer more room. */
  onDeviceChange?: (device: Device) => void
}) {
  const { t } = useT()
  const [device, setDeviceState] = useState<Device>("phone")
  const setDevice = (d: Device) => { setDeviceState(d); onDeviceChange?.(d) }
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
  // a computer's screen is wide: 16:10, not a tall phone shape
  const computerHeight = Math.max(240, Math.min(height, Math.round(computerWidth * 0.625)))
  // the card takes the page's colour; a hairline inside it instead of a light ring outside
  const card = `${dark ? "bg-[#191919]" : "bg-white"} shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] [transform:translateZ(0)]`

  const options: { id: Device; label: string; icon: React.ReactNode }[] = [
    { id: "phone", label: t("Phone"), icon: <SmartphoneIcon className="size-4" /> },
    { id: "computer", label: t("Computer"), icon: <MonitorIcon className="size-4" /> },
  ]

  return (
    <div ref={boxRef} className="flex size-full flex-col items-center justify-center gap-6">
      {computer ? (
        // a plain rounded card too: the page at a computer's width, scaled to fit, no window chrome
        <div className="flex items-center gap-4">
          <div style={{ width: computerWidth, height: computerHeight }} className={`overflow-hidden rounded-[18px] ${card}`}>
            {/* Scaled (so the page's own pop-ups stay inside this card), and scrolls inside */}
            <div style={{ width: SITE_WIDTH, height: computerHeight / scale, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
              <div className="no-scrollbar h-full overflow-y-auto">{children}</div>
            </div>
          </div>
          {side}
        </div>
      ) : (
        // a plain rounded card, like Linktree's preview: the page scrolls, the scrollbar doesn't show
        <div className="flex items-center gap-4">
          <div style={{ width: PHONE_WIDTH, height }} className={`overflow-hidden rounded-[32px] ${card}`}>
            <div className="h-full overflow-y-auto no-scrollbar">{children}</div>
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
