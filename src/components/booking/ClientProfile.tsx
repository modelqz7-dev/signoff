"use client"

import Link from "next/link"
import { ArrowLeftIcon, ChevronRightIcon, StarIcon } from "lucide-react"
import { Logo } from "@/components/Logo"
import { TelegramIcon, TelegramSignIn } from "@/components/booking/TelegramSignIn"
import { useClientAccount, type ClientBooking } from "@/lib/client-account"
import { pagePath } from "@/lib/page"
import { useT } from "@/lib/i18n"
import { useNow } from "@/lib/use-now"

const FINISHED = new Set(["done", "delivered", "cancelled", "no_show"])
const STATUS: Record<string, string> = {
  booked: "Booked", done: "Came", no_show: "Didn't come", cancelled: "Cancelled",
  new: "New", confirmed: "Confirmed", in_progress: "In progress", ready: "Ready", delivered: "Handed over",
}

/** "My bookings": upcoming and past bookings at every business, a review after a visit, sign out. */
export function ClientProfile() {
  const { t, locale } = useT()
  const { loaded, account, bookings, signOut } = useClientAccount()
  const at = (b: ClientBooking) => (b.starts_at ? new Date(b.starts_at) : new Date(`${b.due_on}T${b.due_time || "12:00"}:00`))
  const now = useNow()
  const upcoming = bookings.filter((b) => !FINISHED.has(b.status) && at(b).getTime() >= now - 36e5).sort((a, b) => at(a).getTime() - at(b).getTime())
  const past = bookings.filter((b) => !upcoming.includes(b)).sort((a, b) => at(b).getTime() - at(a).getTime())
  const when = (b: ClientBooking) => at(b).toLocaleString(locale, { weekday: "short", day: "numeric", month: "long", ...(b.starts_at || b.due_time ? { hour: "2-digit", minute: "2-digit" } : {}) })

  const row = (b: ClientBooking, isPast: boolean) => (
    <div key={b.id} className="group flex items-center gap-3 pl-4">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/[0.06] text-[13px] font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {b.avatar ? <img src={b.avatar} alt="" className="size-full object-cover" /> : (b.business || "N").slice(0, 1).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-border py-3 pr-4 group-last:border-none">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{b.title}</span>
          <span className="block truncate text-[13px] text-muted-foreground first-letter:uppercase">{when(b)} · {b.business}</span>
          {isPast && <span className="text-[12.5px] text-muted-foreground">{t(STATUS[b.status] ?? b.status)}</span>}
        </span>
        {b.slug && isPast && (b.status === "done" || b.status === "delivered") && !b.reviewed ? (
          <Link href={`${pagePath(b.slug)}#reviews`} className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-foreground px-3 text-[12.5px] font-medium text-background"><StarIcon className="size-3.5" />{t("Review")}</Link>
        ) : b.slug ? (
          <Link href={pagePath(b.slug)} aria-label={b.business} className="flex shrink-0 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
            {isPast && t("Book again")}<ChevronRightIcon className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 pt-5">
        <Link href="/" className="flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="size-4" />{t("Catalog")}</Link>
        <Logo />
      </header>
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 pt-8 pb-16">
        <h1 className="text-[34px] leading-tight font-bold tracking-[-0.03em]">{t("My bookings")}</h1>
        {!loaded ? <p className="text-muted-foreground">{t("Loading...")}</p> : !account ? (
          <div className="flex flex-col gap-4 rounded-[22px] apple-card p-6">
            <p className="text-[15px] text-muted-foreground">{t("Sign in with Telegram to see your bookings at every master, book again in a tap and leave reviews after a visit.")}</p>
            <TelegramSignIn />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-[22px] apple-card px-4 py-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#2aabee] text-white"><TelegramIcon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{account.name || `@${account.username}`}</span>
                {account.username && <span className="block text-[13px] text-muted-foreground">@{account.username}</span>}
              </span>
              <button type="button" onClick={signOut} className="text-[13px] text-muted-foreground hover:text-destructive">{t("Sign out")}</button>
            </div>
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-[20px] font-bold tracking-[-0.02em]">{t("Upcoming")}</h2>
              {upcoming.length ? <div className="overflow-hidden rounded-[22px] apple-card">{upcoming.map((b) => row(b, false))}</div>
                : <p className="rounded-[22px] apple-card px-4 py-6 text-center text-[14px] text-muted-foreground">{t("No bookings ahead.")} <Link href="/" className="font-medium text-foreground underline underline-offset-2">{t("Find a master")}</Link></p>}
            </section>
            {past.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="px-1 text-[20px] font-bold tracking-[-0.02em]">{t("Past")}</h2>
                <div className="overflow-hidden rounded-[22px] apple-card">{past.map((b) => row(b, true))}</div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
