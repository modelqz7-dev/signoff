"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import { PLANS } from "@/lib/plans"
import { BillingCycleToggle, PlanPrice } from "@/components/plans/PlanBits"
import { cn } from "@/lib/utils"
import { useNow } from "@/lib/use-now"
import type { T } from "@/lib/i18n"

// The sections under the desk hero, in the same "workshop" language: serif headlines,
// hairline rules, paper objects, red-pencil notes. No icon tiles, no card grids.
// Font classes (font-display, font-hand) live in app/landing-fonts.css.

const PAPER = "bg-[#f5f1e8] text-[#2f2c28] shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_50px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/5"
const RED = "text-[#b3342a]"

function SheetHeading({ no, label, title, note }: { no: string; label: string; title: React.ReactNode; note?: string }) {
  return (
    <div className="mb-14 flex flex-col gap-5">
      <div className="flex items-center gap-4 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        <span>{no}</span>
        <span className="h-px flex-1 bg-border" />
        <span>{label}</span>
      </div>
      <div className="relative">
        <h2 className="font-display max-w-3xl text-[40px] leading-[1] font-medium text-foreground sm:text-6xl">{title}</h2>
        {note && (
          <p className="font-hand mt-3 -rotate-2 text-xl text-muted-foreground lg:absolute lg:top-2 lg:right-0 lg:mt-0 lg:max-w-[260px] lg:text-right">
            {note}
          </p>
        )}
      </div>
    </div>
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
        <SheetHeading no={t("Sheet 01")} label={t("How it works")} title={t("The whole job, in four moves.")} note={t("no training, no manuals")} />
        <ol className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 border-b border-border py-8 sm:px-6 sm:first:pl-0 lg:border-b-0 lg:border-l lg:first:border-l-0">
              <span className="font-display text-7xl leading-none text-muted-foreground/60">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-2xl font-medium text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
              <p className={cn("font-hand -rotate-1 text-lg", RED)}>{s.aside}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ── 02 · Before / after ─────────────────────────────────

export function BeforeAfter({ t }: { t: T }) {
  const chat = [
    ["12:04", t("Can the handles be different?")],
    ["12:31", t("Which ones? The black ones?")],
    ["14:10", t("🎤 Voice message · 0:47")],
    ["19:02", t("I sent you a photo yesterday")],
    ["21:15", t("Make the right one taller, like we said")],
    [t("3 days later"), t("I never approved this.")],
  ]
  const trades = [t("Kitchens"), t("Wardrobes"), t("Built-ins"), t("Joinery"), t("Shopfitting"), t("Interior studios")]
  return (
    <section id="for" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SheetHeading no={t("Sheet 02")} label={t("Before / after")} title={t("Same kitchen. Two ways to agree on it.")} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* before: the chat */}
          <figure className="flex flex-col gap-4">
            <figcaption className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">{t("Before — the chat")}</figcaption>
            <div className="relative flex flex-col gap-2.5 border-l border-border pl-5">
              {chat.map(([time, line], i) => (
                <p key={i} className={cn("flex gap-4 text-[15px]", i === chat.length - 1 ? "font-medium text-foreground" : "text-muted-foreground line-through decoration-[#b3342a]/70")}>
                  <span className="w-24 shrink-0 font-mono text-[11px] leading-6 tracking-wide text-muted-foreground/70">{time}</span>
                  <span>{line}</span>
                </p>
              ))}
            </div>
            <p className={cn("font-hand -rotate-1 pl-5 text-2xl", RED)}>{t("47 messages, 3 voice notes, one kitchen rebuilt.")}</p>
          </figure>

          {/* after: one sheet with a stamp */}
          <figure className="flex flex-col gap-4">
            <figcaption className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">{t("After — Nodly")}</figcaption>
            <div className={cn("relative rotate-[1deg] rounded-[3px] p-6 sm:p-8", PAPER)}>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">{t("Approval record")}</p>
              <p className="font-display mt-2 text-3xl font-medium">{t("Kitchen “Modern”, rev. 2")}</p>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[12px]">
                {[
                  [t("Link"), t("1, with a password")],
                  [t("Comments"), t("3, pinned on the drawing")],
                  [t("Decision"), t("Approved")],
                  [t("By"), "Anna K."],
                  [t("Date"), t("Oct 12, 12:40")],
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="uppercase opacity-55">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="pointer-events-none absolute right-5 bottom-6 -rotate-[10deg] rounded-md border-[4px] border-double border-[#1f7a47] px-3 py-1 text-[#1f7a47] mix-blend-multiply sm:right-8">
                <p className="font-[family-name:var(--font-brand)] text-xl font-bold tracking-[0.18em]">{t("APPROVED")}</p>
              </div>
            </div>
            <p className="font-hand rotate-1 pl-1 text-2xl text-muted-foreground">{t("one link, one answer, on record.")}</p>
          </figure>
        </div>

        <p className="font-display mt-16 text-center text-2xl leading-relaxed text-muted-foreground italic sm:text-3xl">
          {trades.map((tr, i) => (
            <span key={tr}>
              {tr}
              {i < trades.length - 1 && <span className="mx-3 not-italic opacity-40">·</span>}
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
        <SheetHeading no={t("Sheet 03")} label={t("Specification")} title={t("What’s in the box.")} note={t("and nothing you won’t use")} />
        <dl className="grid gap-x-14 font-mono text-[13px] md:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3 border-b border-dashed border-border py-3.5">
              <dt className="shrink-0 tracking-wide text-foreground uppercase">{k}</dt>
              <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-3px] border-b border-dotted border-muted-foreground/40" />
              <dd className="text-right text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

// ── 04 · Pricing: price tickets ─────────────────────────

export function PricingTickets({ t }: { t: T }) {
  const [yearly, setYearly] = useState(false)
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SheetHeading
          no={t("Sheet 04")}
          label={t("Pricing")}
          title={t("Priced like a tool, not a project.")}
          note={t("14 days of Pro free, no card")}
        />
        <div className="mb-10 flex justify-start">
          <BillingCycleToggle yearly={yearly} onChange={setYearly} />
        </div>
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {PLANS.map((plan, i) => {
            const featured = plan.id === "go"
            return (
              <div key={plan.id} className={cn("relative flex flex-col rounded-[3px] p-6", PAPER, i === 0 ? "-rotate-[0.8deg]" : i === 2 ? "rotate-[0.8deg]" : "")}>
                {/* punched hole */}
                <span aria-hidden="true" className="absolute top-4 right-4 size-3 rounded-full bg-background ring-1 ring-black/10" />
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">{t("Plan")}</p>
                <p className="font-display text-3xl font-medium">{plan.name}</p>
                <PlanPrice plan={plan} yearly={yearly} className="font-display mt-3 text-5xl font-medium tracking-tight [&_.text-muted-foreground]:font-mono [&_.text-muted-foreground]:text-[#2f2c28]/55" />
                <div aria-hidden="true" className="my-5 border-t border-dashed border-[#2f2c28]/30" />
                <ul className="flex flex-1 flex-col gap-2 font-mono text-[12px]">
                  {plan.highlights.map((f) => (
                    <li key={f} className="flex gap-2"><span className="opacity-40">—</span>{t(f)}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={cn(
                    "mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                    featured ? "bg-[#2f2c28] text-[#f5f1e8] hover:bg-[#2f2c28]/85" : "border border-[#2f2c28]/30 hover:bg-[#2f2c28]/5"
                  )}
                >
                  {t("Start free")}
                </Link>
                {featured && (
                  <p className={cn("font-hand pointer-events-none absolute -top-9 right-2 rotate-3 text-xl", RED)}>
                    {t("most shops pick this")} ↓
                  </p>
                )}
              </div>
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
        <SheetHeading no={t("Sheet 05")} label={t("FAQ")} title={t("Questions shops ask.")} />
        <div className="border-t border-border">
          {items.map(([q, a]) => (
            <details key={q} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-2xl font-medium text-foreground sm:text-3xl">{q}</span>
                <span aria-hidden="true" className="font-mono text-xl text-muted-foreground transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pb-6 text-base text-muted-foreground">{a}</p>
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
        <h2 className="font-display max-w-3xl text-5xl leading-[0.95] font-medium text-foreground sm:text-7xl">
          {t("Your next approval is")} <em className="italic">{t("one link away.")}</em>
        </h2>
        <div className="flex flex-col items-start gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/signup"}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {signedIn ? t("Open dashboard") : t("Start free")}
            <ArrowRightIcon className="size-4" />
          </Link>
          <p className="font-hand -rotate-1 text-lg text-muted-foreground">{t("set up your first order in 2 minutes")}</p>
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
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          <LanguageSwitcher className="sm:hidden" />
          <Link href="/login" className="hover:text-foreground">{t("Sign in")}</Link>
          <span>{t("Made in Ukraine")}</span>
          <span>© {year} Nodly</span>
        </div>
      </div>
    </footer>
  )
}
