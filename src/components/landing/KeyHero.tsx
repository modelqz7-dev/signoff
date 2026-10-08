"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon, FileCheckIcon, SendIcon } from "lucide-react"
import { ApproveKey } from "@/components/landing/ApproveKey"
import { RotatingWord } from "@/components/landing/RotatingWord"
import { STATUS_MAP } from "@/components/dashboard/types"
import { cn } from "@/lib/utils"
import type { T } from "@/lib/i18n"

const HEADLINE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.04em] text-foreground"

/**
 * First screen: Nodly's key, big and alone in the middle. Pressing it (click, tap or Enter)
 * approves the "order": an "Approved" sticker lands on the key and, one by one, the events a real
 * approval sets off appear underneath (the client's yes, the Telegram notice, the record).
 */
export function KeyHero({ t, signedIn }: { t: T; signedIn: boolean }) {
  const [approved, setApproved] = useState(false)
  const [stampKey, setStampKey] = useState(0)
  const status = STATUS_MAP.await

  function press() {
    setApproved((v) => !v)
    setStampKey((k) => k + 1)
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-16 pb-24 text-center sm:px-6 lg:pt-20">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {t("For SMM specialists and agencies")}
        </p>
        <h1 className={cn(HEADLINE, "mt-5 max-w-5xl text-[40px] leading-[1.02] sm:text-6xl lg:text-[68px]")}>
          <span className="block">{t("Where SMM specialists and clients")}</span>
          <span className="mt-1 flex flex-wrap items-center justify-center gap-x-[0.25em]">
            <span>{t("approve every")}</span>
            <RotatingWord
              hashtag
              words={[
                { text: t("story"), color: "var(--primary)" },
                { text: t("post"), color: "var(--primary)" },
                { text: t("cover"), color: "var(--primary)" },
                { text: t("banner"), color: "var(--primary)" },
                { text: t("ad creative"), color: "var(--primary)" },
              ]}
            />
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          {t("Send one link. The client marks changes right on the post and approves with a tap, and the approval stays on record.")}
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

        {/* under the key: the order's status, then what one press sets off, event by event */}
        <div className="-mt-6 flex h-[148px] w-full max-w-sm flex-col items-center sm:-mt-10 sm:h-[136px]">
          {approved ? (
            <ol key={stampKey} aria-live="polite" className="flex w-full flex-col gap-1.5 text-left text-sm">
              {[
                { icon: CheckIcon, text: t("Approved by Anna K. · just now"), approved: true },
                { icon: SendIcon, text: t("Telegram: the client approved the posts") },
                { icon: FileCheckIcon, text: t("Saved on record: who, when, which version") },
              ].map(({ icon: Icon, text, approved: ok }, i) => (
                <li
                  key={text}
                  className="flex animate-[row-in_.4s_ease-out_both] items-center gap-2.5 rounded-xl bg-card px-3 py-2 ring-1 ring-border motion-reduce:animate-none"
                  style={{ animationDelay: `${150 + i * 450}ms` }}
                >
                  <span
                    className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", ok ? "text-[var(--status-approved)]" : "bg-foreground/[0.06] text-foreground")}
                    style={ok ? { backgroundColor: "color-mix(in oklab, var(--status-approved) 16%, var(--background))" } : undefined}
                  >
                    <Icon className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <span className={ok ? "font-medium text-foreground" : "text-muted-foreground"}>{text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm">
              <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: status.bg, color: status.color }}>
                {t(status.label)}
              </span>
              <span className="text-muted-foreground">{t("Posts for “Bloom” · press the key to approve")}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
