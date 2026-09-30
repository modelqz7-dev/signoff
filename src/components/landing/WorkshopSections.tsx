"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon, PlusIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import { PLANS } from "@/lib/plans"
import { BillingCycleToggle, PlanPrice } from "@/components/plans/PlanBits"
import { cn } from "@/lib/utils"
import { useNow } from "@/lib/use-now"
import type { T } from "@/lib/i18n"

// Pricing, questions, closing and footer, in the dashboard's own language: the brand wordmark
// font for headlines, hairline rules, monochrome.

const HEADLINE = "font-[family-name:var(--font-brand)] font-bold tracking-[-0.035em] text-foreground"

function SectionHeading({ no, label, title, note }: { no: string; label: string; title: React.ReactNode; note?: string }) {
  return (
    <div className="mb-12 flex flex-col gap-6">
      <div className="flex items-center gap-4 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        <span className="tabular-nums">{no}</span>
        <span className="h-px flex-1 bg-border" />
        <span>{label}</span>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <h2 className={cn(HEADLINE, "max-w-3xl text-4xl leading-[1.02] sm:text-5xl")}>{title}</h2>
        {note && <p className="max-w-xs text-sm text-muted-foreground lg:pb-2 lg:text-right">{note}</p>}
      </div>
    </div>
  )
}

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}

// ── 04 · Pricing ────────────────────────────────────────

export function Pricing({ t }: { t: T }) {
  const [yearly, setYearly] = useState(false)
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading no="04" label={t("Pricing")} title={t("Priced like a tool, not a project.")} note={t("14 days of Pro free, no card")} />
        <div className="mb-8">
          <BillingCycleToggle yearly={yearly} onChange={setYearly} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const featured = plan.id === "go"
            return (
              <Card key={plan.id} className={cn("gap-5 px-6", featured && "ring-2 ring-foreground/70")}>
                <div className="flex items-center justify-between">
                  <p className={cn(HEADLINE, "text-lg")}>{plan.name}</p>
                  {featured && <Chip>{t("Recommended")}</Chip>}
                </div>
                <PlanPrice plan={plan} yearly={yearly} className={cn(HEADLINE, "text-5xl")} />
                <ul className="flex flex-1 flex-col gap-2.5 border-t border-border pt-5">
                  {plan.highlights.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-muted-foreground">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
                      {t(f)}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                    featured ? "bg-primary text-primary-foreground hover:bg-primary/85" : "border border-border hover:bg-hover"
                  )}
                >
                  {t("Start free")}
                </Link>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── 05 · Questions ──────────────────────────────────────

export function Questions({ t }: { t: T }) {
  const items = [
    [t("Do my clients need an account?"), t("No. They open the link, enter their name and, if you set one, the password.")],
    [t("Which files can I upload?"), t("PDF files with any number of pages, and PNG or JPG images.")],
    [t("Can a client see my other orders?"), t("No. Each link opens exactly one order.")],
    [t("How much does it cost?"), t("There is a free plan with up to 3 active orders, and Go and Pro for more. New accounts get 14 days of Pro for free. No charges during early access.")],
    [t("Does it work in Russian?"), t("Yes. Both you and your clients can switch between Russian and English at any time.")],
  ]
  return (
    <section id="faq" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading no="05" label={t("FAQ")} title={t("Questions shops ask.")} />
        <div className="border-t border-border">
          {items.map(([q, a]) => (
            <details key={q} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                <span className="text-base font-medium text-foreground sm:text-lg">{q}</span>
                <PlusIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="max-w-2xl pb-5 text-sm text-muted-foreground sm:text-base">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Closing + footer ────────────────────────────────────

export function Closing({ t, signedIn }: { t: T; signedIn: boolean }) {
  return (
    <section className="border-t border-border py-28">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <h2 className={cn(HEADLINE, "max-w-3xl text-5xl leading-[0.98] sm:text-6xl")}>
          {t("Your next approval is")} <span className="text-muted-foreground">{t("one link away.")}</span>
        </h2>
        <div className="flex flex-col items-start gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/signup"}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {signedIn ? t("Open dashboard") : t("Start free")}
            <ArrowRightIcon className="size-4" />
          </Link>
          <p className="text-xs text-muted-foreground">{t("set up your first order in 2 minutes")}</p>
        </div>
      </div>
    </section>
  )
}

export function WorkshopFooter({ t }: { t: T }) {
  const year = new Date(useNow(3_600_000)).getFullYear()
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 sm:flex-row sm:items-center sm:px-6">
        <Logo />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <LanguageSwitcher className="sm:hidden" />
          <Link href="/login" className="hover:text-foreground">{t("Sign in")}</Link>
          <span>{t("Made in Ukraine")}</span>
          <span>© {year} Nodly</span>
        </div>
      </div>
    </footer>
  )
}
