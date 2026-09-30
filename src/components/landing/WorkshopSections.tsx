"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon, PlusIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import { STATUS_MAP } from "@/components/dashboard/types"
import { PinGlyph } from "@/components/orders/pins"
import { PLANS } from "@/lib/plans"
import { BillingCycleToggle, PlanPrice } from "@/components/plans/PlanBits"
import { cn } from "@/lib/utils"
import { useNow } from "@/lib/use-now"
import type { T } from "@/lib/i18n"

// The sections under the desk hero, in the dashboard's own language: the brand wordmark font
// for headlines, hairline rules, monochrome, and real Nodly UI (order card, pins, status badges)
// instead of illustrations or icon tiles.

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

// ── 01 · How it works ───────────────────────────────────

export function HowItWorks({ t }: { t: T }) {
  const steps = [
    { title: t("Create an order"), text: t("Add the client, price and deadline in a few seconds."), aside: t("takes a minute") },
    { title: t("Upload the drawing"), text: t("PDF with any number of pages, or an image."), aside: t("any size, any page count") },
    { title: t("Send one link"), text: t("Protect it with a password. The client doesn't need an account."), aside: t("no sign-up for them") },
    { title: t("Get the “yes”"), text: t("Comments arrive live; the client approves or asks for changes."), aside: t("with name and time on record") },
  ]
  return (
    <section id="how" className="scroll-mt-16 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading no="01" label={t("How it works")} title={t("The whole job, in four moves.")} note={t("no training, no manuals")} />
        <ol className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 border-b border-border py-8 sm:px-6 sm:first:pl-0 lg:border-b-0 lg:border-l lg:first:border-l-0">
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <h3 className={cn(HEADLINE, "text-xl")}>{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
              <Chip>{s.aside}</Chip>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ── 02 · Before / after ─────────────────────────────────

export function BeforeAfter({ t }: { t: T }) {
  const chat: { time: string; text: string; mine?: boolean }[] = [
    { time: "12:04", text: t("Can the handles be different?") },
    { time: "12:31", text: t("Which ones? The black ones?"), mine: true },
    { time: "14:10", text: t("🎤 Voice message · 0:47") },
    { time: "19:02", text: t("I sent you a photo yesterday") },
    { time: "21:15", text: t("Make the right one taller, like we said") },
  ]
  const pins = [t("Matte black handles, please"), t("Darker countertop"), t("+20 cm on this cabinet?")]
  const approved = STATUS_MAP.approved
  const trades = [t("Kitchens"), t("Wardrobes"), t("Built-ins"), t("Joinery"), t("Shopfitting"), t("Interior studios")]

  return (
    <section id="for" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading no="02" label={t("Before / after")} title={t("Same kitchen. Two ways to agree on it.")} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          {/* before: a messenger thread */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{t("Before — the chat")}</p>
            <Card className="gap-2.5 px-5 py-5">
              {chat.map((m, i) => (
                <div key={i} className={cn("flex max-w-[85%] flex-col gap-0.5", m.mine && "items-end self-end")}>
                  <span
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm text-muted-foreground line-through decoration-destructive/60",
                      m.mine ? "rounded-br-md bg-muted/60" : "rounded-bl-md bg-muted"
                    )}
                  >
                    {m.text}
                  </span>
                  <span className="px-1 text-[10px] tabular-nums text-muted-foreground/70">{m.time}</span>
                </div>
              ))}
              <div className="mt-1 flex max-w-[85%] flex-col gap-0.5">
                <span className="px-1 text-[10px] text-muted-foreground/70">{t("3 days later")}</span>
                <span className="rounded-2xl rounded-bl-md bg-destructive/10 px-3.5 py-2 text-sm font-medium text-destructive">
                  {t("I never approved this.")}
                </span>
              </div>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Chip tone="danger">{t("47 messages")}</Chip>
              <Chip tone="danger">{t("3 voice notes")}</Chip>
              <Chip tone="danger">{t("1 kitchen rebuilt")}</Chip>
            </div>
          </div>

          {/* after: the order as it looks in Nodly */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{t("After — Nodly")}</p>
            <Card className="gap-0 py-0">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm font-medium">{t("Kitchen “Modern”, rev. 2")}</span>
                  <span className="text-xs text-muted-foreground">ORD-24</span>
                </div>
                <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px]" style={{ backgroundColor: approved.bg, color: approved.color }}>
                  {t(approved.label)}
                </span>
              </div>
              <ul className="flex flex-col px-3 py-3">
                {pins.map((p) => (
                  <li key={p} className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <PinGlyph resolved />
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through decoration-muted-foreground/40">{p}</span>
                    <span className="text-[11px] text-muted-foreground">{t("resolved")}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 border-t border-border px-5 py-3.5 text-sm">
                <span className="flex size-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: approved.color }}>
                  <CheckIcon className="size-3" />
                </span>
                <span className="font-medium">{t("Approved by Anna K.")}</span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">{t("Oct 12, 12:40")}</span>
              </div>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Chip>{t("1 link")}</Chip>
              <Chip>{t("3 pins")}</Chip>
              <Chip>{t("1 decision, on record")}</Chip>
            </div>
          </div>
        </div>

        <p className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="text-xs font-medium tracking-[0.14em] uppercase">{t("Built for")}</span>
          {trades.map((tr, i) => (
            <span key={tr} className="flex items-center gap-4">
              {i > 0 && <span aria-hidden="true" className="size-1 rounded-full bg-border" />}
              <span className="text-foreground">{tr}</span>
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

// ── 03 · Specification ──────────────────────────────────

export function Specification({ t }: { t: T }) {
  const rows: [string, string][] = [
    [t("Comments"), t("pinned to the exact spot, on any page")],
    [t("Files"), t("PDF of any length, PNG, JPG")],
    [t("Client access"), t("one link, optional password, no account")],
    [t("Decision"), t("approve or request changes, with name and time")],
    [t("Versions"), t("every revision kept, comments stay with theirs")],
    [t("Certificate"), t("a PDF approval record for your files")],
    [t("Updates"), t("live, no reload")],
    [t("Reminders"), t("automatic nudges to slow clients")],
    [t("Branding"), t("your logo and colours in the portal")],
    [t("Languages"), t("English, Russian")],
  ]
  return (
    <section id="features" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading no="03" label={t("Specification")} title={t("What’s in the box.")} note={t("and nothing you won’t use")} />
        <dl className="grid gap-x-14 md:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3 border-b border-border py-3.5 text-sm">
              <dt className="shrink-0 font-medium text-foreground">{k}</dt>
              <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-3px] border-b border-dotted border-muted-foreground/30" />
              <dd className="text-right text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
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
