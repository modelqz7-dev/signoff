"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { LayoutDashboardIcon, ListIcon, FileTextIcon, SmartphoneIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT, type T } from "@/lib/i18n"

// The workshop's side of Nodly, one screen at a time (like Notion's product tabs): real
// screenshots of a demo workshop in both themes and both languages, from public/landing/app. The tabs advance by
// themselves while on screen; hovering or picking one holds it.

const TABS = [
  { id: "dashboard", label: "Dashboard", url: "nodly.app/dashboard", alt: "The workshop dashboard with orders, activity and client comments", icon: LayoutDashboardIcon },
  { id: "orders", label: "Orders", url: "nodly.app/orders", alt: "The list of orders with their status, comments and deadlines", icon: ListIcon },
  { id: "order", label: "Order page", url: "nodly.app/orders/ord-24", alt: "An order with its details, the kitchen design and the client portal link", icon: FileTextIcon },
  { id: "phone", label: "Client's phone", url: "nodly.app/portal/kitchen-modern", alt: "The client portal on a phone", icon: SmartphoneIcon },
] as const

const HOLD_MS = 6000

export function AppTabs({ t }: { t: T }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [held, setHeld] = useState(false)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setAuto(false), 0)
      return () => window.clearTimeout(timer)
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 })
    if (rootRef.current) io.observe(rootRef.current)
    return () => io.disconnect()
  }, [])

  const tab = TABS[index]
  const playing = auto && visible && !held

  return (
    <div ref={rootRef} className="flex flex-col gap-5" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}>
      <div role="tablist" aria-label={t("Your side")} className="flex flex-wrap gap-2">
        {TABS.map((item, i) => {
          const active = i === index
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`app-tab-${item.id}`}
              aria-selected={active}
              aria-controls="app-tab-panel"
              onClick={() => { setIndex(i); setAuto(false) }}
              className={cn(
                "relative flex h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-full px-4 text-sm font-medium transition-colors",
                active ? "bg-card text-foreground ring-1 ring-foreground/15" : "text-muted-foreground hover:bg-hover hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {t(item.label)}
              {/* how long until the next tab */}
              {active && auto && (
                <span
                  key={index}
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-0.5 animate-[tab-progress_linear_both] bg-foreground/50"
                  style={{ animationDuration: `${HOLD_MS}ms`, animationPlayState: playing ? "running" : "paused" }}
                  onAnimationEnd={() => setIndex((n) => (n + 1) % TABS.length)}
                />
              )}
            </button>
          )
        })}
      </div>

      <div id="app-tab-panel" role="tabpanel" aria-labelledby={`app-tab-${tab.id}`} className="overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-center border-b border-border px-4 py-2">
          <span className="mx-auto rounded-md bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">{tab.url}</span>
        </div>
        {/* all screens stay mounted and cross-fade, so switching never waits on an image */}
        <div className="relative aspect-[8/5] bg-background">
          {TABS.map((item, i) => (
            <div
              key={item.id}
              aria-hidden={i !== index}
              className={cn("absolute inset-0 transition-opacity duration-500", i === index ? "opacity-100" : "opacity-0")}
            >
              {item.id === "phone" ? (
                <div className="flex size-full items-center justify-center bg-muted/40 py-[3%]">
                  <div className="h-full overflow-hidden rounded-[2rem] bg-card p-2 shadow-2xl ring-1 ring-foreground/10">
                    <Shot id={item.id} alt={t(item.alt)} width={780} height={1688} className="h-full w-auto rounded-[1.6rem]" sizes="320px" />
                  </div>
                </div>
              ) : (
                <Shot id={item.id} alt={t(item.alt)} width={2000} height={1250} className="size-full object-cover object-top" sizes="(min-width: 1152px) 1104px, 100vw" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** One screenshot in the page's theme and language. */
function Shot({ id, alt, width, height, className, sizes }: { id: string; alt: string; width: number; height: number; className: string; sizes: string }) {
  const { lang } = useT()
  const suffix = lang === "ru" ? "-ru" : ""
  return (
    <>
      <Image src={`/landing/app/${id}-light${suffix}.webp`} alt={alt} width={width} height={height} sizes={sizes} className={cn(className, "dark:hidden")} />
      <Image src={`/landing/app/${id}-dark${suffix}.webp`} alt={alt} width={width} height={height} sizes={sizes} className={cn(className, "hidden dark:block")} />
    </>
  )
}
