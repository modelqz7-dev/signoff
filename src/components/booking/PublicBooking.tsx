"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, CheckIcon, ClockIcon } from "lucide-react"
import { NICHES, type CrmNiche } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { NicheIcon } from "@/components/crm/NicheIcon"
import { useT } from "@/lib/i18n"

export type PublicService = { id: string; title: string; duration_min: number | null; price: number | null; price_from: boolean; unit: string }

type Availability = { kind: "appointment"; slots: Record<string, string[]> } | { kind: "order"; days: string[] }

const FIELD = "h-12 w-full rounded-xl bg-foreground/[0.05] px-4 text-[15px] text-foreground outline-none ring-1 ring-transparent placeholder:text-muted-foreground focus:ring-foreground/25"

function money(v: number | null, locale: string) {
  if (v == null) return ""
  return new Intl.NumberFormat(locale, { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(v)
}

/** A business's booking page (/@name): pick a service, a free time or a day, leave a name and phone. */
export function PublicBooking({ slug, title, avatar, about, niche, services }: {
  slug: string
  title: string
  avatar: string | null
  about: string
  niche: CrmNiche
  services: PublicService[]
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
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // bumped to fetch the free times again, e.g. after a time was taken meanwhile
  const [reload, setReload] = useState(0)

  // the free times of the chosen service
  const serviceId = service?.id
  useEffect(() => {
    if (!serviceId) return
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
  }, [serviceId, slug, t, reload])

  const days = open ? (open.kind === "appointment" ? Object.keys(open.slots) : open.days) : []
  const times = open?.kind === "appointment" && day ? open.slots[day] ?? [] : []
  const dayLabel = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, opts)
  const ready = !!service && !!day && (isOrder || !!time) && name.trim().length > 0 && phone.replace(/\D/g, "").length >= 9

  const duration = (min: number) => {
    const h = Math.floor(min / 60), m = min % 60
    return !h ? t("{m} min", { m }) : m ? t("{h} h {m} min", { h, m }) : t("{h} h", { h })
  }

  function pick(s: PublicService) {
    setService(s); setOpen(null); setDay(null); setTime(null); setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || !service || !day) return
    setSending(true)
    setError(null)
    const res = await fetch(`/api/book/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ service: service.id, day, time: time ?? details.time ?? "", name, phone, note, details, company }),
    }).catch(() => null)
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

      {done ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl apple-card px-6 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-foreground text-background"><CheckIcon className="size-7" /></span>
          <h2 className="text-[20px] font-semibold">{isOrder ? t("Order sent!") : t("You're booked!")}</h2>
          <p className="text-[15px] first-letter:uppercase">{summary}</p>
          <p className="mt-1 text-[15px] text-muted-foreground">{isOrder ? t("{name} will get in touch to confirm the details and the price.", { name: title }) : t("{name} will contact you if anything changes.", { name: title })}</p>
        </section>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-6">
          {/* 1. what */}
          <section className="flex flex-col gap-2.5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              {service && services.length > 1 && (
                <button type="button" onClick={() => setService(null)} aria-label={t("Back")} className="-ml-1 flex size-7 items-center justify-center rounded-full hover:bg-hover"><ArrowLeftIcon className="size-4" /></button>
              )}
              {isOrder ? t("What would you like?") : t("Choose a service")}
            </h2>
            {(service ? [service] : services).map((s) => (
              <button key={s.id} type="button" onClick={() => pick(s)} aria-pressed={service?.id === s.id}
                className={cn("flex items-center gap-3 rounded-[20px] bg-card px-4 py-4 text-left shadow-[var(--card-shadow)] ring-1 transition-all duration-300",
                  service?.id === s.id ? "ring-2 ring-foreground" : "ring-border hover:ring-foreground/30")}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{s.title}</span>
                  {!isOrder && s.duration_min && (
                    <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground"><ClockIcon className="size-3.5" />
                      {duration(s.duration_min)}
                    </span>
                  )}
                </span>
                {s.price != null && (
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                    {s.price_from ? `${t("from")} ` : ""}{money(s.price, locale)}{s.unit ? <span className="font-normal text-muted-foreground"> / {s.unit}</span> : null}
                  </span>
                )}
              </button>
            ))}
            {!services.length && <p className="rounded-[22px] apple-card px-4 py-6 text-center text-[14px] text-muted-foreground">{t("Booking isn't open yet.")}</p>}
          </section>

          {/* 2. when */}
          {service && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-[15px] font-semibold">{isOrder ? t("For which day?") : t("Day and time")}</h2>
              {loadError ? <p className="text-[14px] text-destructive">{loadError}</p>
                : !open ? <p className="text-[14px] text-muted-foreground">{t("Loading...")}</p>
                : !days.length ? <p className="rounded-[22px] apple-card px-4 py-6 text-center text-[14px] text-muted-foreground">{t("No free days in the coming weeks. Write to us and we'll find a time.")}</p>
                : (
                  <>
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                      {days.map((d) => (
                        <button key={d} type="button" onClick={() => { setDay(d); setTime(null) }}
                          className={cn("flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl py-2.5 ring-1 transition-colors",
                            day === d ? "bg-foreground text-background ring-foreground" : "bg-card ring-border hover:ring-foreground/30")}>
                          <span className={cn("text-[11px] font-medium uppercase", day === d ? "opacity-70" : "text-muted-foreground")}>{dayLabel(d, { weekday: "short" })}</span>
                          <span className="text-[19px] font-semibold tabular-nums">{dayLabel(d, { day: "numeric" })}</span>
                          <span className={cn("text-[11px]", day === d ? "opacity-70" : "text-muted-foreground")}>{dayLabel(d, { month: "short" })}</span>
                        </button>
                      ))}
                    </div>
                    {!isOrder && day && (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {times.map((tm) => (
                          <button key={tm} type="button" onClick={() => setTime(tm)}
                            className={cn("h-11 rounded-xl text-[15px] font-medium tabular-nums ring-1 transition-colors",
                              time === tm ? "bg-foreground text-background ring-foreground" : "bg-card ring-border hover:ring-foreground/30")}>
                            {tm}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
            </section>
          )}

          {/* the order's form */}
          {service && isOrder && day && config.orderFields && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold">{t("Details")}</h2>
              {config.orderFields.filter((f) => !f.when || details[f.when.key] === f.when.value).map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-muted-foreground">{t(f.label)}</span>
                  {f.type === "choice" ? (
                    <div role="radiogroup" aria-label={t(f.label)} className="grid h-12 grid-cols-2 gap-1 rounded-xl bg-foreground/[0.05] p-1">
                      {f.options!.map((o) => (
                        <button key={o} type="button" role="radio" aria-checked={details[f.key] === o} onClick={() => setDetails((d) => ({ ...d, [f.key]: o }))}
                          className={cn("rounded-lg text-[14px] font-medium transition-colors", details[f.key] === o ? "bg-card shadow-sm" : "text-muted-foreground")}>
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
            </section>
          )}

          {/* 3. who */}
          {service && day && (isOrder || time) && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold">{t("Your contacts")}</h2>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name")} autoComplete="name" maxLength={80} className={FIELD} aria-label={t("Your name")} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380 __ ___ __ __" type="tel" autoComplete="tel" maxLength={40} className={FIELD} aria-label={t("Phone")} />
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={t("A comment, if you'd like")} className={cn(FIELD, "h-auto resize-none py-3 leading-snug")} />
              {/* a field people don't see; bots fill it in */}
              <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="company" />
              {error && <p className="text-[14px] text-destructive">{error}</p>}
              <button type="submit" disabled={!ready || sending}
                className="flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-2xl bg-foreground px-4 py-2.5 text-center text-background transition-opacity disabled:opacity-40">
                <span className="text-[16px] font-semibold">{sending ? t("Sending…") : isOrder ? t("Place the order") : t("Book now")}</span>
                {summary && <span className="text-[12.5px] opacity-70 first-letter:uppercase">{summary}</span>}
              </button>
            </section>
          )}
        </form>
      )}

      <p className="mt-auto pt-4 text-center text-[12px] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("Booking by Nodly")}</Link>
      </p>
    </div>
  )
}
