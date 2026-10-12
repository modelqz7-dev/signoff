"use client"

import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FIELD } from "@/components/crm/BookingDialog"
import type { Shop } from "@/components/dashboard/types"
import { cleanBooking, type BookingSettings } from "@/lib/booking"
import { normalizeSlug, pagePath, slugProblem } from "@/lib/page"
import type { NicheConfig } from "@/lib/niches"
import { supabase } from "@/lib/supabase"
import { siteOrigin } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

const LABEL = "text-[12.5px] font-medium text-muted-foreground"
/** Monday first, as people in Ukraine read a week; values are JavaScript's (0 = Sunday). */
const WEEK = [1, 2, 3, 4, 5, 6, 0]

const LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ё: "e", ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
}
/** "Студія Оксани" → "studiia-oksany"-like address to start from. */
function suggestSlug(name: string) {
  const latin = name.toLowerCase().split("").map((c) => LATIN[c] ?? c).join("")
  return normalizeSlug(latin.replace(/[\s.]+/g, "-")).replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30)
}

type PageRow = { slug: string; published: boolean }

/** The booking link's row in shop_pages, made and switched here. */
export function useBookingPage(shopId: string) {
  const [page, setPage] = useState<PageRow | null | undefined>(undefined)
  useEffect(() => {
    let off = false
    supabase.from("shop_pages").select("slug, published").eq("shop_id", shopId).maybeSingle()
      .then(({ data }) => { if (!off) setPage((data as PageRow) ?? null) })
    return () => { off = true }
  }, [shopId])
  return [page, setPage] as const
}

/** Online booking: the link clients book through, when they can book and a word about the business. */
export function OnlineBookingView({ shop, config, onShopChanged }: { shop: Shop; config: NicheConfig; onShopChanged: (shop: Shop) => void }) {
  const { t, locale } = useT()
  const isOrder = config.kind === "order"
  const [page, setPage] = useBookingPage(shop.id)
  const [settings, setSettings] = useState<BookingSettings>(() => cleanBooking(shop.booking))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) => { setSettings((s) => ({ ...s, [key]: value })); setSaved(false) }

  async function save() {
    setSaving(true)
    setError(null)
    // the owner's browser knows the business's time zone
    const booking = cleanBooking({ ...settings, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || settings.tz })
    const { error: e } = await supabase.from("shops").update({ booking }).eq("id", shop.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    setSettings(booking)
    onShopChanged({ ...shop, booking })
    setSaved(true)
  }

  const weekdayName = (d: number) => new Date(2024, 0, 7 + d).toLocaleDateString(locale, { weekday: "short" })

  return (
    <div className="flex max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">{t("Online booking")}</h1>
        <p className="text-[13.5px] text-muted-foreground">{isOrder ? t("Clients order through your link and the order lands on the board at once.") : t("Clients book through your link and the appointment lands in the calendar at once.")}</p>
      </div>

      <LinkCard shop={shop} page={page} onPage={setPage} />

      <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-[15px] font-semibold">{isOrder ? t("When you take orders") : t("When clients can book")}</h2>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Working days")}</span>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK.map((d) => {
              const on = settings.days.includes(d)
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => set("days", on ? settings.days.filter((x) => x !== d) : [...settings.days, d])}
                  className={cn("h-10 rounded-lg text-[13px] font-medium capitalize ring-1 transition-colors", on ? "bg-foreground text-background ring-foreground" : "ring-border text-muted-foreground hover:bg-hover")}>
                  {weekdayName(d)}
                </button>
              )
            })}
          </div>
        </div>

        {!isOrder && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("From")}</span>
              <input type="time" step={900} value={settings.from} onChange={(e) => set("from", e.target.value)} className={cn(FIELD, "[color-scheme:light] dark:[color-scheme:dark]")} /></label>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Until")}</span>
              <input type="time" step={900} value={settings.to} onChange={(e) => set("to", e.target.value)} className={cn(FIELD, "[color-scheme:light] dark:[color-scheme:dark]")} /></label>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Times every")}</span>
              <select value={settings.step} onChange={(e) => set("step", Number(e.target.value))} className={FIELD}>
                {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{t("{m} min", { m })}</option>)}
              </select></label>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Booking closes")}</span>
              <select value={settings.notice} onChange={(e) => set("notice", Number(e.target.value))} className={FIELD}>
                {[0, 1, 2, 3, 6, 12, 24, 48].map((h) => <option key={h} value={h}>{h ? t("{n} h before", { n: h }) : t("when it starts")}</option>)}
              </select></label>
          </div>
        )}
        {isOrder && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Earliest")}</span>
              <select value={settings.lead} onChange={(e) => set("lead", Number(e.target.value))} className={FIELD}>
                {[0, 1, 2, 3, 4, 5, 7, 10, 14].map((d) => <option key={d} value={d}>{d ? t("in {n} days", { n: d }) : t("the same day")}</option>)}
              </select></label>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Orders a day, at most")}</span>
              <select value={settings.perDay} onChange={(e) => set("perDay", Number(e.target.value))} className={FIELD}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
          </div>
        )}
        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Booking open for")}</span>
          <select value={settings.ahead} onChange={(e) => set("ahead", Number(e.target.value))} className={cn(FIELD, "sm:max-w-60")}>
            {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{t("{n} days ahead", { n: d })}</option>)}
          </select></label>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-[15px] font-semibold">{t("A word for clients")}</h2>
        <textarea value={settings.about} onChange={(e) => set("about", e.target.value.slice(0, 500))} rows={3}
          placeholder={isOrder ? t("e.g. Cakes from natural ingredients. Pickup at Lvivska 12 or delivery around the city.") : t("e.g. Studio at Khreshchatyk 10, 2nd floor. Sterile tools, coffee included.")}
          className={cn(FIELD, "h-auto resize-none py-2.5 leading-snug")} />
        <p className="text-[12px] text-muted-foreground">{t("Shown at the top of your booking page.")}</p>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onPress={save} isDisabled={saving || !settings.days.length || settings.to <= settings.from} className="h-10 rounded-full px-5">{saving ? t("Saving…") : t("Save")}</Button>
        {saved && <span className="flex items-center gap-1 text-[13px] text-muted-foreground"><CheckIcon className="size-4" />{t("Saved")}</span>}
        {!settings.days.length && <span className="text-[13px] text-muted-foreground">{t("Pick at least one day")}</span>}
      </div>
    </div>
  )
}

function LinkCard({ shop, page, onPage }: { shop: Shop; page: PageRow | null | undefined; onPage: (p: PageRow) => void }) {
  const { t } = useT()
  const [slug, setSlug] = useState(() => suggestSlug(shop.name) || "")
  const [check, setCheck] = useState<{ slug: string; ok: boolean; problem?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // is the address free? (asked as you type, once it's long enough)
  const wanted = normalizeSlug(slug)
  const problem = slugProblem(wanted)
  useEffect(() => {
    if (page || problem) return
    let off = false
    const id = window.setTimeout(() => {
      fetch(`/api/page/slug?slug=${encodeURIComponent(wanted)}`).then((r) => r.json())
        .then((r: { available: boolean; problem?: string }) => { if (!off) setCheck({ slug: wanted, ok: r.available, problem: r.problem }) })
        .catch(() => {})
    }, 350)
    return () => { off = true; window.clearTimeout(id) }
  }, [wanted, page, problem])

  if (page === undefined) return <section className="h-28 animate-pulse rounded-2xl bg-card ring-1 ring-border" />

  const url = page ? `${siteOrigin()}${pagePath(page.slug)}` : ""
  async function create() {
    setBusy(true)
    setError(null)
    const { error: e } = await supabase.from("shop_pages").insert({ shop_id: shop.id, slug: wanted, published: true, data: { title: shop.name, requests: false } })
    setBusy(false)
    if (e) { setError(e.code === "23505" ? t("This address is taken") : e.message); return }
    onPage({ slug: wanted, published: true })
  }
  async function toggle() {
    if (!page) return
    const published = !page.published
    onPage({ ...page, published })
    const { error: e } = await supabase.from("shop_pages").update({ published }).eq("shop_id", shop.id)
    if (e) { onPage(page); setError(e.message) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch {}
  }

  const free = !problem && check?.slug === wanted && check.ok
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <h2 className="text-[15px] font-semibold">{t("Your booking link")}</h2>
      {page ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(FIELD, "flex min-w-0 flex-1 items-center truncate font-medium", !page.published && "text-muted-foreground line-through")}>{url.replace(/^https?:\/\//, "")}</span>
            <Button onPress={copy} isDisabled={!page.published} className="h-10 gap-1.5 rounded-full px-4">{copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}{copied ? t("Copied") : t("Copy")}</Button>
            <a href={url} target="_blank" rel="noreferrer" aria-label={t("Open")} className="flex size-10 items-center justify-center rounded-full ring-1 ring-border hover:bg-hover"><ExternalLinkIcon className="size-4" /></a>
          </div>
          <label className="flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" checked={page.published} onChange={toggle} className="size-4 accent-foreground" />
            {page.published ? t("Booking is open") : t("Booking is closed: the link shows nothing")}
          </label>
          <p className="text-[12.5px] text-muted-foreground">{t("Put it in your Instagram bio and send it to clients in messages.")}</p>
        </>
      ) : (
        <>
          <p className="text-[13.5px] text-muted-foreground">{t("Pick an address. Clients will open it to book.")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(FIELD, "flex min-w-0 flex-1 items-center gap-0 pr-1")}>
              <span className="shrink-0 text-muted-foreground">{siteOrigin().replace(/^https?:\/\//, "")}/@</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} aria-label={t("Address")} maxLength={30} className="min-w-0 flex-1 bg-transparent font-medium outline-none" />
            </span>
            <Button onPress={create} isDisabled={busy || !free} className="h-10 rounded-full px-4">{busy ? t("Saving…") : t("Create the link")}</Button>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            {problem ? t(problem) : check?.slug !== wanted ? t("Checking…") : check.ok ? t("The address is free") : t(check.problem || "This address is taken")}
          </p>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}

/** The home screens' main button: copy the booking link, or set it up first. */
export function BookingLinkButton({ shopId }: { shopId: string }) {
  const { t } = useT()
  const [page] = useBookingPage(shopId)
  const [copied, setCopied] = useState(false)
  if (page === undefined) return <span className="h-9 w-40" />
  if (!page?.published) {
    return <a href="/online" className="flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background hover:opacity-90">{t("Set up online booking")}</a>
  }
  const url = `${siteOrigin()}${pagePath(page.slug)}`
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch {} }}
      title={url} className="flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background hover:opacity-90">
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}{copied ? t("Link copied") : t("Copy booking link")}
    </button>
  )
}
