"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, CameraIcon, ChevronRightIcon, StarIcon } from "lucide-react"
import { Logo } from "@/components/Logo"
import { TelegramIcon, TelegramSignIn } from "@/components/booking/TelegramSignIn"
import { reloadClient, useClientAccount, type ClientAccount, type ClientBooking } from "@/lib/client-account"
import { shrinkImage } from "@/lib/image"
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
        <h1 className="text-[34px] leading-tight font-bold tracking-[-0.03em]">{account ? t("My profile") : t("My bookings")}</h1>
        {!loaded ? <p className="text-muted-foreground">{t("Loading...")}</p> : !account ? (
          <div className="flex flex-col gap-4 rounded-[22px] apple-card p-6">
            <p className="text-[15px] text-muted-foreground">{t("Sign in with Telegram to see your bookings at every master, book again in a tap and leave reviews after a visit.")}</p>
            <TelegramSignIn />
          </div>
        ) : (
          <>
            <ProfileCard account={account} onSignOut={signOut} />
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

const FIELD = "block w-full bg-transparent px-4 py-3 text-[16px] outline-none placeholder:text-muted-foreground"

/** The client's own card: photo, name, phone and a few words the master sees with each booking. */
function ProfileCard({ account, onSignOut }: { account: ClientAccount; onSignOut: () => void }) {
  const { t } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(account.name)
  const [phone, setPhone] = useState(account.phone ?? "")
  const [about, setAbout] = useState(account.about ?? "")
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [uploading, setUploading] = useState(false)
  const dirty = name !== account.name || phone !== (account.phone ?? "") || about !== (account.about ?? "")

  async function save() {
    if (!name.trim()) return
    setState("saving")
    const res = await fetch("/api/client/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, about }) }).catch(() => null)
    if (res?.ok) { await reloadClient(); setState("saved") } else setState("error")
  }

  async function upload(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return
    setUploading(true)
    const small = await shrinkImage(file, 600)
    const form = new FormData()
    form.set("file", small)
    const res = await fetch("/api/client/avatar", { method: "POST", body: form }).catch(() => null)
    if (res?.ok) await reloadClient()
    else setState("error")
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="group relative size-24 overflow-hidden rounded-full bg-foreground/[0.06]" aria-label={t("Change photo")}>
          {account.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={account.avatar_url} alt="" className="size-full object-cover" />
            : <span className="flex size-full items-center justify-center text-[32px] font-semibold">{(account.name || account.username || "?").slice(0, 1).toUpperCase()}</span>}
          <span className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity ${uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}><CameraIcon className="size-6" /></span>
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="text-[14px] font-medium">{uploading ? t("Uploading…") : t("Change photo")}</button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = "" }} />
        {account.username && <span className="flex items-center gap-1 text-[13px] text-muted-foreground"><TelegramIcon className="size-3.5 text-[#2aabee]" />@{account.username}</span>}
      </div>

      <div className="overflow-hidden rounded-[22px] apple-card [&>*+*]:border-t [&>*+*]:border-border">
        <label className="block"><span className="block px-4 pt-2.5 text-[12px] text-muted-foreground">{t("Your name")}</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setState("idle") }} maxLength={120} className={`${FIELD} pt-0.5`} /></label>
        <label className="block"><span className="block px-4 pt-2.5 text-[12px] text-muted-foreground">{t("Phone")}</span>
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setState("idle") }} type="tel" placeholder="+380 __ ___ __ __" maxLength={40} className={`${FIELD} pt-0.5`} /></label>
        <label className="block"><span className="block px-4 pt-2.5 text-[12px] text-muted-foreground">{t("About me")}</span>
          <textarea value={about} onChange={(e) => { setAbout(e.target.value); setState("idle") }} rows={3} maxLength={500} placeholder={t("What the master should know: allergies, wishes, how you like it.")} className={`${FIELD} resize-none pt-0.5 leading-snug`} /></label>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || !name.trim() || state === "saving"}
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-foreground text-[15px] font-semibold text-background disabled:opacity-35">
          {state === "saving" ? t("Saving…") : state === "saved" && !dirty ? t("Saved") : t("Save")}
        </button>
        <button type="button" onClick={onSignOut} className="h-11 rounded-full px-4 text-[14px] text-muted-foreground hover:text-destructive">{t("Sign out")}</button>
      </div>
      {state === "error" && <p className="text-center text-[13px] text-destructive">{t("Couldn't save. Try again.")}</p>}
    </div>
  )
}
