"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { PinMarker } from "@/components/orders/pins"
import { ApproveKey } from "@/components/landing/ApproveKey"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// Font classes live in app/landing-fonts.css (loaded by the landing page only).
const SERIF = "font-display"
const HAND = "font-hand"

/** Client notes pinned on the drawing: pin position (%), note position, and a slight tilt. */
const NOTES = [
  { pin: { x: 30, y: 36 }, note: "left-[4%] top-[4%]", rotate: -4, text: "Matte black handles, please" },
  { pin: { x: 72, y: 60 }, note: "right-[3%] top-[70%]", rotate: 3, text: "Darker countertop" },
  { pin: { x: 86, y: 22 }, note: "right-[2%] -top-[3%]", rotate: -2, text: "+20 cm on this cabinet?" },
]

/**
 * First screen: a workshop desk. A pencil drawing of a kitchen with the client's hand-written
 * notes pinned on it, and Nodly's key as the "Approve" button — press it and the approval
 * stamp lands on the sheet.
 */
export function DeskHero({ t, signedIn }: { t: T; signedIn: boolean }) {
  const [approved, setApproved] = useState(false)
  const [stampKey, setStampKey] = useState(0)

  function press() {
    setApproved((v) => !v)
    setStampKey((k) => k + 1)
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12 lg:pt-20">
        {/* copy */}
        <div className="flex flex-col items-start gap-6">
          <p className={cn(HAND, "-rotate-2 text-xl text-muted-foreground")}>{t("for furniture makers & kitchen studios")}</p>
          <h1 className={cn(SERIF, "text-[46px] leading-[0.95] font-medium tracking-[-0.01em] text-foreground sm:text-6xl xl:text-[70px]")}>
            {t("Stop rebuilding kitchens over")}{" "}
            <em className="italic">{t("“I never approved this.”")}</em>
          </h1>
          <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
            {t("Send your client one link. They mark changes right on the drawing and approve with one tap, and you keep the signed-off version on record.")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            >
              {signedIn ? t("Open dashboard") : t("Start free")}
              <ArrowRightIcon className="size-4" />
            </Link>
            <a href="#how" className="inline-flex h-11 items-center px-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {t("See how it works")}
            </a>
          </div>
          <p className="text-xs text-muted-foreground">{t("Free during early access · No card required")}</p>
        </div>

        {/* the desk */}
        <div className="relative mx-auto w-full max-w-[620px] pb-20 lg:pb-16">
          <DrawingSheet t={t} approved={approved} stampKey={stampKey} />

          <div className="absolute -right-2 -bottom-6 w-[150px] sm:-right-8 sm:-bottom-10 sm:w-[190px]">
            <ApproveKey onPress={press} label={approved ? t("Undo approval") : t("Approve the design")} />
            <p className={cn(HAND, "pointer-events-none absolute top-[68%] right-[88%] -rotate-3 text-lg whitespace-nowrap text-muted-foreground sm:text-xl")}>
              {approved ? t("approved! press again to undo") : t("press to approve")}
              <span className="ml-1 inline-block -rotate-12">→</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function DrawingSheet({ t, approved, stampKey }: { t: T; approved: boolean; stampKey: number }) {
  return (
    <div
      className="relative -rotate-[1.5deg] rounded-[3px] bg-[#f5f1e8] p-4 text-[#3b3834] shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/5 sm:p-6"
      style={{
        // paper: faint fibres and a slightly warmer centre
        backgroundImage:
          "radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.55), transparent 60%), repeating-linear-gradient(0deg, rgba(0,0,0,0.012) 0 1px, transparent 1px 3px)",
      }}
    >
      {/* drawing frame + title block, like a real shop drawing */}
      <div className="relative border border-[#3b3834]/50 p-3 sm:p-4">
        <div className="relative">
          <KitchenDrawing />
          {NOTES.map((n, i) => (
            <div key={i}>
              <div className="absolute" style={{ left: `${n.pin.x}%`, top: `${n.pin.y}%` }}>
                <PinMarker pin={{ x: 0, y: 0, resolved: approved }} number={i + 1} />
              </div>
              <p
                className={cn(HAND, "absolute max-w-[46%] text-[15px] leading-tight text-[#b3342a] transition-opacity duration-500 sm:text-lg", n.note, approved && "opacity-50 line-through decoration-[#b3342a]/60")}
                style={{ transform: `rotate(${n.rotate}deg)` }}
              >
                {t(n.text)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#3b3834]/40 pt-2 font-mono text-[9px] tracking-[0.12em] text-[#3b3834]/70 uppercase sm:text-[10px]">
          <span>{t("Kitchen · elevation A")}</span>
          <span>1:20</span>
          <span>{approved ? t("Rev. 2 · approved") : t("Rev. 2 · for approval")}</span>
        </div>
      </div>

      {approved && (
        <div key={stampKey} className="pointer-events-none absolute top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-[stamp_.45s_cubic-bezier(.2,.9,.3,1)_both] rounded-lg border-[5px] border-double border-[#1f7a47] px-5 py-2 text-center text-[#1f7a47] mix-blend-multiply sm:px-7">
            <p className="font-[family-name:var(--font-brand)] text-2xl font-bold tracking-[0.18em] sm:text-4xl">{t("APPROVED")}</p>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-80">{t("by the client · via Nodly")}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/** A pencil elevation of a kitchen: upper and lower cabinets, countertop, dimensions. */
function KitchenDrawing() {
  return (
    <svg viewBox="0 0 700 440" className="block w-full" aria-hidden="true">
      <defs>
        {/* slight hand-drawn wobble */}
        <filter id="pencil" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
        <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 2 L10 5 L0 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </marker>
      </defs>
      <g filter="url(#pencil)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* uppers */}
        <g strokeWidth="2.2">
          <rect x="70" y="60" width="140" height="130" rx="4" /><rect x="210" y="60" width="140" height="130" rx="4" />
          <rect x="350" y="60" width="140" height="130" rx="4" /><rect x="490" y="60" width="140" height="130" rx="4" />
        </g>
        {/* backsplash tiles, faint */}
        <g strokeWidth="0.8" opacity="0.35">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <line key={i} x1={70 + i * 46.7} y1="200" x2={70 + i * 46.7} y2="262" />)}
          <line x1="70" y1="231" x2="630" y2="231" />
        </g>
        {/* countertop + lowers */}
        <rect x="58" y="264" width="584" height="18" rx="3" strokeWidth="2.4" />
        <g strokeWidth="2.2">
          <rect x="70" y="282" width="140" height="120" rx="4" /><rect x="210" y="282" width="140" height="120" rx="4" />
          <rect x="350" y="282" width="140" height="120" rx="4" /><rect x="490" y="282" width="140" height="120" rx="4" />
        </g>
        {/* hob, sink */}
        <g strokeWidth="1.6"><ellipse cx="280" cy="273" rx="34" ry="5" /><rect x="400" y="268" width="80" height="10" rx="3" /></g>
        {/* handles */}
        <g strokeWidth="3">
          <line x1="190" y1="160" x2="190" y2="182" /><line x1="230" y1="160" x2="230" y2="182" />
          <line x1="470" y1="160" x2="470" y2="182" /><line x1="510" y1="160" x2="510" y2="182" />
          <line x1="118" y1="298" x2="162" y2="298" /><line x1="258" y1="298" x2="302" y2="298" />
          <line x1="398" y1="298" x2="442" y2="298" /><line x1="538" y1="298" x2="582" y2="298" />
        </g>
        {/* floor */}
        <line x1="40" y1="404" x2="660" y2="404" strokeWidth="1.4" opacity="0.6" />
        {/* dimensions */}
        <g strokeWidth="1" opacity="0.75">
          <line x1="70" y1="34" x2="630" y2="34" markerStart="url(#arr)" markerEnd="url(#arr)" />
          <line x1="70" y1="26" x2="70" y2="56" /><line x1="630" y1="26" x2="630" y2="56" />
          <line x1="668" y1="60" x2="668" y2="190" markerStart="url(#arr)" markerEnd="url(#arr)" />
          <line x1="636" y1="60" x2="676" y2="60" /><line x1="636" y1="190" x2="676" y2="190" />
        </g>
      </g>
      <g fill="currentColor" className="font-['Caveat',cursive]" fontSize="20" opacity="0.8">
        <text x="350" y="27" textAnchor="middle">2400</text>
        <text x="684" y="130" textAnchor="middle" transform="rotate(90 684 130)">720</text>
      </g>
    </svg>
  )
}
