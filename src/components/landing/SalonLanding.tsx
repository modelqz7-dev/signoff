"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRightIcon, BellIcon, CalendarDaysIcon, CheckIcon, ClockIcon, Link2Icon, PlusIcon, QrCodeIcon, SendIcon, StarIcon, UsersIcon,
} from "lucide-react"
import { Logo } from "@/components/Logo"
import { NicheIcon } from "@/components/crm/NicheIcon"
import { WorkshopFooter } from "@/components/landing/WorkshopSections"
import { supabase } from "@/lib/supabase"
import { setLang, useLang, useT, type Lang, type T } from "@/lib/i18n"
import type { CrmNiche } from "@/lib/niches"
import { cn } from "@/lib/utils"

// The landing for beauty masters, barbers and home bakers, in the app's own Apple-like look:
// big tight headlines, white cards on a light grey page, black pill buttons, no colour but one.

const H = "font-semibold tracking-[-0.035em] text-foreground"
const CARD = "rounded-[28px] apple-card"

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
      <Header t={t} signedIn={signedIn} />
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

function Header({ t, signedIn }: { t: T; signedIn: boolean }) {
  // a floating capsule; it gains a shadow once the page scrolls under it
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  const links = [["#how", t("How it works")], ["#features", t("What's inside")], ["#price", t("Pricing")], ["#faq", t("FAQ")]] as const
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
            <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-85">{t("Open dashboard")}</Link>
          ) : (
            <>
              <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-[14px] text-foreground/80 transition-colors hover:bg-foreground/[0.06] hover:text-foreground sm:inline-flex">{t("Sign in")}</Link>
              <Link href="/signup" className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-85">{t("Start free")}</Link>
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
  return (
    <div role="radiogroup" aria-label="Language" className="hidden h-8 items-center rounded-full bg-foreground/[0.06] p-0.5 text-[12px] font-semibold sm:flex">
      {(["ru", "en"] as Lang[]).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
          className={cn("h-7 rounded-full px-2.5 uppercase transition-colors", lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {l}
        </button>
      ))}
    </div>
  )
}

// ── Hero: the promise on the left, the client's booking and the owner's day on the right ──

function Hero({ t, start, startLabel }: { t: T; start: string; startLabel: string }) {
  return (
    <section className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-28">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-[13px] font-medium ring-1 ring-border">
            <span className="size-1.5 rounded-full bg-[#34c759]" />{t("Early access · free")}
          </span>
          <h1 className={cn(H, "text-[44px] leading-[1.02] sm:text-[60px] lg:text-[68px]")}>{t("Clients book themselves. You just work.")}</h1>
          <p className="max-w-xl text-[18px] leading-relaxed text-muted-foreground">
            {t("Nodly gives nail masters, barbers and cake makers one link for the Instagram bio: clients see your work and prices, pick a free time and book. The appointment lands in your calendar, the notice comes to Telegram.")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Cta href={start}>{startLabel}<ArrowRightIcon className="size-4" /></Cta>
            <Cta href="#how" light>{t("How it works")}</Cta>
          </div>
          <p className="text-[13px] text-muted-foreground">{t("Set up in 5 minutes · no card")}</p>
        </div>
        <HeroVisual t={t} />
      </div>
    </section>
  )
}

function HeroVisual({ t }: { t: T }) {
  const times = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30"]
  return (
    <div className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end">
      {/* the client's phone */}
      <div className="relative z-10 mx-auto w-[280px] rounded-[44px] bg-[#1d1d1f] p-2.5 ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)] sm:w-[300px]">
        <div className="overflow-hidden rounded-[36px] bg-background">
          <div className="h-20 bg-[linear-gradient(135deg,#f3e7e3,#e9e4f1)]" />
          <div className="-mt-8 flex flex-col items-center gap-1 px-4 pb-4 text-center">
            <NicheIcon niche="nails" className="size-16 ring-4 ring-background" />
            <p className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">Studio Oksana</p>
            <p className="flex items-center gap-1 text-[11.5px] text-muted-foreground"><StarIcon className="size-3 fill-[#f5a623] text-[#f5a623]" />4.9 · {t("Manicure in Podil")}</p>
          </div>
          <div className="flex flex-col gap-2 px-3.5 pb-4">
            <div className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2.5 ring-2 ring-foreground">
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium">{t("Gel manicure")}</span>
                <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground"><ClockIcon className="size-3" />{t("{h} h {m} min", { h: 1, m: 30 })}</span>
              </span>
              <span className="text-[12.5px] font-semibold">600 ₴</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {times.map((tm, i) => (
                <span key={tm} className={cn("flex h-8 items-center justify-center rounded-lg text-[12px] font-medium tabular-nums ring-1",
                  i === 2 ? "bg-foreground text-background ring-foreground" : "bg-card ring-border")}>{tm}</span>
              ))}
            </div>
            <span className="mt-1 flex h-10 items-center justify-center rounded-xl bg-foreground text-[13px] font-semibold text-background">{t("Book now")}</span>
          </div>
        </div>
      </div>
      {/* the owner's side: the notice and the day */}
      <div className="absolute top-6 -left-2 z-20 hidden w-[230px] items-start gap-2.5 rounded-2xl bg-card/95 p-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] ring-1 ring-border backdrop-blur sm:flex lg:-left-16 [animation:toast-in_.6s_.4s_both]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#2aabee] text-white"><SendIcon className="size-4" /></span>
        <span className="min-w-0 text-[12px] leading-snug">
          <span className="block font-semibold">{t("New booking")}</span>
          <span className="text-muted-foreground">{t("Iryna · Gel manicure · tomorrow 13:00")}</span>
        </span>
      </div>
      <div className="absolute -right-2 bottom-8 z-20 hidden w-[220px] rounded-2xl bg-card/95 p-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] ring-1 ring-border backdrop-blur sm:block lg:-right-8 [animation:toast-in_.6s_.8s_both]">
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase">{t("Tomorrow")}</p>
        {[["10:00", t("Olena"), t("Pedicure")], ["13:00", t("Iryna"), t("Gel manicure")], ["16:00", t("Maria"), t("Extensions")]].map(([tm, name, what], i) => (
          <div key={tm} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px]", i === 1 && "bg-foreground/[0.06]")}>
            <span className="w-9 font-semibold tabular-nums">{tm}</span>
            <span className="min-w-0 flex-1 truncate"><span className="font-medium">{name}</span> <span className="text-muted-foreground">· {what}</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Who it's for ──

function Niches({ t }: { t: T }) {
  const items: { id: CrmNiche; title: string; text: string }[] = [
    { id: "nails", title: t("Nail masters"), text: t("Services with their time and price, free windows, regular clients and their history.") },
    { id: "barber", title: t("Barbershops"), text: t("Haircuts and beards by the slot, regulars at hand, no double bookings.") },
    { id: "cakes", title: t("Cakes to order"), text: t("Orders by day with the filling, weight and inscription, a board from new to delivered.") },
  ]
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className={cn(H, "max-w-2xl text-[36px] leading-[1.05] sm:text-[48px]")}>{t("Made for your trade, not for everyone.")}</h2>
        <p className="mt-4 max-w-xl text-[17px] text-muted-foreground">{t("Pick your business when you sign up, and Nodly sets itself up for it: the services, the words, the calendar or the order board.")}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map((n) => (
            <div key={n.id} className={cn(CARD, "flex flex-col gap-4 p-6")}>
              <NicheIcon niche={n.id} className="size-20" />
              <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{n.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ──

function How({ t }: { t: T }) {
  const steps = [
    { title: t("Pick your business"), text: t("Nails, barbershop or cakes. Starter services are added for you; change the prices to yours.") },
    { title: t("Make your page"), text: t("A photo, a few words, your work and contacts. Set the days and hours you take clients.") },
    { title: t("Put the link in your bio"), text: t("Clients open it, pick a service and a free time. You get a Telegram message and the booking is in the calendar.") },
  ]
  return (
    <section id="how" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className={cn(H, "text-[36px] leading-[1.05] sm:text-[48px]")}>{t("Three steps, five minutes.")}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className={cn(CARD, "flex flex-col gap-3 p-6")}>
              <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-[15px] font-semibold text-background tabular-nums">{i + 1}</span>
              <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── What's inside: a bento of the app's parts ──

function Features({ t }: { t: T }) {
  const small = [
    { icon: UsersIcon, title: t("Client base"), text: t("Every client with the phone, notes and visit history. Regulars are found by the phone on their own.") },
    { icon: BellIcon, title: t("Telegram notices"), text: t("A message for every new booking or order, at once, with the name, the service and the time.") },
    { icon: QrCodeIcon, title: t("QR code"), text: t("Print it on cards or put it at the counter: the camera opens your page.") },
    { icon: StarIcon, title: t("Reviews"), text: t("Clients leave them on your page, and new clients read them before they book.") },
  ]
  return (
    <section id="features" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className={cn(H, "max-w-2xl text-[36px] leading-[1.05] sm:text-[48px]")}>{t("Everything a small business needs. Nothing it doesn't.")}</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className={cn(CARD, "flex flex-col gap-4 p-7")}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground/[0.06]"><Link2Icon className="size-5" /></span>
            <h3 className="text-[24px] font-semibold tracking-[-0.02em]">{t("Your page with online booking")}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{t("Cover, photo, about you, your work, reviews and contacts, and booking right on it. Clients book 24/7, only into free times.")}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {["nodly.app/@studio.oksana", t("Book now")].map((x, i) => (
                <span key={x} className={cn("inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium", i ? "bg-foreground text-background" : "bg-foreground/[0.06]")}>{x}</span>
              ))}
            </div>
          </div>
          <div className={cn(CARD, "flex flex-col gap-4 p-7")}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground/[0.06]"><CalendarDaysIcon className="size-5" /></span>
            <h3 className="text-[24px] font-semibold tracking-[-0.02em]">{t("A calendar that fills itself")}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{t("The week at a glance, the day by the hour, the takings for today and the week. Cakes get a board: new, confirmed, baking, ready, delivered.")}</p>
            <div className="mt-auto grid grid-cols-7 gap-1.5 pt-2">
              {[2, 5, 3, 4, 6, 1, 0].map((n, i) => (
                <span key={i} className={cn("flex h-14 flex-col items-center justify-center rounded-xl text-[11px]", i === 1 ? "bg-foreground text-background" : "bg-foreground/[0.05] text-muted-foreground")}>
                  <span className="text-[15px] font-semibold tabular-nums">{12 + i}</span>{n ? `${n}` : "—"}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {small.map((f) => (
            <div key={f.title} className={cn(CARD, "flex flex-col gap-3 p-6")}>
              <f.icon className="size-5" strokeWidth={1.8} />
              <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Price: early access is free ──

function Price({ t, start, startLabel }: { t: T; start: string; startLabel: string }) {
  const included = [
    t("Your page with online booking"), t("Unlimited bookings and clients"), t("Calendar or order board"),
    t("Telegram notices"), t("QR code and statistics"), t("Works on the phone and the computer"),
  ]
  return (
    <section id="price" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className={cn(CARD, "grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_1fr] lg:items-center")}>
          <div className="flex flex-col items-start gap-5">
            <span className="rounded-full bg-foreground/[0.06] px-3 py-1 text-[13px] font-medium">{t("Early access")}</span>
            <h2 className={cn(H, "text-[40px] leading-[1.02] sm:text-[56px]")}>{t("Free while we grow.")}</h2>
            <p className="max-w-md text-[16px] leading-relaxed text-muted-foreground">{t("Everything is open and costs nothing while Nodly is in early access. We'll write well ahead before any plans appear, and the first masters will keep a good price.")}</p>
            <Cta href={start}>{startLabel}<ArrowRightIcon className="size-4" /></Cta>
          </div>
          <ul className="flex flex-col gap-3.5">
            {included.map((x) => (
              <li key={x} className="flex items-center gap-3 text-[16px]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><CheckIcon className="size-3.5" strokeWidth={2.5} /></span>
                {x}
              </li>
            ))}
          </ul>
        </div>
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
    <section className="py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <div className="flex -space-x-3">
          {(["nails", "barber", "cakes"] as CrmNiche[]).map((n) => <NicheIcon key={n} niche={n} className="size-14 ring-4 ring-background" />)}
        </div>
        <h2 className={cn(H, "text-[40px] leading-[1.02] sm:text-[56px]")}>{t("Your link is five minutes away.")}</h2>
        <p className="text-[17px] text-muted-foreground">{t("Sign up, pick your business and send the link to your first client today.")}</p>
        <Cta href={start}>{startLabel}<ArrowRightIcon className="size-4" /></Cta>
      </div>
    </section>
  )
}
