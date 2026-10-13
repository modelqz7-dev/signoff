"use client"

import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon, QrCodeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FIELD } from "@/components/crm/BookingDialog"
import type { Shop } from "@/components/dashboard/types"
import { cleanBooking, type BookingSettings } from "@/lib/booking"
import { cleanPage, normalizeSlug, pagePath, slugProblem, type PageData } from "@/lib/page"
import { PageProfile, QrDialog } from "@/components/crm/PageProfile"
import type { NicheConfig } from "@/lib/niches"
import { supabase } from "@/lib/supabase"
import { siteOrigin } from "@/lib/site"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { Picker, TimePicker, Toggle } from "@/components/crm/Pickers"

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

type PageRow = { slug: string; published: boolean; data: PageData }

/** The page's row in shop_pages (its address, whether it's open and how it looks), made and changed here. */
export function useBookingPage(shopId: string) {
  const [page, setPage] = useState<PageRow | null | undefined>(undefined)
  useEffect(() => {
    let off = false
    supabase.from("shop_pages").select("slug, published, data").eq("shop_id", shopId).maybeSingle()
      .then(({ data }) => { if (!off) setPage(data ? { slug: data.slug, published: data.published, data: cleanPage(data.data) } : null) })
    return () => { off = true }
  }, [shopId])
  return [page, setPage] as const
}

/**
 * My page: the one link a business gives out (/@name). On it clients see the photo, the contacts,
 * the work and links, and book; here the owner sets how it looks and when clients can book.
 */
export function OnlineBookingView({ shop, config, onShopChanged }: { shop: Shop; config: NicheConfig; onShopChanged: (shop: Shop) => void }) {
  const { t, locale } = useT()
  const isOrder = config.kind === "order"
  const [page, setPage] = useBookingPage(shop.id)
  const [tab, setTab] = useState<"page" | "booking">("page")
  const [settings, setSettings] = useState<BookingSettings>(() => cleanBooking(shop.booking))
  // the page's look, edited here and saved with the hours; the old "word for clients" becomes its About
  const [look, setLook] = useState<PageData | null>(null)
  const [lookFor, setLookFor] = useState<string | null>(null)
  if (page && lookFor !== page.slug) {
    setLookFor(page.slug)
    setLook({ ...page.data, title: page.data.title || shop.name, bio: page.data.bio || cleanBooking(shop.booking).about })
  }
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) => { setSettings((s) => ({ ...s, [key]: value })); setDirty(true); setSaved(false) }
  const change = (patch: Partial<PageData>) => { setLook((d) => (d ? { ...d, ...patch } : d)); setDirty(true); setSaved(false) }

  async function save() {
    setSaving(true)
    setError(null)
    // the owner's browser knows the business's time zone; the word for clients lives in the page now
    const booking = cleanBooking({ ...settings, about: look ? "" : settings.about, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || settings.tz })
    const data = look ? cleanPage({ ...look, requests: false }, shop.name) : null
    const [{ error: e1 }, res2] = await Promise.all([
      supabase.from("shops").update({ booking }).eq("id", shop.id),
      data ? supabase.from("shop_pages").update({ data, updated_at: new Date().toISOString() }).eq("shop_id", shop.id) : Promise.resolve({ error: null }),
    ])
    setSaving(false)
    const e = e1 || res2.error
    if (e) { setError(e.message); return }
    setSettings(booking)
    onShopChanged({ ...shop, booking })
    if (data && page) { setPage({ ...page, data }); setLook(data) }
    setDirty(false)
    setSaved(true)
  }

  const weekdayName = (d: number) => new Date(2024, 0, 7 + d).toLocaleDateString(locale, { weekday: "short" })
  const canSave = !saving && dirty && settings.days.length > 0 && settings.to > settings.from

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-5 pb-28 sm:p-8 sm:pb-28">
      <div>
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">{t("My page")}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{isOrder ? t("One link for your bio: your work, contacts and ordering. Orders land on the board at once.") : t("One link for your bio: your work, contacts and booking. Appointments land in the calendar at once.")}</p>
      </div>

      <LinkCard shop={shop} page={page} onPage={(p) => { setPage(p); if (!page && p) { setLookFor(p.slug); setLook({ ...p.data, title: p.data.title || shop.name, bio: p.data.bio || settings.about }); setDirty(!!settings.about) } }} />

      {page && (
        <div role="tablist" className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-foreground/[0.05] p-1">
          {([["page", t("Page")], ["booking", isOrder ? t("Ordering") : t("Booking")]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn("rounded-lg text-[14px] font-medium transition-colors", tab === id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
      )}

      {page && look && tab === "page" && <PageProfile shopId={shop.id} niche={config.id} data={look} onChange={change} />}

      {(!page || tab === "booking") && <section className="flex flex-col gap-4 rounded-[22px] apple-card p-4">
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
            <div className="flex flex-col gap-1.5"><span className={LABEL}>{t("From")}</span>
              <TimePicker value={settings.from} onChange={(v) => v && set("from", v)} label={t("From")} step={15} /></div>
            <div className="flex flex-col gap-1.5"><span className={LABEL}>{t("Until")}</span>
              <TimePicker value={settings.to} onChange={(v) => v && set("to", v)} label={t("Until")} step={15} /></div>
            <div className="flex flex-col gap-1.5"><span className={LABEL}>{t("Times every")}</span>
              <Picker value={settings.step} onChange={(v) => set("step", v)} label={t("Times every")}
                options={[15, 20, 30, 45, 60].map((m) => ({ value: m, label: t("{m} min", { m }) }))} /></div>
            <div className="flex flex-col gap-1.5"><span className={LABEL}>{t("Booking closes")}</span>
              <Picker value={settings.notice} onChange={(v) => set("notice", v)} label={t("Booking closes")}
                options={[0, 1, 2, 3, 6, 12, 24, 48].map((h) => ({ value: h, label: h ? t("{n} h before", { n: h }) : t("when it starts") }))} /></div>
          </div>
        )}
        {isOrder && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><span className={LABEL}>{t("Earliest")}</span>
              <Picker value={settings.lead} onChange={(v) => set("lead", v)} label={t("Earliest")}
                options={[0, 1, 2, 3, 4, 5, 7, 10, 14].map((d) => ({ value: d, label: d ? t("in {n} days", { n: d }) : t("the same day") }))} /></div>
            <div className="flex flex-col gap-1.5"><span className={LABEL}>{t("Orders a day, at most")}</span>
              <Picker value={settings.perDay} onChange={(v) => set("perDay", v)} label={t("Orders a day, at most")}
                options={[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))} /></div>
          </div>
        )}
        <div className="flex flex-col gap-1.5"><span className={LABEL}>{t("Booking open for")}</span>
          <Picker value={settings.ahead} onChange={(v) => set("ahead", v)} label={t("Booking open for")} className="sm:max-w-60"
            options={[7, 14, 30, 60, 90].map((d) => ({ value: d, label: t("{n} days ahead", { n: d }) }))} /></div>
      </section>}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {/* one save for the look and the hours, at hand while scrolling */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 lg:pl-[120px]" style={{ pointerEvents: "none" }}>
        <div className={cn("flex items-center gap-3 rounded-full bg-card py-2 pr-2 pl-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-1 ring-border transition-all duration-300",
          dirty || saved ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0")} style={{ pointerEvents: dirty || saved ? "auto" : "none" }}>
          <span className="text-[13.5px] text-muted-foreground">
            {!settings.days.length ? t("Pick at least one day") : saved && !dirty ? <span className="flex items-center gap-1"><CheckIcon className="size-4" />{t("Saved")}</span> : t("Unsaved changes")}
          </span>
          <Button onPress={save} isDisabled={!canSave} className="h-9 rounded-full px-5">{saving ? t("Saving…") : t("Save")}</Button>
        </div>
      </div>
    </div>
  )
}

/** How many times the page was opened in the last 7 days (null until known). */
function useWeekViews(shopId: string, enabled: boolean) {
  const [views, setViews] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    let off = false
    const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    supabase.from("page_views").select("count").eq("shop_id", shopId).gte("day", since)
      .then(({ data, error }) => { if (!off && !error) setViews(((data as { count: number }[]) ?? []).reduce((n, r) => n + (r.count || 0), 0)) })
    return () => { off = true }
  }, [shopId, enabled])
  return views
}

function LinkCard({ shop, page, onPage }: { shop: Shop; page: PageRow | null | undefined; onPage: (p: PageRow) => void }) {
  const { t } = useT()
  const [slug, setSlug] = useState(() => suggestSlug(shop.name) || "")
  const [check, setCheck] = useState<{ slug: string; ok: boolean; problem?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState(false)
  const views = useWeekViews(shop.id, !!page)

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

  if (page === undefined) return <section className="h-28 animate-pulse rounded-[22px] apple-card" />

  const url = page ? `${siteOrigin()}${pagePath(page.slug)}` : ""
  async function create() {
    setBusy(true)
    setError(null)
    const { error: e } = await supabase.from("shop_pages").insert({ shop_id: shop.id, slug: wanted, published: true, data: { title: shop.name, requests: false } })
    setBusy(false)
    if (e) { setError(e.code === "23505" ? t("This address is taken") : e.message); return }
    onPage({ slug: wanted, published: true, data: cleanPage({ title: shop.name, requests: false }, shop.name) })
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
    <section className="flex flex-col gap-3 rounded-[22px] apple-card p-4">
      <h2 className="text-[15px] font-semibold">{t("Your booking link")}</h2>
      {page ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(FIELD, "flex min-w-0 flex-1 items-center truncate font-medium", !page.published && "text-muted-foreground line-through")}>{url.replace(/^https?:\/\//, "")}</span>
            <Button onPress={copy} isDisabled={!page.published} className="h-10 gap-1.5 rounded-full px-5 text-[14px]">{copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}{copied ? t("Copied") : t("Copy")}</Button>
            <a href={url} target="_blank" rel="noreferrer" aria-label={t("Open")} title={t("Open")} className="flex size-10 items-center justify-center rounded-full ring-1 ring-border hover:bg-hover"><ExternalLinkIcon className="size-4" /></a>
            <button type="button" onClick={() => setQr(true)} aria-label={t("QR code")} title={t("QR code")} className="flex size-10 items-center justify-center rounded-full ring-1 ring-border hover:bg-hover"><QrCodeIcon className="size-4" /></button>
          </div>
          <QrDialog url={url} slug={page.slug} open={qr} onClose={() => setQr(false)} />
          {views != null && <p className="text-[13px] text-muted-foreground">{t("Opened {n} times in the last 7 days", { n: views })}</p>}
          <Toggle checked={page.published} onChange={toggle}>
            {page.published ? t("Booking is open") : t("Booking is closed: the link shows nothing")}
          </Toggle>
          <p className="text-[12.5px] text-muted-foreground">{t("Put it in your Instagram bio and send it to clients in messages.")}</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-[15px] text-muted-foreground">{t("Pick an address. Clients will open it to book.")}</p>
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
