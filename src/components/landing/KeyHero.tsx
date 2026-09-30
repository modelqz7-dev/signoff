"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { ApproveKey } from "@/components/landing/ApproveKey"
import { RotatingWord } from "@/components/landing/RotatingWord"
import { STATUS_MAP } from "@/components/dashboard/types"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

const HEADLINE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.04em] text-foreground"

/**
 * First screen: Nodly's key, big and alone in the middle. Pressing it (click, tap or Enter)
 * approves the "order": the status flips and an APPROVED stamp lands across the key.
 */
export function KeyHero({ t, signedIn }: { t: T; signedIn: boolean }) {
  const [approved, setApproved] = useState(false)
  const [stampKey, setStampKey] = useState(0)
  const status = approved ? STATUS_MAP.approved : STATUS_MAP.await

  function press() {
    setApproved((v) => !v)
    setStampKey((k) => k + 1)
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-16 pb-24 text-center sm:px-6 lg:pt-20">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {t("For furniture makers and kitchen studios")}
        </p>
        <h1 className={cn(HEADLINE, "mt-5 max-w-5xl text-[40px] leading-[1.02] sm:text-6xl lg:text-[68px]")}>
          <span className="block">{t("Where workshops and clients")}</span>
          <span className="mt-1 flex flex-wrap items-center justify-center gap-x-[0.25em]">
            <span>{t("approve every")}</span>
            <RotatingWord
              hashtag
              words={[
                { text: t("kitchen"), color: "#e0913a" },
                { text: t("wardrobe"), color: "#8b5cf6" },
                { text: t("bathroom"), color: "#3b82f6" },
                { text: t("hallway"), color: "#3f9d5c" },
                { text: t("home office"), color: "#d4a72c" },
              ]}
            />
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          {t("Send one link. The client marks changes right on the drawing and approves with a tap, and the approval stays on record.")}
        </p>

        {/* the key */}
        <div className="relative mt-8 w-[260px] sm:w-[340px]">
          <ApproveKey onPress={press} label={approved ? t("Undo approval") : t("Approve the design")} />
          {approved && (
            <div key={stampKey} className="pointer-events-none absolute inset-0">
              {/* a green "Approved" sticker slapped on the key's corner, same pill as the headline */}
              <div
                className="absolute top-[13%] -right-[2%] animate-[sticker_.5s_cubic-bezier(.2,.9,.3,1.2)_both] rounded-full px-[0.5em] pb-[0.06em] text-3xl leading-[1.2] text-[var(--status-approved)] shadow-[0_8px_24px_-8px_rgba(0,0,0,.35)] ring-1 ring-[var(--status-approved)]/20 sm:text-4xl"
                style={{ backgroundColor: "color-mix(in oklab, var(--status-approved) 16%, var(--background))" }}
              >
                <p className={cn(HEADLINE, "text-inherit")}>{t("Approved")}</p>
              </div>
            </div>
          )}
        </div>

        {/* order status under the key */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: status.bg, color: status.color }}>
            {t(status.label)}
          </span>
          <span className="text-muted-foreground">
            {approved ? t("Approved by Anna K. · just now") : t("Kitchen “Modern” · press the key to approve")}
          </span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/signup"}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {signedIn ? t("Open dashboard") : t("Start free")}
            <ArrowRightIcon className="size-4" />
          </Link>
          <a href="#product" className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-hover">
            {t("See it in action")}
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("Free during early access · No card required")}</p>
      </div>
    </section>
  )
}
