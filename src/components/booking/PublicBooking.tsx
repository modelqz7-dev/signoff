"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, CheckIcon, ChevronRightIcon, ImagePlusIcon, XIcon } from "lucide-react"
import { shrinkImage } from "@/lib/image"
import { NICHES, type CrmNiche } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { NicheIcon } from "@/components/crm/NicheIcon"
import { useT } from "@/lib/i18n"

export type PublicService = { id: string; title: string; duration_min: number | null; price: number | null; price_from: boolean; unit: string }

type Availability = { kind: "appointment"; slots: Record<string, string[]> } | { kind: "order"; days: string[] }

/** A field inside an inset form: no box of its own, the card is the box. */
const ROW = "block h-[50px] w-full bg-transparent px-4 text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
const FIELD = "h-12 w-full rounded-[14px] bg-card px-4 text-[15px] text-foreground outline-none ring-1 ring-transparent placeholder:text-muted-foreground focus:ring-foreground/25"

function money(v: number | null, locale: string) {
  if (v == null) return ""
  return new Intl.NumberFormat(locale, { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(v)
}

/** A business's booking page (/@name): pick a service, a free time or a day, leave a name, a way to reach you and maybe a photo. */
export function PublicBooking({ slug, title, avatar, about, niche, services, embedded = false, preview = false }: {
  slug: string
  title: string
  avatar: string | null
  about: string
  niche: CrmNiche
  services: PublicService[]
  /** Inside the business's page (its Booking section): just the steps, no header or footer. */
  embedded?: boolean
  /** The page editor's live copy: services can be picked, nothing is fetched or sent. */
  preview?: boolean
}) {
  const { t, locale } = useT()
  const config = NICHES.find((n) => n.id === niche)!
  const isOrder = config.kind === "order"
  const [service, setService] = useState<PublicService | null>(services.length === 1 ? services[0] : null)
  const [open, setOpen] = useState<Availability | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, string>>({})
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [company, setCompany] = useState("")
  // how to reach the client, and reference photos (a sketch, a cake they liked)
  const [way, setWay] = useState<"telegram" | "viber" | "phone">("telegram")
  const [nick, setNick] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const photoUrls = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => photoUrls.forEach((u) => URL.revokeObjectURL(u)), [photoUrls])
  const photoInput = useRef<HTMLInputElement>(null)
  async function addPhotos(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith("image/") && f.type !== "image/svg+xml" && f.type !== "image/gif")
    const small = await Promise.all(picked.slice(0, 3 - photos.length).map((f) => shrinkImage(f, 1600)))
    setPhotos((p) => [...p, ...small.filter((f) => f.size <= 4 * 1024 * 1024)].slice(0, 3))
  }
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // past the time (or an order's details): on to the contacts
  const [who, setWho] = useState(false)
  // bumped to fetch the free times again, e.g. after a time was taken meanwhile
  const [reload, setReload] = useState(0)

  // the free times of the chosen service
  const serviceId = service?.id
  useEffect(() => {
    if (!serviceId || preview) return
    let off = false
    fetch(`/api/book/${encodeURIComponent(slug)}?service=${serviceId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((a: Availability) => {
        if (off) return
        setOpen(a)
        setLoadError(null)
        const first = a.kind === "appointment" ? Object.keys(a.slots)[0] : a.days[0]
        setDay((d) => d ?? first ?? null)
      })
      .catch(() => { if (!off) setLoadError(t("Couldn't load free times. Refresh the page.")) })
    return () => { off = true }
  }, [serviceId, slug, t, reload, preview])

  const days = open ? (open.kind === "appointment" ? Object.keys(open.slots) : open.days) : []
  const times = open?.kind === "appointment" && day ? open.slots[day] ?? [] : []
  const dayLabel = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, opts)
  const ready = !!service && !!day && (isOrder || !!time) && name.trim().length > 0 && phone.replace(/\D/g, "").length >= 9

  const duration = (min: number) => {
    const h = Math.floor(min / 60), m = min % 60
    return !h ? t("{m} min", { m }) : m ? t("{h} h {m} min", { h, m }) : t("{h} h", { h })
  }

  function pick(s: PublicService) {
    if (preview) return
    setService(s); setOpen(null); setDay(null); setTime(null); setError(null); setWho(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || !service || !day) return
    setSending(true)
    setError(null)
    const form = new FormData()
    for (const [k, v] of Object.entries({ service: service.id, day, time: time ?? details.time ?? "", name, phone, note, company, contact: way, telegram: way === "telegram" ? nick : "" })) form.set(k, v)
    form.set("details", JSON.stringify(details))
    photos.forEach((f) => form.append("files", f))
    const res = await fetch(`/api/book/${encodeURIComponent(slug)}`, { method: "POST", body: form }).catch(() => null)
    setSending(false)
    if (res?.ok) { setDone(true); return }
    const code = res ? ((await res.json().catch(() => ({}))) as { error?: string }).error : null
    if (code === "taken") {
      setError(isOrder ? t("That day just filled up. Pick another one.") : t("Someone just took that time. Pick another one."))
      setTime(null)
      setOpen(null)
      setReload((n) => n + 1)
    } else if (code === "slow_down") setError(t("Too many attempts. Try again in a few minutes."))
    else setError(t("Couldn't book. Check the name and phone and try again."))
  }

  const summary = useMemo(() => {
    if (!service || !day) return ""
    const d = dayLabel(day, { weekday: "long", day: "numeric", month: "long" })
    return isOrder ? `${service.title} · ${d}` : `${service.title} · ${d}, ${time}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, day, time, isOrder, locale])

  // one step at a time, like an iOS sheet: what, then when (and the order's details), then who
  const stage: "what" | "when" | "who" = !service ? "what" : who && day && (isOrder || time) ? "who" : "when"
  const stepNo = stage === "what" ? 1 : stage === "when" ? 2 : 3
  const back = () => {
    setError(null)
    if (stage === "who") setWho(false)
    else if (stage === "when" && services.length > 1) { setService(null); setOpen(null); setDay(null); setTime(null) }
  }
  const canBack = stage === "who" || (stage === "when" && services.length > 1)
  const choice = (on: boolean) => cn("transition-colors", on ? "bg-foreground text-background" : "bg-card hover:bg-hover")

  const steps = done ? (
    <section className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-foreground text-background"><CheckIcon className="size-8" /></span>
      <h2 className="text-[22px] font-bold tracking-[-0.02em]">{isOrder ? t("Order sent!") : t("You're booked!")}</h2>
      <p className="text-[15px] first-letter:uppercase">{summary}</p>
      <p className="text-[15px] text-muted-foreground">{isOrder ? t("{name} will get in touch to confirm the details and the price.", { name: title }) : t("{name} will contact you if anything changes.", { name: title })}</p>
    </section>
  ) : (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* where we are: back, the step's name, and which of three it is */}
      <div className="flex items-center gap-2">
        {canBack && (
          <button type="button" onClick={back} aria-label={t("Back")} className="-ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-hover"><ArrowLeftIcon className="size-[18px]" /></button>
        )}
        <h2 className="min-w-0 flex-1 text-[17px] font-semibold">
          {stage === "what" ? (isOrder ? t("What would you like?") : t("Choose a service")) : stage === "when" ? (isOrder ? t("For which day?") : t("Day and time")) : t("Your contacts")}
        </h2>
        <span className="flex shrink-0 gap-1" aria-label={t("Step {n} of {m}", { n: stepNo, m: 3 })}>
          {[1, 2, 3].map((n) => <span key={n} className={cn("h-1.5 rounded-full transition-all", n === stepNo ? "w-4 bg-foreground" : "w-1.5 bg-foreground/20")} />)}
        </span>
      </div>

      {/* the chosen service, small, once past the first step */}
      {service && stage !== "what" && (
        <div className="flex items-center gap-3 rounded-[18px] bg-card px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{service.title}</span>
            <span className="block text-[13px] text-muted-foreground first-letter:uppercase">
              {stage === "who" && summary ? summary.slice(service.title.length + 3) : [!isOrder && service.duration_min ? duration(service.duration_min) : "", service.price != null ? `${service.price_from ? `${t("from")} ` : ""}${money(service.price, locale)}` : ""].filter(Boolean).join(" · ")}
            </span>
          </span>
          {services.length > 1 && stage === "when" && (
            <button type="button" onClick={back} className="shrink-0 text-[14px] font-medium text-muted-foreground hover:text-foreground">{t("Change")}</button>
          )}
        </div>
      )}

      {/* 1. what: one inset list */}
      {stage === "what" && (services.length ? (
        <div className="overflow-hidden rounded-[22px] bg-card">
          {services.map((s) => (
            <button key={s.id} type="button" onClick={() => pick(s)}
              className="group flex w-full items-center gap-3 pl-4 text-left active:bg-hover">
              <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-border py-3.5 pr-4 group-last:border-none">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] leading-snug">{s.title}</span>
                  {!isOrder && s.duration_min && <span className="mt-0.5 block text-[13px] text-muted-foreground">{duration(s.duration_min)}</span>}
                </span>
                {s.price != null && (
                  <span className="shrink-0 text-[15px] text-muted-foreground tabular-nums">
                    {s.price_from ? `${t("from")} ` : ""}{money(s.price, locale)}{s.unit ? ` / ${s.unit}` : ""}
                  </span>
                )}
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground opacity-60" />
              </span>
            </button>
          ))}
        </div>
      ) : <p className="rounded-[22px] bg-card px-4 py-8 text-center text-[15px] text-muted-foreground">{t("Booking isn't open yet.")}</p>)}

      {/* 2. when */}
      {stage === "when" && (
        <section className="flex flex-col gap-3">
          {loadError ? <p className="text-[14px] text-destructive">{loadError}</p>
            : !open ? <p className="py-6 text-center text-[14px] text-muted-foreground">{t("Loading...")}</p>
            : !days.length ? <p className="rounded-[22px] bg-card px-4 py-8 text-center text-[15px] text-muted-foreground">{t("No free days in the coming weeks. Write to us and we'll find a time.")}</p>
            : (
              <>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
                  {days.map((d) => (
                    <button key={d} type="button" onClick={() => { setDay(d); setTime(null) }}
                      className={cn("flex w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-[16px] py-2.5", choice(day === d))}>
                      <span className={cn("text-[11px] font-medium uppercase", day === d ? "opacity-70" : "text-muted-foreground")}>{dayLabel(d, { weekday: "short" })}</span>
                      <span className="text-[20px] font-semibold tabular-nums">{dayLabel(d, { day: "numeric" })}</span>
                      <span className={cn("text-[11px]", day === d ? "opacity-70" : "text-muted-foreground")}>{dayLabel(d, { month: "short" })}</span>
                    </button>
                  ))}
                </div>
                {!isOrder && day && (
                  <div className="grid grid-cols-4 gap-2">
                    {times.map((tm) => (
                      <button key={tm} type="button" onClick={() => { setTime(tm); setWho(true) }}
                        className={cn("h-11 rounded-full text-[15px] font-medium tabular-nums", choice(time === tm))}>{tm}</button>
                    ))}
                  </div>
                )}
              </>
            )}

          {error && <p className="px-1 text-[14px] text-destructive">{error}</p>}

          {/* an order's details, under its day */}
          {isOrder && day && config.orderFields && (
            <>
              {config.orderFields.filter((f) => !f.when || details[f.when.key] === f.when.value).map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="px-1 text-[13px] text-muted-foreground">{t(f.label)}</span>
                  {f.type === "choice" ? (
                    <div role="radiogroup" aria-label={t(f.label)} className="grid h-11 grid-cols-2 gap-1 rounded-full bg-foreground/[0.06] p-1">
                      {f.options!.map((o) => (
                        <button key={o} type="button" role="radio" aria-checked={details[f.key] === o} onClick={() => setDetails((d) => ({ ...d, [f.key]: o }))}
                          className={cn("rounded-full text-[14px] font-medium transition-colors", details[f.key] === o ? "bg-card shadow-sm" : "text-muted-foreground")}>
                          {t(o)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input value={details[f.key] ?? ""} onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                      inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.placeholder ? t(f.placeholder) : ""} maxLength={300} className={FIELD} />
                  )}
                </label>
              ))}
              <button type="button" onClick={() => setWho(true)}
                className="mt-1 flex h-[52px] items-center justify-center rounded-full bg-foreground text-[17px] font-semibold text-background">{t("Next")}</button>
            </>
          )}
        </section>
      )}

      {/* 3. who: an inset form */}
      {stage === "who" && (
        <section className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[22px] bg-card [&>*+*]:border-t [&>*+*]:border-border">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name")} autoComplete="name" maxLength={80} className={ROW} aria-label={t("Your name")} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380 __ ___ __ __" type="tel" autoComplete="tel" maxLength={40} className={ROW} aria-label={t("Phone")} />
            {way === "telegram" && (
              <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder={t("@username in Telegram (optional)")} maxLength={40} className={ROW} aria-label="Telegram" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-[13px] text-muted-foreground">{t("How should we reach you?")}</span>
            <div role="radiogroup" aria-label={t("How should we reach you?")} className="grid h-11 grid-cols-3 gap-1 rounded-full bg-foreground/[0.06] p-1">
              {([["telegram", "Telegram"], ["viber", "Viber"], ["phone", t("Phone call")]] as const).map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={way === id} onClick={() => setWay(id)}
                  className={cn("rounded-full text-[14px] font-medium transition-colors", way === id ? "bg-card shadow-sm" : "text-muted-foreground")}>{label}</button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[22px] bg-card">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={isOrder ? t("Your wishes, if you'd like") : t("A comment, if you'd like")}
              className="block w-full resize-none bg-transparent px-4 py-3.5 text-[16px] leading-snug outline-none placeholder:text-muted-foreground" />
            {/* a reference: the tattoo sketch, the cake they liked, the nails they want */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
              {photoUrls.map((u, i) => (
                <span key={u} className="relative size-16 overflow-hidden rounded-[14px] bg-hover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="size-full object-cover" />
                  <button type="button" aria-label={t("Remove")} onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"><XIcon className="size-3" /></button>
                </span>
              ))}
              {photos.length < 3 && (
                <button type="button" onClick={() => photoInput.current?.click()}
                  className={cn("flex items-center gap-2 rounded-[14px] text-[15px] text-muted-foreground hover:text-foreground", photos.length ? "size-16 justify-center bg-hover" : "h-10 px-1")}>
                  <ImagePlusIcon className="size-[18px]" />{!photos.length && t("Attach a photo or sketch")}
                </button>
              )}
              <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = "" }} />
            </div>
          </div>
          {/* a field people don't see; bots fill it in */}
          <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="company" />
          {error && <p className="px-1 text-[14px] text-destructive">{error}</p>}
          <button type="submit" disabled={!ready || sending}
            className="flex h-[52px] items-center justify-center rounded-full bg-foreground text-[17px] font-semibold text-background transition-opacity disabled:opacity-35">
            {sending ? t("Sending…") : isOrder ? t("Place the order") : t("Book now")}
          </button>
        </section>
      )}
    </form>
  )

  if (embedded) return steps
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        {avatar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={avatar} alt="" className="size-20 rounded-full object-cover ring-1 ring-border" />
          : <NicheIcon niche={niche} className="size-20" />}
        <div>
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">{title}</h1>
          <p className="text-[14px] text-muted-foreground">{t(config.name)}</p>
        </div>
        {about && <p className="max-w-md text-[14.5px] leading-relaxed whitespace-pre-line text-muted-foreground">{about}</p>}
      </header>

      {steps}

      <p className="mt-auto pt-4 text-center text-[12px] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("Booking by Nodly")}</Link>
      </p>
    </div>
  )
}
