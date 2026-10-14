"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRightIcon, BellIcon, CalendarDaysIcon, CheckIcon, Link2Icon, PlusIcon, QrCodeIcon, StarIcon, UsersIcon,
} from "lucide-react"
import { Logo } from "@/components/Logo"
import { NicheIcon } from "@/components/crm/NicheIcon"
import { WorkshopFooter } from "@/components/landing/WorkshopSections"
import { supabase } from "@/lib/supabase"
import { setLang, useLang, useT, type Lang, type T } from "@/lib/i18n"
import type { CrmNiche } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { PLANS, planHighlights } from "@/lib/plans"
import { BillingCycleToggle, PlanPrice } from "@/components/plans/PlanBits"

// The landing for beauty masters, barbers and home bakers, in the app's own Apple-like look:
// big tight headlines, white cards on a light grey page, black pill buttons, no colour but one.

const H = "font-semibold tracking-[-0.035em] text-foreground"

function Cta({ href, children, light, className }: { href: string; children: React.ReactNode; light?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn(
      "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-opacity hover:opacity-85",
      light ? "bg-card text-foreground ring-1 ring-border" : "bg-foreground text-background",
      className,
    )}>
      {children}
    </Link>
  )
}

export function SalonLanding() {
  const { t } = useT()
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
  }, [])
  const start = signedIn ? "/dashboard" : "/signup"
  const startLabel = signedIn ? t("Open dashboard") : t("Start free")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header t={t} signedIn={signedIn} variant="landing" />
      <main>
        <Hero t={t} start={start} startLabel={startLabel} />
        <Niches t={t} />
        <How t={t} />
        <Features t={t} />
        <Price t={t} start={start} startLabel={startLabel} />
        <Faq t={t} />
        <Closing t={t} start={start} startLabel={startLabel} />
      </main>
      <WorkshopFooter t={t} />
    </div>
  )
}

/**
 * The site's top bar. On the catalog (the home page, for clients) it is just the logo and
 * "For masters"; on the masters' landing it has the landing's sections and a way back to the catalog.
 */
export function Header({ t, signedIn, variant = "catalog" }: { t: T; signedIn: boolean; variant?: "catalog" | "landing" }) {
  // a floating capsule; it gains a shadow once the page scrolls under it
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  const links = variant === "landing"
    ? [["/", t("Catalog")], ["/business#how", t("How it works")], ["/business#features", t("What's inside")], ["/business#price", t("Pricing")], ["/business#faq", t("FAQ")]] as const
    : []
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className={cn(
        "mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-full pr-2 pl-5 transition-all duration-300",
        scrolled ? "bg-card/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] ring-1 ring-border backdrop-blur-xl" : "bg-transparent",
      )}>
        <Link href="/" aria-label="Nodly" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-1.5 text-[14px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <LangToggle />
          {signedIn ? (
            <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[14px] font-medium whitespace-nowrap text-background hover:opacity-85">{t("Open dashboard")}</Link>
          ) : (
            <>
              <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-[14px] text-foreground/80 transition-colors hover:bg-foreground/[0.06] hover:text-foreground sm:inline-flex">{t("Sign in")}</Link>
              {/* clients never sign up: on the catalog the one button is for masters */}
              {variant === "catalog"
                ? <Link href="/business" className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[14px] font-medium whitespace-nowrap text-background hover:opacity-85">{t("For masters")}</Link>
                : <Link href="/signup" className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[14px] font-medium whitespace-nowrap text-background hover:opacity-85">{t("Start free")}</Link>}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/** Two languages, two letters: a small switch instead of a dropdown. */
function LangToggle() {
  const lang = useLang()
  const { t } = useT()
  return (
    <div role="radiogroup" aria-label={t("Language")} className="hidden h-8 items-center rounded-full bg-foreground/[0.06] p-0.5 text-[12px] font-semibold sm:flex">
      {([["uk", "UA"], ["ru", "RU"]] as [Lang, string][]).map(([l, label]) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
          className={cn("h-7 rounded-full px-2.5 transition-colors", lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Hero: the promise in the middle, the real app under it ──

/** A real screen of the app, light or dark with the site's theme, in the site's language. */
function Shot({ name, alt, className }: { name: string; alt: string; className?: string }) {
  const lang = useLang()
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/landing/${name}-light-${lang}.webp`} alt={alt} className={cn("block dark:hidden", className)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/landing/${name}-dark-${lang}.webp`} alt={alt} className={cn("hidden dark:block", className)} />
    </>
  )
}

function Hero({ t, start, startLabel }: { t: T; start: string; startLabel: string }) {
  return (
    <section className="overflow-hidden">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-14 text-center sm:px-6 sm:pt-20">
        <h1 className={cn(H, "text-[44px] leading-[1.02] sm:text-[72px] lg:text-[88px]")}>
          {t("Clients book themselves.")}<br /><span className="text-muted-foreground/70">{t("You just work.")}</span>
        </h1>
        <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted-foreground sm:text-[20px]">{t("One link in your Instagram bio, and bookings land in your calendar on their own.")}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Cta href={start}>{startLabel}<ArrowRightIcon className="size-4" /></Cta>
          <Cta href="#how" light>{t("How it works")}</Cta>
        </div>
        <p className="mt-4 text-[13px] text-muted-foreground">{t("Nails · barbershops · tattoo · cakes to order")}</p>
      </div>

      {/* the stage: the owner's calendar as it is */}
      <div className="relative mx-auto mt-14 max-w-6xl px-4 pb-16 sm:mt-20 sm:px-6 sm:pb-24">
        <div className="relative overflow-hidden rounded-[22px] bg-card shadow-[0_50px_100px_-30px_rgba(0,0,0,0.35)] ring-1 ring-border sm:rounded-[28px]">
          <Shot name="nails-app" alt={t("The appointments calendar in Nodly")} className="w-full" />
        </div>
      </div>
    </section>
  )
}

// ── Who it's for: one trade at a time, with its own screen ──

function Niches({ t }: { t: T }) {
  const items: { id: CrmNiche; tab: string; title: string; points: string[] }[] = [
    { id: "nails", tab: t("Nails"), title: t("For nail masters"), points: [t("Services with time and price"), t("Only free windows on the page"), t("Every client's history")] },
    { id: "barber", tab: t("Barbershop"), title: t("For barbershops"), points: [t("Haircuts and beards by the slot"), t("No double bookings"), t("Regulars found by phone")] },
    { id: "tattoo", tab: t("Tattoo"), title: t("For tattoo artists"), points: [t("Long sessions in the calendar"), t("Sketch, placement and size in the notes"), t("Regulars and their work history")] },
    { id: "cakes", tab: t("Cakes"), title: t("For cakes to order"), points: [t("Orders by day, not by hour"), t("Filling, weight, inscription"), t("Every order's next step in one tap")] },
  ]
  const [on, setOn] = useState<CrmNiche>("nails")
  const cur = items.find((i) => i.id === on)!
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <h2 className={cn(H, "text-[36px] leading-[1.05] sm:text-[56px]")}>{t("Set up for your trade.")}</h2>
          <p className="mt-4 max-w-lg text-[17px] text-muted-foreground">{t("Pick your business when you sign up. The services, the words and the screens follow.")}</p>
          <div role="tablist" className="mt-8 inline-flex max-w-full gap-0.5 rounded-full sm:gap-1 bg-foreground/[0.06] p-1">
            {items.map((i) => (
              <button key={i.id} type="button" role="tab" aria-selected={on === i.id} onClick={() => setOn(i.id)}
                className={cn("flex h-10 items-center gap-1.5 rounded-full pr-3 pl-1 text-[13.5px] font-medium transition-all sm:h-11 sm:gap-2 sm:pr-4 sm:pl-1.5 sm:text-[14.5px]",
                  on === i.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <NicheIcon niche={i.id} className="size-7 sm:size-8" />{i.tab}
              </button>
            ))}
          </div>
        </div>
        <div key={on} className="mt-12 grid items-center gap-10 lg:grid-cols-[320px_1fr] animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col gap-5">
            <NicheIcon niche={cur.id} className="size-24" />
            <h3 className="text-[30px] font-semibold tracking-[-0.03em]">{cur.title}</h3>
            <ul className="flex flex-col gap-3">
              {cur.points.map((x) => (
                <li key={x} className="flex items-center gap-3 text-[17px]"><CheckIcon className="size-5 shrink-0" strokeWidth={2.2} />{x}</li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-[22px] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.35)] ring-1 ring-border">
            <Shot name={`${cur.id}-app`} alt={cur.title} className="w-full" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── How it works: three steps on a line ──

function How({ t }: { t: T }) {
  const steps = [
    { title: t("Pick your business"), text: t("Starter services appear on their own. Put in your prices.") },
    { title: t("Make your page"), text: t("Photo, a few words, contacts and the hours you work.") },
    { title: t("Put the link in your bio"), text: t("Clients book. You get a message in Telegram.") },
  ]
  return (
    <section id="how" className="scroll-mt-20 border-y border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className={cn(H, "text-[36px] leading-[1.05] sm:text-[56px]")}>{t("Three steps, five minutes.")}</h2>
        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 md:border-l md:border-border md:pl-8 md:first:border-l-0 md:first:pl-0">
              <span className="text-[64px] leading-none font-semibold tracking-[-0.05em] text-foreground/15 tabular-nums">{i + 1}</span>
              <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{s.title}</h3>
              <p className="text-[16px] leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ── What's inside: a plain list, like a spec sheet ──

function Features({ t }: { t: T }) {
  const rows = [
    { icon: Link2Icon, title: t("Your page with online booking"), text: t("Work, reviews, contacts and booking, open day and night.") },
    { icon: CalendarDaysIcon, title: t("A calendar that fills itself"), text: t("The day, its week and what it earns. Cakes see their orders by day.") },
    { icon: UsersIcon, title: t("Client base"), text: t("Phone, notes and every visit, gathered on their own.") },
    { icon: BellIcon, title: t("Telegram notices"), text: t("A message the moment someone books.") },
    { icon: QrCodeIcon, title: t("QR code"), text: t("For cards and the counter.") },
    { icon: StarIcon, title: t("Reviews"), text: t("Clients leave them, new clients read them.") },
  ]
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className={cn(H, "text-[36px] leading-[1.05] sm:text-[56px]")}>{t("What's inside.")}</h2>
          <p className="mt-4 max-w-sm text-[17px] text-muted-foreground">{t("What a small business uses every day. Nothing else.")}</p>
        </div>
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={r.title} className="flex items-start gap-5 border-b border-border py-6 first:pt-0">
              <r.icon className="mt-1 size-6 shrink-0" strokeWidth={1.6} />
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{r.title}</h3>
                <p className="mt-1 text-[16px] text-muted-foreground">{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ── Price: early access is free ──

function Price({ t, start, startLabel }: { t: T; start: string; startLabel: string }) {
  const [yearly, setYearly] = useState(false)
  return (
    <section id="price" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className={cn(H, "text-[36px] leading-[1.05] sm:text-[56px]")}>{t("Pricing")}</h2>
          <p className="max-w-lg text-[17px] text-muted-foreground">{t("Start free. Pay when clients book often.")}</p>
          <BillingCycleToggle yearly={yearly} onChange={setYearly} />
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const best = plan.id === "go"
            return (
              <div key={plan.id} className={cn("flex flex-col gap-6 rounded-[28px] p-7", best ? "bg-foreground text-background" : "apple-card")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[20px] font-semibold">{t(plan.name)}</p>
                  {best && <span className="rounded-full bg-background/15 px-2.5 py-1 text-[12px] font-medium">{t("Popular")}</span>}
                </div>
                <PlanPrice plan={plan} yearly={yearly} className="text-[40px] font-semibold tracking-[-0.03em] [&>span:nth-child(2)]:text-[14px]" />
                <ul className="flex flex-1 flex-col gap-2.5">
                  {planHighlights(plan, "nails").map((x) => (
                    <li key={x} className="flex gap-2.5 text-[15px]"><CheckIcon className="mt-0.5 size-4 shrink-0 opacity-70" strokeWidth={2.5} />{t(x)}</li>
                  ))}
                </ul>
                <Link href={start} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium hover:opacity-90",
                  best ? "bg-background text-foreground" : "bg-foreground text-background")}>
                  {plan.monthly ? t("Try 7 days free") : startLabel}
                </Link>
              </div>
            )
          })}
        </div>
        <p className="mt-6 text-center text-[13.5px] text-muted-foreground">{t("Clients never pay and never sign up. Prices in hryvnias, cancel any time.")}</p>
      </div>
    </section>
  )
}

// ── Questions ──

function Faq({ t }: { t: T }) {
  const items = [
    [t("Do my clients need to install anything?"), t("No. Your page opens in any browser on the phone. Clients leave a name and a phone number, that's all.")],
    [t("Can two clients book the same time?"), t("No. Only free times are shown, and a time taken a second earlier won't book twice.")],
    [t("What if a client books by phone or in Instagram?"), t("Add the booking yourself in the calendar in a few taps. The client goes into your base too.")],
    [t("Where do the notices come?"), t("To Telegram: connect it in the settings once, and every new booking or order comes as a message.")],
    [t("I bake cakes, not appointments. Does it fit?"), t("Yes. For cakes Nodly takes orders by day with the filling, weight and inscription, and caps how many you take a day.")],
  ]
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-16 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <h2 className={cn(H, "text-[36px] leading-[1.05] sm:text-[48px]")}>{t("Questions")}</h2>
        <div className="flex flex-col">
          {items.map(([q, a], i) => (
            <div key={q} className="border-b border-border">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] font-medium">
                {q}
                <PlusIcon className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300", open === i && "rotate-45")} />
              </button>
              <div className={cn("grid transition-all duration-300", open === i ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <p className="overflow-hidden text-[15px] leading-relaxed text-muted-foreground">{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Closing({ t, start, startLabel }: { t: T; start: string; startLabel: string }) {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* the closing call in the other theme's colours, like the catalog's call to masters */}
        <div className="surface-invert flex flex-col items-center gap-6 rounded-[32px] bg-background px-6 py-14 text-center sm:py-20">
          <div className="flex -space-x-3">
            {(["nails", "barber", "tattoo", "cakes"] as CrmNiche[]).map((n) => <NicheIcon key={n} niche={n} className="size-14 ring-4 ring-background" />)}
          </div>
          <h2 className={cn(H, "max-w-2xl text-[40px] leading-[1.02] sm:text-[56px]")}>{t("Your link is five minutes away.")}</h2>
          <p className="max-w-lg text-[17px] text-muted-foreground">{t("Sign up, pick your business and send the link to your first client today.")}</p>
          <Cta href={start}>{startLabel}<ArrowRightIcon className="size-4" /></Cta>
        </div>
      </div>
    </section>
  )
}
