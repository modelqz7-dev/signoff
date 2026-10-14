"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  AlignLeftIcon, CalendarCheckIcon, ChevronRightIcon, ClockIcon, ExternalLinkIcon, GlobeIcon, ImagesIcon,
  InfoIcon, MapPinIcon, MessageCircleIcon, PhoneIcon, ShareIcon, StarIcon, XIcon,
} from "lucide-react"
import {
  ASPECT_LABEL, Avatar, BUSINESS_DETAIL_KEYS, BUSINESS_FIELDS, CONTACT_ICON, CONTACT_LABEL, Placeholder, REVIEWER_COLORS, ReviewForm, STAR, Stars,
  average, hasHours, initialsOf, useOpenNow, weekdays, type PageEditTarget,
} from "@/components/page/PageView"
import { ACCENTS, REVIEW_ASPECTS, pageContactHref, type PageContacts, type PageData, type PageReview } from "@/lib/page"
import { useT } from "@/lib/i18n"

/** iOS's grouped look: a soft grey page, white cards, hairlines; black instead of grey on a dark page. */
function palette(data: PageData) {
  const dark = data.theme === "dark"
  const accent = dark && data.accent === ACCENTS[0] ? "#f5f5f7" : data.accent
  return {
    "--pg-bg": dark ? "#000000" : "#f2f2f7",
    "--pg-card": dark ? "#1c1c1e" : "#ffffff",
    "--pg-text": dark ? "#f5f5f7" : "#1d1d1f",
    "--pg-muted": dark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
    "--pg-border": dark ? "rgba(84,84,88,0.55)" : "rgba(60,60,67,0.14)",
    "--pg-field": dark ? "rgba(120,120,128,0.24)" : "rgba(120,120,128,0.12)",
    "--pg-accent": accent,
    "--pg-on-accent": accent === "#f5f5f7" ? "#000000" : "#ffffff",
  } as React.CSSProperties
}

const MESSAGE_KEYS = ["telegram", "viber", "whatsapp", "instagram"] as const
const noop = () => () => {}

/** A section: a large bold title over its content, like the App Store's. */
function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-9 px-4 @3xl:px-0">
      <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
        <h2 className="text-[22px] leading-tight font-bold tracking-[-0.02em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** One row of an inset list: an icon, a label, its value, and a chevron when it leads somewhere. */
function Row({ icon, label, value, href, onClick, external, expanded, children }: {
  icon: React.ReactNode; label: string; value?: React.ReactNode; href?: string | null; onClick?: () => void; external?: boolean
  /** A row that opens in place (the week's hours): its chevron turns down. */
  expanded?: boolean; children?: React.ReactNode
}) {
  const inner = (
    <>
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-[var(--pg-field)] [&_svg]:size-[17px]">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col border-b border-[var(--pg-border)] py-3 pr-4 group-last:border-none">
        <span className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-[var(--pg-muted)]">{label}</span>
            {value && <span className="block text-[16px] leading-snug break-words whitespace-pre-line">{value}</span>}
          </span>
          {(href || onClick) && <ChevronRightIcon className={`size-4 shrink-0 text-[var(--pg-muted)] opacity-70 transition-transform ${expanded ? "rotate-90" : ""}`} />}
        </span>
        {children}
      </span>
    </>
  )
  const cls = "group flex w-full items-center gap-3 pl-4 text-left"
  if (href) return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={`${cls} active:bg-[var(--pg-field)]`}>{inner}</a>
  // a div, not a button: the row may hold a list (the week's hours)
  if (onClick) return <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() } }} className={`${cls} cursor-pointer`}>{inner}</div>
  return <div className={cls}>{inner}</div>
}

/**
 * A beauty, tattoo or cake business's public page, in the app's Apple look: a cover and a centred name,
 * one big Book button with Phone, Message and Share under it, the work as a strip of photos,
 * the facts as an inset list, reviews as cards, and the booking in a sheet. A bar with the button
 * slides up once the top one scrolls away.
 */
export function SalonPage({ data, slug, reviews = [], preview = false, onEdit, booking }: {
  data: PageData
  slug: string
  reviews?: PageReview[]
  preview?: boolean
  onEdit?: (target: PageEditTarget) => void
  booking: {
    label: string; button: string; node: React.ReactNode
    /** The trade's character, in place of initials until the business adds a photo. */
    face?: string
    /** A soft wash of the trade's colours, in place of a grey cover. */
    cover?: string
  }
}) {
  const { t, locale } = useT()
  const [sheet, setSheet] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [project, setProject] = useState<number | null>(null)
  const [moreAbout, setMoreAbout] = useState(false)
  const [week, setWeek] = useState(false)
  const [writing, setWriting] = useState(false)
  const [added, setAdded] = useState<PageReview[]>([])
  const [shared, setShared] = useState(false)
  const bookRef = useRef<HTMLButtonElement>(null)
  const openNow = useOpenNow(data.hours)
  const today = useSyncExternalStore(noop, () => (new Date().getDay() + 6) % 7, () => -1)

  const link = (key: keyof PageContacts) => (data.contacts[key] ? pageContactHref(key, data.contacts[key]!) : null)
  const go = (href: string | null) => (preview ? undefined : href ?? undefined)
  const allReviews = [...added, ...reviews]
  const rating = average(allReviews.map((r) => r.rating))
  const aspects = REVIEW_ASPECTS
    .map((k) => ({ key: k, values: allReviews.map((r) => r[k]).filter((v): v is number => typeof v === "number" && v > 0) }))
    .filter((a) => a.values.length > 0)
  const initials = initialsOf(data.title) === "?" ? "N" : initialsOf(data.title)
  const category = data.category || data.tagline
  const days = weekdays(locale, "long")
  const todayHours = today >= 0 ? data.hours[today] : undefined
  const phone = link("phone")
  const message = MESSAGE_KEYS.map((k) => [k, link(k)] as const).find(([, h]) => h)
  const address = data.business.address
  const route = address || data.geo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.geo ? `${data.geo.lat},${data.geo.lng}` : address)}`
    : null
  const socials = (["instagram", "telegram", "viber", "whatsapp", "email"] as const).filter((k) => link(k))
  const details = BUSINESS_DETAIL_KEYS.filter((k) => data.business[k])
  const longAbout = data.bio.length > 280 || data.bio.split("\n").length > 5
  const open = project !== null ? data.projects[project] : null

  // the bar at the bottom shows once the big button has scrolled up out of sight
  useEffect(() => {
    const el = bookRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // the live page paints the whole window its colour, so a bounce past either end shows no other colour
  useEffect(() => {
    if (preview) return
    const bg = data.theme === "dark" ? "#000000" : "#f2f2f7"
    const root = document.documentElement
    const was = [root.style.backgroundColor, document.body.style.backgroundColor]
    root.style.backgroundColor = bg
    document.body.style.backgroundColor = bg
    return () => { root.style.backgroundColor = was[0]; document.body.style.backgroundColor = was[1] }
  }, [preview, data.theme])

  // a sheet or a photo open: Escape closes it, the page under it stays put
  const layer = sheet || open !== null
  useEffect(() => {
    if (!layer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setSheet(false); setProject(null) } }
    window.addEventListener("keydown", onKey)
    const body = preview ? null : document.body
    const was = body?.style.overflow
    if (body) body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", onKey); if (body) body.style.overflow = was ?? "" }
  }, [layer, preview])

  async function share() {
    if (preview) return
    const url = window.location.href
    if (navigator.share) { await navigator.share({ title: data.title, url }).catch(() => {}); return }
    await navigator.clipboard.writeText(url).catch(() => {})
    setShared(true)
    window.setTimeout(() => setShared(false), 1500)
  }

  const tile = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--pg-card)] py-2.5 text-[12px] font-medium transition-transform active:scale-[0.97] [&_svg]:size-[19px]"
  const tiles: { icon: React.ReactNode; label: string; href?: string | null; onClick?: () => void; external?: boolean }[] = [
    ...(phone ? [{ icon: <PhoneIcon />, label: t("Phone"), href: phone }] : []),
    ...(message ? [{ icon: <MessageCircleIcon />, label: t("Message"), href: message[1], external: true }] : []),
    { icon: <ShareIcon />, label: shared ? t("Link copied") : t("Share"), onClick: share },
  ]

  return (
    <div style={palette(data)} className="@container min-h-dvh bg-[var(--pg-bg)] text-[var(--pg-text)] antialiased">
      <div className="mx-auto w-full max-w-[680px] pb-8 @3xl:pt-8">
        {/* cover, with the logo or the trade's character over its lower edge */}
        <div className="h-44 overflow-hidden bg-[var(--pg-field)] @md:h-56 @3xl:rounded-[28px]">
          {data.banner_url ? (
            <img src={data.banner_url} alt="" className="size-full object-cover" />
          ) : data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="size-full scale-125 object-cover opacity-60 blur-3xl" />
          ) : (
            <div className="size-full" style={{ background: booking.cover }} />
          )}
        </div>
        <div className="-mt-12 flex flex-col items-center px-6 text-center">
          <Avatar data={data} initials={initials} face={booking.face} className="size-24 text-2xl ring-0! shadow-[0_8px_24px_-10px_rgba(0,0,0,0.4)]" />
          <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-[-0.025em]">{data.title || t("Your name")}</h1>
          {category && <p className="mt-0.5 text-[15px] text-[var(--pg-muted)]">{category}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13.5px] text-[var(--pg-muted)]">
            {allReviews.length > 0 && (
              <a href={preview ? undefined : "#reviews"} className="flex items-center gap-1 font-medium text-[var(--pg-text)]">
                <StarIcon className="size-3.5" style={{ fill: STAR, color: STAR }} />{rating.toFixed(1)}
                <span className="font-normal text-[var(--pg-muted)]">({allReviews.length})</span>
              </a>
            )}
            {openNow && allReviews.length > 0 && <span aria-hidden>·</span>}
            {openNow && (
              <span className={openNow === "open" ? "font-medium text-[#248a3d]" : ""}>
                {openNow === "open" ? (todayHours ? t("Open until {time}", { time: todayHours.to }) : t("Open now")) : t("Closed now")}
              </span>
            )}
          </div>
        </div>

        {/* the one big button, and the quick actions under it */}
        <div className="mt-6 flex flex-col gap-2.5 px-4 @3xl:px-0">
          <button ref={bookRef} type="button" onClick={() => setSheet(true)}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--pg-accent)] text-[17px] font-semibold text-[var(--pg-on-accent)] transition-transform active:scale-[0.98]">
            <CalendarCheckIcon className="size-5" />{booking.button}
          </button>
          <div className="flex gap-2.5">
            {tiles.map((x) => x.href
              ? <a key={x.label} href={go(x.href)} target={x.external ? "_blank" : undefined} rel={x.external ? "noopener noreferrer" : undefined} className={tile}>{x.icon}<span className="max-w-full truncate px-1">{x.label}</span></a>
              : <button key={x.label} type="button" onClick={x.onClick} className={tile}>{x.icon}<span className="max-w-full truncate px-1">{x.label}</span></button>)}
          </div>
        </div>

        {/* the work: a strip of photos to swipe */}
        {(data.projects.length > 0 || preview) && (
          <Group title={t("Work")}>
            {data.projects.length === 0 ? (
              <Placeholder icon={<ImagesIcon />} title={t("Add your first project")} hint={t("Images of finished work and a couple of words about it.")} onClick={() => onEdit?.("projects")} />
            ) : (
              <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 no-scrollbar @3xl:mx-0 @3xl:scroll-px-0 @3xl:px-0">
                {data.projects.map((p, i) => (
                  <button key={i} type="button" onClick={() => setProject(i)} className="w-[42%] shrink-0 snap-start text-left @md:w-[30%]">
                    <span className="relative block aspect-square overflow-hidden rounded-[20px] bg-[var(--pg-card)]">
                      {p.photos[0]
                        ? <img src={p.photos[0]} alt="" loading="lazy" className="size-full object-cover" />
                        : <span className="flex size-full items-center justify-center text-[var(--pg-muted)]"><ImagesIcon className="size-7" /></span>}
                      {p.photos.length > 1 && (
                        <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] font-medium text-white backdrop-blur">{p.photos.length}</span>
                      )}
                    </span>
                    {p.title && <span className="mt-1.5 block truncate px-1 text-[13.5px] font-medium">{p.title}</span>}
                  </button>
                ))}
              </div>
            )}
          </Group>
        )}

        {(data.bio || preview) && (
          <Group title={t("About us")}>
            {data.bio ? (
              <div className="rounded-[22px] bg-[var(--pg-card)] p-5">
                <p className={`text-[15.5px] leading-relaxed whitespace-pre-line ${longAbout && !moreAbout ? "line-clamp-5" : ""}`}>{data.bio}</p>
                {longAbout && (
                  <button type="button" onClick={() => setMoreAbout((v) => !v)} className="mt-1.5 text-[15px] font-medium text-[var(--pg-muted)] hover:text-[var(--pg-text)]">
                    {moreAbout ? t("Read less") : t("Read more")}
                  </button>
                )}
              </div>
            ) : (
              <Placeholder icon={<AlignLeftIcon />} title={t("Tell clients about yourself")} hint={t("Who you are, what you make, how long you've been at it.")} onClick={() => onEdit?.("about")} />
            )}
          </Group>
        )}

        {/* the facts, as an inset list */}
        <Group title={t("Information")}>
          <div className="overflow-hidden rounded-[22px] bg-[var(--pg-card)]">
            {hasHours(data.hours) && (
              <Row icon={<ClockIcon />} label={t("Working hours")} onClick={() => setWeek((v) => !v)} expanded={week}
                value={<span className="flex flex-wrap items-center gap-x-1.5">
                  {openNow === "open" ? <span className="font-medium whitespace-nowrap text-[#248a3d]">{t("Open now")}</span> : openNow === "closed" ? <span className="whitespace-nowrap text-[var(--pg-muted)]">{t("Closed now")}</span> : null}
                  {todayHours && <span className="whitespace-nowrap tabular-nums">{openNow ? "· " : ""}{todayHours.from}–{todayHours.to}</span>}
                </span>}>
                {week && (
                  <ul className="mt-2 flex flex-col gap-1 text-[15px]">
                    {data.hours.map((d, i) => (
                      <li key={i} className={`flex justify-between gap-4 ${i === today ? "font-semibold" : ""}`}>
                        <span className="first-letter:uppercase">{days[i]}</span>
                        <span className={d ? "tabular-nums" : "text-[var(--pg-muted)]"}>{d ? `${d.from}–${d.to}` : t("Day off")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Row>
            )}
            {address && <Row icon={<MapPinIcon />} label={t("Address")} value={address} href={go(route)} external />}
            {phone && <Row icon={<PhoneIcon />} label={t("Phone number")} value={data.contacts.phone} href={go(phone)} />}
            {socials.map((k) => (
              <Row key={k} icon={CONTACT_ICON[k]} label={CONTACT_LABEL[k]} value={data.contacts[k]} href={go(link(k))} external={k !== "email"} />
            ))}
            {link("website") && (
              <Row icon={<GlobeIcon />} label={t("Website")} value={data.contacts.website!.replace(/^https?:\/\//, "")} href={go(link("website"))} external />
            )}
            {details.map((k) => <Row key={k} icon={BUSINESS_FIELDS[k].icon} label={t(BUSINESS_FIELDS[k].label)} value={data.business[k]} />)}
            {data.links.map((l, i) => <Row key={`l${i}`} icon={<ExternalLinkIcon />} label={l.title} value={l.url.replace(/^https?:\/\//, "")} href={go(l.url)} external />)}
            {preview && !hasHours(data.hours) && !address && !phone && !socials.length && !details.length && (
              <div className="p-3">
                <Placeholder icon={<InfoIcon />} title={t("Add contacts and hours")} hint={t("Address, phone and when you work.")} onClick={() => onEdit?.("business")} />
              </div>
            )}
          </div>
        </Group>

        {/* reviews: the score, then the reviews as cards to swipe */}
        <div id="reviews" className="scroll-mt-4" />
        <Group title={t("Reviews")}
          action={!writing && <button type="button" onClick={() => setWriting(true)} className="text-[15px] font-medium text-[var(--pg-muted)] hover:text-[var(--pg-text)]">{t("Write a review")}</button>}>
          {allReviews.length > 0 && (
            <div className="mb-3 flex items-center gap-5 rounded-[22px] bg-[var(--pg-card)] p-5">
              <div className="flex flex-col items-center">
                <span className="text-[44px] leading-none font-bold tracking-[-0.03em] tabular-nums">{rating.toFixed(1)}</span>
                <span className="mt-1 text-[12.5px] text-[var(--pg-muted)]">{t("out of 5")}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Stars value={rating} className="size-4" />
                <span className="text-[13px] text-[var(--pg-muted)]">{t("Reviews: {n}", { n: allReviews.length })}</span>
                {aspects.map((a) => {
                  const avg = average(a.values)
                  return (
                    <span key={a.key} className="grid grid-cols-[1fr_72px] items-center gap-3 text-[12.5px]">
                      <span className="truncate text-[var(--pg-muted)]">{t(ASPECT_LABEL[a.key])}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-[var(--pg-field)]"><span className="block h-full rounded-full bg-[var(--pg-text)]" style={{ width: `${(avg / 5) * 100}%` }} /></span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {writing && <ReviewForm slug={slug} preview={preview} onClose={() => setWriting(false)} onSent={(r) => { setAdded((list) => [r, ...list]); setWriting(false) }} />}
          {allReviews.length > 0 ? (
            <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 no-scrollbar @3xl:mx-0 @3xl:scroll-px-0 @3xl:px-0">
              {allReviews.map((r, i) => (
                <figure key={r.id} className="flex w-[84%] shrink-0 snap-start flex-col rounded-[22px] bg-[var(--pg-card)] p-4 @md:w-[46%]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: REVIEWER_COLORS[(r.name.length + i) % REVIEWER_COLORS.length] }}>{initialsOf(r.name)}</span>
                    <span className="min-w-0 flex-1">
                      <figcaption className="truncate text-[14px] font-semibold">{r.name}</figcaption>
                      <span className="block text-[12px] text-[var(--pg-muted)]">{new Date(r.created_at).toLocaleDateString(locale, { day: "numeric", month: "long" })}</span>
                    </span>
                    <Stars value={r.rating} className="size-3" />
                  </div>
                  <blockquote className="mt-2.5 line-clamp-5 text-[14.5px] leading-relaxed whitespace-pre-line">{r.text}</blockquote>
                </figure>
              ))}
            </div>
          ) : !writing && (
            <p className="rounded-[22px] bg-[var(--pg-card)] p-5 text-[15px] text-[var(--pg-muted)]">{t("No reviews yet. Worked with us? Tell others how it went.")}</p>
          )}
        </Group>

        <a href={preview ? undefined : "/?ref=page"} className="mt-10 block text-center text-[12px] text-[var(--pg-muted)] hover:text-[var(--pg-text)]">
          {t("Made with Nodly")}
        </a>
      </div>

      {/* a frosted bar with the button, sliding up once the big one has scrolled away */}
      <div className={`sticky bottom-0 z-20 border-t border-[var(--pg-border)] bg-[color-mix(in_srgb,var(--pg-card)_78%,transparent)] backdrop-blur-xl backdrop-saturate-150 transition-[transform,opacity] duration-300 ${scrolled ? "" : "pointer-events-none translate-y-full opacity-0"}`}>
        <div className="mx-auto flex w-full max-w-[680px] items-center gap-3 px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] @3xl:px-0">
          <Avatar data={data} initials={initials} face={booking.face} className="size-10 text-sm ring-0!" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{data.title || t("Your name")}</span>
            {category && <span className="block truncate text-[12.5px] text-[var(--pg-muted)]">{category}</span>}
          </span>
          <button type="button" onClick={() => setSheet(true)} tabIndex={scrolled ? 0 : -1}
            className="flex h-10 shrink-0 items-center rounded-full bg-[var(--pg-accent)] px-5 text-[15px] font-semibold text-[var(--pg-on-accent)] transition-transform active:scale-[0.97]">
            {booking.button}
          </button>
        </div>
      </div>

      {/* booking: a sheet from the bottom on a phone, a window on a computer; kept mounted so a closed sheet keeps its choices */}
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 @3xl:items-center @3xl:p-8 ${sheet ? "" : "hidden"}`}
        role="dialog" aria-modal="true" aria-label={booking.button} onClick={() => setSheet(false)}>
        <div onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92%] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] bg-[var(--pg-bg)] shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.35)] @3xl:rounded-[28px]">
          <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-[var(--pg-muted)] opacity-40 @3xl:hidden" />
          <header className="flex shrink-0 items-center gap-3 px-5 pt-3 pb-2 @3xl:pt-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] leading-tight font-bold tracking-[-0.02em]">{booking.label}</p>
              <p className="truncate text-[13px] text-[var(--pg-muted)]">{data.title}</p>
            </div>
            <button type="button" aria-label={t("Close")} onClick={() => setSheet(false)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--pg-field)] text-[var(--pg-muted)] hover:text-[var(--pg-text)]"><XIcon className="size-4" /></button>
          </header>
          {/* the booking speaks in the app's words: its colours follow the page's own */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))]" style={{
            "--background": "var(--pg-bg)", "--foreground": "var(--pg-text)", "--card": "var(--pg-card)", "--card-foreground": "var(--pg-text)",
            "--muted-foreground": "var(--pg-muted)", "--border": "var(--pg-border)", "--hover": "var(--pg-field)",
          } as React.CSSProperties}>{booking.node}</div>
        </div>
      </div>

      {/* one work, its photos one under another */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 @3xl:items-center @3xl:p-8" role="dialog" aria-modal="true" onClick={() => setProject(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92%] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[28px] bg-[var(--pg-bg)] @3xl:rounded-[28px]">
            <header className="flex shrink-0 items-center gap-3 px-5 pt-4 pb-2">
              <p className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.02em]">{open.title || t("Our work")}</p>
              <button type="button" aria-label={t("Close")} onClick={() => setProject(null)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--pg-field)] text-[var(--pg-muted)] hover:text-[var(--pg-text)]"><XIcon className="size-4" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
              {open.description && <p className="mb-3 text-[15px] leading-relaxed whitespace-pre-line">{open.description}</p>}
              <div className="flex flex-col gap-3">
                {open.photos.map((src) => <img key={src} src={src} alt="" loading="lazy" className="w-full rounded-[18px]" />)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
