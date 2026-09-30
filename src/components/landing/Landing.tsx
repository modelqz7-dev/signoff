"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  FactoryIcon,
  FileUpIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  LinkIcon,
  LockIcon,
  MapPinIcon,
  PaletteIcon,
  PlusIcon,
  PrinterIcon,
  UsersIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { STATUS_MAP } from "@/components/dashboard/types"
import { PLANS } from "@/lib/plans"
import { BillingCycleToggle, PlanPrice } from "@/components/plans/PlanBits"
import { supabase } from "@/lib/supabase"
import { useT, type T } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { DeskHero } from "@/components/landing/DeskHero"
import { useNow } from "@/lib/use-now"

/** next/link styled like the shadcn Button, for calls to action. */
function CtaLink({ href, children, variant = "primary", className }: {
  href: string
  children: React.ReactNode
  variant?: "primary" | "outline"
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/85"
          : "border border-border bg-card text-foreground hover:bg-hover",
        className
      )}
    >
      {children}
    </Link>
  )
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-2 text-xs font-medium tracking-wide text-accent uppercase">{eyebrow}</p>
      <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {text && <p className="mt-3 text-sm text-muted-foreground sm:text-base">{text}</p>}
    </div>
  )
}

export function Landing() {
  const { t } = useT()
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header t={t} signedIn={signedIn} />
      <main>
        <DeskHero t={t} signedIn={signedIn} />
        <HowItWorks t={t} />
        <ForWhom t={t} />
        <Features t={t} />
        <Pricing t={t} />
        <Faq t={t} />
        <FinalCta t={t} signedIn={signedIn} />
      </main>
      <Footer t={t} />
    </div>
  )
}

// ── Header ──────────────────────────────────────────────

function Header({ t, signedIn }: { t: T; signedIn: boolean }) {
  const links = [
    ["#how", t("How it works")],
    ["#for", t("Who it's for")],
    ["#features", t("Features")],
    ["#pricing", t("Pricing")],
    ["#faq", t("FAQ")],
  ]
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Nodly"><Logo /></Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
          <ThemeToggle />
          {signedIn ? (
            <CtaLink href="/dashboard" className="h-8 px-3">{t("Open dashboard")}</CtaLink>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:block">
                {t("Sign in")}
              </Link>
              <CtaLink href="/signup" className="h-8 px-3">{t("Start free")}</CtaLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Hero ────────────────────────────────────────────────

// ── How it works ────────────────────────────────────────

function HowItWorks({ t }: { t: T }) {
  const steps: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: PlusIcon, title: t("Create an order"), text: t("Add the client, price and deadline in a few seconds.") },
    { icon: FileUpIcon, title: t("Upload the design"), text: t("PDF with any number of pages, or an image.") },
    { icon: LinkIcon, title: t("Share one link"), text: t("Protect it with a password. The client doesn't need an account.") },
    { icon: CheckCircle2Icon, title: t("Get approval"), text: t("Comments arrive live; the client approves or asks for changes.") },
  ]
  return (
    <section id="how" className="scroll-mt-16 border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t("How it works")} title={t("From design to approval in four steps")} />
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Card className="h-full gap-3 px-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ── Who it's for (categories) ───────────────────────────

type Category = {
  id: string
  icon: LucideIcon
  label: string
  title: string
  text: string
  points: string[]
  example: { title: string; status: keyof typeof STATUS_MAP }
}

function ForWhom({ t }: { t: T }) {
  const categories: Category[] = [
    {
      id: "designer", icon: PaletteIcon, label: t("Designers"),
      title: t("Stop collecting edits from chats"),
      text: t("Every comment lands exactly where it belongs on the layout, not in a message thread."),
      points: [t("Comments pinned to exact spots"), t("One link per project, always up to date"), t("A clear “approve” or “changes” decision")],
      example: { title: t("Brand identity"), status: "changes" },
    },
    {
      id: "freelancer", icon: BriefcaseIcon, label: t("Freelancers"),
      title: t("Look professional with every client"),
      text: t("Send a tidy approval page instead of attachments and long explanations."),
      points: [t("A clean client portal with no sign-up"), t("A password for each project"), t("Deadlines and overdue reminders")],
      example: { title: t("Landing page mockup"), status: "await" },
    },
    {
      id: "print", icon: PrinterIcon, label: t("Print shops"),
      title: t("Approve proofs before you print"),
      text: t("Clients mark typos and colors on the proof, so mistakes never reach the press."),
      points: [t("Comments on multi-page PDF proofs"), t("Approval recorded before production"), t("Move approved orders to production")],
      example: { title: t("Business cards, 500 pcs"), status: "approved" },
    },
    {
      id: "studio", icon: UsersIcon, label: t("Studios"),
      title: t("Keep every client project on track"),
      text: t("See at a glance what waits on clients and what waits on your team."),
      points: [t("A dashboard of what needs attention"), t("A live feed of client activity"), t("Filters by status and deadline")],
      example: { title: t("Café menu redesign"), status: "await" },
    },
    {
      id: "manufacturer", icon: FactoryIcon, label: t("Manufacturers"),
      title: t("Sign off drawings before you build"),
      text: t("Clients zoom into technical drawings and pin questions to the exact dimension."),
      points: [t("Zoom in to comment on small details"), t("Works with large multi-page drawings"), t("No more “I never approved this”")],
      example: { title: t("Kitchen cabinets"), status: "prod" },
    },
  ]
  const [active, setActive] = useState(categories[0].id)
  const current = categories.find((c) => c.id === active) ?? categories[0]
  const status = STATUS_MAP[current.example.status]

  return (
    <section id="for" className="scroll-mt-16 border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t("Who it's for")} title={t("Made for people who get designs approved")} />

        <div role="tablist" aria-label={t("Who it's for")} className="mx-auto mb-8 flex max-w-fit flex-wrap justify-center gap-1 rounded-xl bg-muted/50 p-1">
          {categories.map(({ id, icon: Icon, label }) => {
            const selected = id === active
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  selected ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            )
          })}
        </div>

        <Card key={current.id} className="animate-in fade-in slide-in-from-bottom-2 grid gap-8 px-6 py-8 duration-300 md:grid-cols-2 md:px-10">
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-medium tracking-tight">{current.title}</h3>
            <p className="text-sm text-muted-foreground">{current.text}</p>
            <ul className="flex flex-col gap-2.5">
              {current.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <CheckIcon className="size-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          {/* example order row */}
          <div className="flex flex-col justify-center gap-3 rounded-xl bg-muted/40 p-5">
            <p className="text-xs text-muted-foreground">{t("Example order")}</p>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{current.example.title}</p>
                <p className="text-xs text-muted-foreground">{t("3 comments · due in 2 days")}</p>
              </div>
              <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px]" style={{ backgroundColor: status.bg, color: status.color }}>
                {t(status.label)}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 text-xs text-muted-foreground ring-1 ring-foreground/10">
              <MapPinIcon className="size-3.5 text-accent" />
              {t("New comment on page 2 — just now")}
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

// ── Features ────────────────────────────────────────────

function Features({ t }: { t: T }) {
  const items: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: MapPinIcon, title: t("Pins on any page"), text: t("Clients click anywhere on a zoomed PDF to leave a comment, and can move or delete their own pins.") },
    { icon: ZapIcon, title: t("Live updates"), text: t("New comments and status changes appear on your dashboard instantly, with no reload.") },
    { icon: CheckCircle2Icon, title: t("One-click approval"), text: t("Approve or Request Changes: a clear decision recorded on the order.") },
    { icon: LockIcon, title: t("Password-protected links"), text: t("Each order has its own link and optional password. Clients see only their order.") },
    { icon: LayoutDashboardIcon, title: t("A dashboard that tells you what's next"), text: t("Overdue orders, requested changes and open comments, sorted by urgency.") },
    { icon: LanguagesIcon, title: t("Russian and English"), text: t("Switch the language for yourself and your clients, plus light and dark themes.") },
  ]
  return (
    <section id="features" className="scroll-mt-16 border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow={t("Features")} title={t("Everything the approval needs, nothing extra")} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="gap-3 px-5 transition-colors hover:ring-accent/40">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Icon className="size-4" />
              </span>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ─────────────────────────────────────────────

function Pricing({ t }: { t: T }) {
  const [yearly, setYearly] = useState(false)
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t("Pricing")}
          title={t("Simple plans that grow with you")}
          text={t("Every new account gets 14 days of Pro for free, no card needed. Then stay on Free or pick a plan.")}
        />
        <div className="mb-8 flex justify-center">
          <BillingCycleToggle yearly={yearly} onChange={setYearly} />
        </div>
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const featured = plan.id === "go"
            return (
              <Card key={plan.id} className={cn("gap-4 px-6", featured && "ring-2 ring-accent")}>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{plan.name}</p>
                  {featured && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">{t("Recommended")}</span>}
                </div>
                <PlanPrice plan={plan} yearly={yearly} className="text-3xl font-semibold tracking-tight" />
                <ul className="flex flex-col gap-2">
                  {plan.highlights.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckIcon className="size-4 shrink-0 text-accent" />
                      {t(f)}
                    </li>
                  ))}
                </ul>
                <CtaLink href="/signup" variant={featured ? "primary" : "outline"} className="mt-auto w-full">
                  {t("Start free")}
                </CtaLink>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── FAQ ─────────────────────────────────────────────────

function Faq({ t }: { t: T }) {
  const items = [
    [t("Do my clients need an account?"), t("No. They open the link, enter their name and, if you set one, the password.")],
    [t("Which files can I upload?"), t("PDF files with any number of pages, and PNG or JPG images.")],
    [t("Can a client see my other orders?"), t("No. Each link opens exactly one order.")],
    [t("How much does it cost?"), t("There is a free plan with up to 3 active orders, and Go and Pro for more. New accounts get 14 days of Pro for free. No charges during early access.")],
    [t("Does it work in Russian?"), t("Yes. Both you and your clients can switch between Russian and English at any time.")],
  ]
  return (
    <section id="faq" className="scroll-mt-16 border-t border-border py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow={t("FAQ")} title={t("Questions and answers")} />
        <div className="flex flex-col gap-3">
          {items.map(([q, a]) => (
            <details key={q} className="group rounded-xl bg-card px-5 ring-1 ring-foreground/10 open:ring-accent/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Final CTA + footer ──────────────────────────────────

function FinalCta({ t, signedIn }: { t: T; signedIn: boolean }) {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Card className="relative items-center gap-5 overflow-hidden px-6 py-14 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(60% 80% at 50% 0%, color-mix(in oklab, var(--accent) 40%, transparent), transparent)" }}
          />
          <h2 className="relative text-2xl font-medium tracking-tight sm:text-3xl">{t("Your next approval is one link away")}</h2>
          <p className="relative max-w-lg text-sm text-muted-foreground sm:text-base">
            {t("Create an order, upload the design and send the link. Your client will take it from there.")}
          </p>
          <CtaLink href={signedIn ? "/dashboard" : "/signup"} className="relative">
            {signedIn ? t("Open dashboard") : t("Start free")}
            <ArrowRightIcon className="size-4" />
          </CtaLink>
        </Card>
      </div>
    </section>
  )
}

function Footer({ t }: { t: T }) {
  const year = new Date(useNow(3_600_000)).getFullYear()
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Logo />
        <div className="flex items-center gap-4">
          <LanguageSwitcher className="sm:hidden" />
          <Link href="/login" className="hover:text-foreground">{t("Sign in")}</Link>
          <span>© {year} Nodly</span>
        </div>
      </div>
    </footer>
  )
}
