"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  AlignLeftIcon, AwardIcon, BanknoteIcon, CalendarIcon, ChevronDownIcon, ClockIcon, ExternalLinkIcon, GlobeIcon, HourglassIcon, ImageIcon, ImagePlusIcon,
  ImagesIcon, ListChecksIcon, MailIcon, MapIcon, MapPinIcon, MessageCircleIcon, PhoneIcon, RulerIcon, SendIcon, Share2Icon, ShieldCheckIcon,
  StarIcon, UsersIcon, XIcon,
} from "lucide-react"
import { useT } from "@/lib/i18n"
import {
  ACCENTS, CONTACT_KEYS, REVIEW_ASPECTS, pageContactHref, splitList, type PageBusiness, type PageContacts, type PageData,
  type PageHours, type PageReview,
} from "@/lib/page"
import { shrinkImage } from "@/lib/image"

/** Colours of the page itself: it keeps its own look whatever theme the visitor uses on Nodly. */
function palette(data: PageData) {
  const dark = data.theme === "dark"
  // The darkest accent would vanish on a dark page: it turns light there.
  const accent = dark && data.accent === ACCENTS[0] ? "#efeeec" : data.accent
  return {
    "--pg-bg": dark ? "#141312" : "#ffffff",
    "--pg-card": dark ? "#1e1d1c" : "#ffffff",
    "--pg-text": dark ? "#ecebea" : "#1f1e1d",
    "--pg-muted": dark ? "rgba(236,235,234,0.62)" : "rgba(31,30,29,0.6)",
    "--pg-border": dark ? "rgba(236,235,234,0.12)" : "rgba(31,30,29,0.12)",
    "--pg-field": dark ? "rgba(236,235,234,0.06)" : "#f6f5f3",
    "--pg-accent": accent,
    "--pg-on-accent": accent === "#efeeec" ? "#1f1e1d" : "#ffffff",
  } as React.CSSProperties
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export const CONTACT_ICON: Record<keyof PageContacts, React.ReactNode> = {
  instagram: <InstagramGlyph />,
  telegram: <SendIcon className="size-4" />,
  viber: <MessageCircleIcon className="size-4" />,
  whatsapp: <MessageCircleIcon className="size-4" />,
  phone: <PhoneIcon className="size-4" />,
  email: <MailIcon className="size-4" />,
  website: <GlobeIcon className="size-4" />,
}

export const CONTACT_LABEL: Record<keyof PageContacts, string> = {
  instagram: "Instagram", telegram: "Telegram", viber: "Viber", whatsapp: "WhatsApp",
  phone: "Phone", email: "Email", website: "Website",
}

/** Labels (i18n keys) and icons of the business facts, in the editor and on the page. */
export const BUSINESS_FIELDS: Record<keyof PageBusiness, { label: string; icon: React.ReactNode }> = {
  since: { label: "In business since", icon: <CalendarIcon /> },
  team: { label: "Team", icon: <UsersIcon /> },
  address: { label: "Workshop address", icon: <MapPinIcon /> },
  areas: { label: "Areas we serve", icon: <MapIcon /> },
  measure: { label: "Measuring visit", icon: <RulerIcon /> },
  terms: { label: "Lead time", icon: <HourglassIcon /> },
  payment: { label: "Payment", icon: <BanknoteIcon /> },
  warranty: { label: "Warranty", icon: <ShieldCheckIcon /> },
}

export const ASPECT_LABEL: Record<(typeof REVIEW_ASPECTS)[number], string> = {
  quality: "Work quality", communication: "Communication", value: "Value for money",
}

const SOCIAL_KEYS = ["instagram", "telegram", "viber", "whatsapp", "email"] as const
const BUSINESS_DETAIL_KEYS = ["since", "team", "measure", "terms", "payment", "warranty"] as const
const SHAPE = { pill: "rounded-full", rounded: "rounded-xl", square: "rounded-md" } as const
const STAR = "#f5a524"

/** Weekday names, Monday first (1 Jan 2024 was a Monday). */
export function weekdays(locale: string, style: "short" | "long" = "short") {
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: style }))
}

const hasHours = (hours: PageHours) => hours.some(Boolean)
const noop = () => () => {}
const average = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)

/** "open" / "closed" by the visitor's clock; null on the server, so the page renders the same on both sides. */
function useOpenNow(hours: PageHours) {
  return useSyncExternalStore(noop, () => {
    if (!hasHours(hours)) return null
    const now = new Date()
    const day = hours[(now.getDay() + 6) % 7]
    const minutes = now.getHours() * 60 + now.getMinutes()
    const at = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
    return day && minutes >= at(day.from) && minutes < at(day.to) ? "open" : "closed"
  }, () => null)
}

function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= Math.round(value)
        return <StarIcon key={i} className={`${className} ${on ? "" : "text-[var(--pg-border)]"}`} style={on ? { fill: STAR, color: STAR } : undefined} />
      })}
    </span>
  )
}

function Avatar({ data, initials, className = "" }: { data: PageData; initials: string; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--pg-field)] font-semibold ring-1 ring-[var(--pg-border)] ${className}`}>
      {data.avatar_url ? <img src={data.avatar_url} alt="" className="size-full object-cover" /> : initials}
    </div>
  )
}

const REVIEWER_COLORS = ["#a16207", "#475569", "#ea580c", "#0f766e", "#7c3aed", "#be123c", "#15803d", "#1d4ed8"]
function initialsOf(name: string) {
  return name.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?"
}

function Section({ id, title, aside, children }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} data-pg-section className="scroll-mt-14 border-b border-[var(--pg-border)] px-5 py-7 @3xl:px-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** A 3-column list that shows the first 9 and a "Show N more" toggle, like Houzz's Services and Areas. */
/** Where an empty section is filled in, for the editor's preview. */
export type PageEditTarget = "about" | "projects" | "business" | "contacts" | "services" | "areas" | "credentials"

/** An empty section in the editor's preview, like the dashboard's empty states: what goes here, and "Add". */
function Placeholder({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick?: () => void }) {
  const { t } = useT()
  return (
    <button type="button" onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-md bg-[var(--pg-field)] px-4 py-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--pg-field),var(--pg-text)_4%)]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--pg-bg)] text-[var(--pg-muted)] ring-1 ring-[var(--pg-border)] [&_svg]:size-[18px]">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-[var(--pg-muted)]">{hint}</span>
      </span>
      <span className="flex h-8 shrink-0 items-center rounded-md border border-[var(--pg-border)] bg-[var(--pg-bg)] px-3 text-xs font-medium transition-colors group-hover:border-[var(--pg-text)]">{t("Add")}</span>
    </button>
  )
}

function MoreList({ items }: { items: React.ReactNode[] }) {
  const { t } = useT()
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, 9)
  return (
    <>
      <ul className="grid gap-x-6 gap-y-2.5 text-sm @md:grid-cols-2 @2xl:grid-cols-3">
        {shown.map((item, i) => <li key={i} className="min-w-0">{item}</li>)}
      </ul>
      {items.length > 9 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 flex items-center gap-1 text-sm font-semibold">
          {all ? t("Show less") : t("Show {n} more", { n: items.length - 9 })}
          <ChevronDownIcon className={`size-4 transition-transform ${all ? "rotate-180" : ""}`} />
        </button>
      )}
    </>
  )
}

function Detail({ label, children, onEmpty }: { label: string; children?: React.ReactNode; onEmpty?: () => void }) {
  const { t } = useT()
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="mt-1 text-sm break-words text-[var(--pg-text)]/85">
        {children ?? <button type="button" onClick={onEmpty} className="text-[var(--pg-muted)] hover:text-[var(--pg-text)] hover:underline">{t("Not specified")}</button>}
      </dd>
    </div>
  )
}

/**
 * The workshop's public page, built like a Houzz profile: cover, name and rating, pinned tabs,
 * About, Projects, Business, Services, Areas, Credentials and Reviews, and a "Contact" card that
 * opens a message window. `preview` is the editor's live copy: links stay inert and forms don't send.
 */
export function PageView({ data, slug, reviews = [], preview = false, onEdit }: {
  data: PageData
  slug: string
  reviews?: PageReview[]
  preview?: boolean
  /** Editor only: an empty section was tapped. */
  onEdit?: (target: PageEditTarget) => void
}) {
  const { t, locale } = useT()
  const rootRef = useRef<HTMLDivElement>(null)
  const [project, setProject] = useState<number | null>(null)
  const [moreAbout, setMoreAbout] = useState(false)
  const [shared, setShared] = useState(false)
  const [added, setAdded] = useState<PageReview[]>([])
  const [writing, setWriting] = useState(false)
  const [contact, setContact] = useState(false)
  const [active, setActive] = useState("")
  const openNow = useOpenNow(data.hours)
  const today = useSyncExternalStore(noop, () => (new Date().getDay() + 6) % 7, () => -1)

  const contactLink = (key: keyof PageContacts) => (data.contacts[key] ? pageContactHref(key, data.contacts[key]!) : null)
  const socials = SOCIAL_KEYS.filter((k) => contactLink(k))
  const areas = splitList(data.business.areas)
  const allReviews = [...added, ...reviews]
  const rating = average(allReviews.map((r) => r.rating))
  const aspects = REVIEW_ASPECTS
    .map((k) => ({ key: k, values: allReviews.map((r) => r[k]).filter((v): v is number => typeof v === "number" && v > 0) }))
    .filter((a) => a.values.length > 0)
  const initials = initialsOf(data.title) === "?" ? "N" : initialsOf(data.title)
  const longAbout = data.bio.length > 320 || data.bio.split("\n").length > 4
  const days = weekdays(locale)
  const category = data.category || data.tagline

  // Section ids differ in the editor's preview, so they never clash with the editor itself.
  const sid = (s: string) => (preview ? `pg-${s}-preview` : `pg-${s}`)
  const tabs = ([
    [!!data.bio || !!data.category, "about", t("About us")],
    [data.projects.length > 0, "projects", t("Projects")],
    [true, "business", t("Business")],
    [data.services.length > 0, "services", t("Services")],
    [areas.length > 0, "areas", t("Areas")],
    [data.credentials.length > 0, "credentials", t("Credentials")],
    [true, "reviews", t("Reviews")],
  ] as [boolean, string, string][]).filter(([on]) => on || preview)
  const current = active || tabs[0]?.[1]

  function go(id: string) {
    setActive(id)
    document.getElementById(sid(id))?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // The tab under the pinned bar follows the scroll.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (top) setActive(top.target.id.replace(/^pg-/, "").replace(/-preview$/, ""))
    }, { rootMargin: "-15% 0px -70% 0px" })
    root.querySelectorAll("[data-pg-section]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [tabs.length])

  async function share() {
    if (preview) return
    const url = window.location.href
    if (navigator.share) { await navigator.share({ title: data.title, url }).catch(() => {}); return }
    await navigator.clipboard.writeText(url).catch(() => {})
    setShared(true)
    window.setTimeout(() => setShared(false), 1500)
  }

  function writeReview() {
    setWriting(true)
    go("reviews")
  }

  const btn = `flex h-9 items-center gap-2 border border-[var(--pg-border)] px-3.5 text-sm font-medium transition-colors hover:border-[var(--pg-text)] [&_svg]:size-4 ${SHAPE[data.buttons]}`
  const open = project !== null ? data.projects[project] : null

  // Laid out by its own width (a container), not the screen's: the editor previews it as a phone or a computer.
  return (
    <div ref={rootRef} style={palette(data)} className="@container min-h-full bg-[var(--pg-bg)] text-[var(--pg-text)]">
      <div className="mx-auto w-full max-w-[1120px] pb-24 @3xl:px-8 @3xl:pt-6 @4xl:pb-12">
        <div className="@4xl:grid @4xl:grid-cols-[minmax(0,1fr)_300px] @4xl:items-start @4xl:gap-10">
          <div className="min-w-0">
            {/* Cover: the workshop's photo; without one, its logo blurred, or a wash of the accent */}
            <div className="h-48 overflow-hidden bg-[var(--pg-field)] @3xl:h-[300px] @3xl:rounded-md">
              {data.banner_url ? (
                <img src={data.banner_url} alt="" className="size-full object-cover" />
              ) : data.avatar_url ? (
                <img src={data.avatar_url} alt="" className="size-full scale-125 object-cover opacity-50 blur-3xl" />
              ) : (
                <div className="size-full" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--pg-accent) 22%, var(--pg-field)), var(--pg-field) 70%)" }} />
              )}
            </div>

            {/* Logo, name, rating, category */}
            <div className="flex items-center gap-4 px-5 pt-4 @3xl:px-0">
              <Avatar data={data} initials={initials} className="size-[72px] text-xl @3xl:size-[88px] @3xl:text-2xl" />
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-[22px] leading-tight font-semibold tracking-tight @3xl:text-2xl">{data.title || t("Your name")}</h1>
                {allReviews.length > 0 && (
                  <button type="button" onClick={() => go("reviews")} className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-semibold" style={{ color: STAR }}>{rating.toFixed(1)}</span>
                    <Stars value={rating} />
                    <span className="text-[var(--pg-muted)] hover:underline">{t("Reviews: {n}", { n: allReviews.length })}</span>
                  </button>
                )}
                {category && <p className="text-sm text-[var(--pg-muted)]">{category}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 px-5 pt-5 @3xl:px-0">
              <button type="button" onClick={writeReview} className={btn}><StarIcon />{t("Write a review")}</button>
              <button type="button" onClick={share} className={btn}><Share2Icon />{shared ? t("Link copied") : t("Share")}</button>
              {openNow && (
                <span className={`flex h-9 items-center gap-1.5 px-2 text-sm font-medium ${openNow === "open" ? "text-[#2f8a4c]" : "text-[var(--pg-muted)]"}`}>
                  <span className={`size-2 rounded-full ${openNow === "open" ? "bg-[#2f8a4c]" : "bg-[var(--pg-muted)]"}`} />
                  {openNow === "open" ? t("Open now") : t("Closed now")}
                </span>
              )}
            </div>

            {/* Section tabs, pinned while scrolling; the current one is underlined */}
            <nav className="sticky top-0 z-10 mt-5 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-[var(--pg-border)] bg-[var(--pg-bg)] px-5 text-sm [scrollbar-width:none] @3xl:px-0">
              {tabs.map(([, id, label]) => (
                <button key={id} type="button" onClick={() => go(id)}
                  className={`-mb-px shrink-0 border-b-2 py-3 font-medium whitespace-nowrap transition-colors ${
                    current === id ? "border-[var(--pg-text)] text-[var(--pg-text)]" : "border-transparent text-[var(--pg-muted)] hover:text-[var(--pg-text)]"
                  }`}>
                  {label}
                </button>
              ))}
            </nav>

            {(data.bio || data.category || preview) && (
              <Section id={sid("about")} title={t("About us")}>
                {!data.bio && !data.category && <Placeholder icon={<AlignLeftIcon />} title={t("Tell clients about your workshop")} hint={t("Who you are, what you make, how long you've been at it.")} onClick={() => onEdit?.("about")} />}
                {data.bio && (
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${longAbout && !moreAbout ? "line-clamp-4" : ""}`}>{data.bio}</p>
                )}
                {data.category && (!longAbout || moreAbout) && (
                  <div className="mt-4">
                    <p className="text-base font-semibold">{t("Category")}</p>
                    <p className="text-sm">{data.category}</p>
                  </div>
                )}
                {longAbout && (
                  <button type="button" onClick={() => setMoreAbout((v) => !v)} className="mt-2 flex items-center gap-1 text-sm font-semibold">
                    {moreAbout ? t("Read less") : t("Read more")}
                    <ChevronDownIcon className={`size-4 transition-transform ${moreAbout ? "rotate-180" : ""}`} />
                  </button>
                )}
                {data.links.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {data.links.map((l, i) => (
                      <a key={i} href={preview ? undefined : l.url} target="_blank" rel="noopener noreferrer" className={btn}>{l.title}<ExternalLinkIcon /></a>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {(data.projects.length > 0 || preview) && (
              <Section id={sid("projects")} title={data.projects.length ? t("Projects: {n}", { n: data.projects.length }) : t("Projects")}>
                {data.projects.length === 0 && <Placeholder icon={<ImagesIcon />} title={t("Add your first project")} hint={t("Photos of a finished kitchen or wardrobe, the city and a couple of words.")} onClick={() => onEdit?.("projects")} />}
                <div className="grid gap-4 @md:grid-cols-2">
                  {data.projects.map((p, i) => (
                    <button key={i} type="button" onClick={() => setProject(i)}
                      className="group flex flex-col overflow-hidden rounded-lg bg-[var(--pg-card)] text-left shadow-[0_1px_4px_rgba(0,0,0,0.12)] ring-1 ring-[var(--pg-border)]">
                      <span className="relative block aspect-[3/2] overflow-hidden bg-[var(--pg-field)]">
                        {p.photos[0]
                          ? <img src={p.photos[0]} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                          : <span className="flex size-full items-center justify-center text-[var(--pg-muted)]"><ImageIcon className="size-8" /></span>}
                        {p.photos.length > 0 && (
                          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
                            <ImagesIcon className="size-3.5" />{p.photos.length}
                          </span>
                        )}
                      </span>
                      <span className="flex flex-col gap-2 px-3.5 py-3">
                        <span className="text-sm font-medium">{p.title || t("Our work")}</span>
                        {p.city && <span className="flex items-center gap-1 text-xs text-[var(--pg-muted)]"><MapPinIcon className="size-3.5" />{p.city}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section id={sid("business")} title={t("Business details")}>
              {/* Every field in a fixed order; on the live page only filled ones, in the preview all of them */}
              <dl className="grid gap-x-10 gap-y-5 @md:grid-cols-2">
                <Detail label={t("Business name")}>{data.title || t("Your name")}</Detail>
                {(contactLink("phone") || preview) && (
                  <Detail label={t("Phone number")} onEmpty={() => onEdit?.("contacts")}>
                    {contactLink("phone") ? <a href={preview ? undefined : contactLink("phone")!} className="hover:underline">{data.contacts.phone}</a> : undefined}
                  </Detail>
                )}
                {(socials.length > 0 || preview) && (
                  <Detail label={t("Socials")} onEmpty={() => onEdit?.("contacts")}>
                    {socials.length > 0 ? (
                      <span className="flex gap-2.5 [&_svg]:size-[18px]">
                        {socials.map((k) => (
                          <a key={k} href={preview ? undefined : contactLink(k)!} target="_blank" rel="noopener noreferrer" aria-label={CONTACT_LABEL[k]} title={CONTACT_LABEL[k]} className="hover:opacity-70">
                            {CONTACT_ICON[k]}
                          </a>
                        ))}
                      </span>
                    ) : undefined}
                  </Detail>
                )}
                {(contactLink("website") || preview) && (
                  <Detail label={t("Website")} onEmpty={() => onEdit?.("contacts")}>
                    {contactLink("website") ? (
                      <a href={preview ? undefined : contactLink("website")!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                        {data.contacts.website!.replace(/^https?:\/\//, "")}<ExternalLinkIcon className="size-3.5" />
                      </a>
                    ) : undefined}
                  </Detail>
                )}
                {(["address", ...BUSINESS_DETAIL_KEYS] as const).filter((k) => data.business[k] || preview).map((k) => (
                  <Detail key={k} label={k === "address" ? t("Address") : t(BUSINESS_FIELDS[k].label)} onEmpty={() => onEdit?.("business")}>
                    {data.business[k] ? <span className="whitespace-pre-line">{data.business[k]}</span> : undefined}
                  </Detail>
                ))}
                {(hasHours(data.hours) || preview) && (
                  <Detail label={t("Working hours")} onEmpty={() => onEdit?.("business")}>
                    {hasHours(data.hours) ? (
                      <ul className="flex max-w-60 flex-col gap-1">
                        {data.hours.map((d, i) => (
                          <li key={i} className={`flex justify-between gap-4 ${i === today ? "font-semibold" : ""}`}>
                            <span className="capitalize">{days[i]}</span>
                            <span className={d ? "tabular-nums" : "text-[var(--pg-muted)]"}>{d ? `${d.from}–${d.to}` : t("Day off")}</span>
                          </li>
                        ))}
                      </ul>
                    ) : undefined}
                  </Detail>
                )}
              </dl>
            </Section>

            {(data.services.length > 0 || preview) && (
              <Section id={sid("services")} title={t("Services provided")}>
                {data.services.length === 0 && <Placeholder icon={<ListChecksIcon />} title={t("Add services and prices")} hint={t("What you make and from what price.")} onClick={() => onEdit?.("services")} />}
                <MoreList items={data.services.map((s, i) => (
                  <span key={i} className="flex flex-col">
                    <span>{s.name}{s.price && <span className="text-[var(--pg-muted)]"> · {s.price}</span>}</span>
                    {s.description && <span className="text-xs text-[var(--pg-muted)]">{s.description}</span>}
                  </span>
                ))} />
              </Section>
            )}

            {(areas.length > 0 || preview) && (
              <Section id={sid("areas")} title={t("Areas served")}>
                {areas.length === 0 && <Placeholder icon={<MapIcon />} title={t("Add the areas you serve")} hint={t("Cities and districts you travel to for measuring and installation.")} onClick={() => onEdit?.("areas")} />}
                <MoreList items={areas} />
              </Section>
            )}

            {(data.credentials.length > 0 || preview) && (
              <Section id={sid("credentials")} title={t("Credentials")}>
                {data.credentials.length === 0 && <Placeholder icon={<AwardIcon />} title={t("Add awards and certificates")} hint={t("Partner badges (Blum, Egger), certificates, contest wins.")} onClick={() => onEdit?.("credentials")} />}
                <div className="flex flex-wrap gap-5">
                  {data.credentials.map((c, i) => (
                    <div key={i} className="flex w-28 flex-col gap-2">
                      {c.image_url
                        ? <img src={c.image_url} alt="" className="size-16 rounded-md object-contain" />
                        : <span className="flex size-16 items-center justify-center rounded-md bg-[var(--pg-field)] text-[var(--pg-muted)]"><ShieldCheckIcon className="size-7" /></span>}
                      <span className="text-[13px] leading-snug font-medium">{c.title}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section id={sid("reviews")} title={allReviews.length ? t("{n} reviews for {name}", { n: allReviews.length, name: data.title }) : t("Reviews")}
              aside={!writing && <button type="button" onClick={() => setWriting(true)} className="h-9 shrink-0 rounded-md border border-[var(--pg-border)] px-3.5 text-sm font-medium hover:border-[var(--pg-text)]">{t("Write a review")}</button>}>
              {allReviews.length > 0 && (
                <div className="mb-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Stars value={rating} className="size-7" />
                    <span className="text-2xl font-semibold tabular-nums">{rating.toFixed(1)}</span>
                    <span className="border-l border-[var(--pg-border)] pl-3 text-sm text-[var(--pg-muted)]">{t("Reviews: {n}", { n: allReviews.length })}</span>
                  </div>
                  {aspects.length > 0 && (
                    <div className="grid max-w-sm grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 text-[13px]">
                      {aspects.map((a) => {
                        const avg = average(a.values)
                        return [
                          <span key={`${a.key}-l`}>{t(ASPECT_LABEL[a.key])}</span>,
                          <span key={`${a.key}-b`} className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <span key={i} className="h-2 flex-1 rounded-sm" style={{ background: i <= Math.round(avg) ? STAR : "var(--pg-border)" }} />
                            ))}
                          </span>,
                          <span key={`${a.key}-v`} className="tabular-nums">{avg.toFixed(1)}</span>,
                        ]
                      })}
                    </div>
                  )}
                </div>
              )}
              {writing && <ReviewForm slug={slug} preview={preview} onClose={() => setWriting(false)} onSent={(r) => { setAdded((list) => [r, ...list]); setWriting(false) }} />}
              {allReviews.length === 0 && !writing && <p className="text-sm text-[var(--pg-muted)]">{t("No reviews yet. Worked with us? Tell others how it went.")}</p>}
              <div className="flex flex-col">
                {allReviews.map((r, i) => <ReviewItem key={r.id} review={r} color={REVIEWER_COLORS[(r.name.length + i) % REVIEWER_COLORS.length]} locale={locale} />)}
              </div>
            </Section>

            <a href={preview ? undefined : "/?ref=page"} className="mt-6 block text-center text-xs text-[var(--pg-muted)] transition-colors hover:text-[var(--pg-text)]">
              {t("Made with Nodly")}
            </a>
          </div>

          {/* "Contact" card: pinned on the right on a computer, a bar at the bottom on a phone */}
          {data.requests && (
            <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--pg-border)] bg-[var(--pg-bg)] p-3 @4xl:sticky @4xl:top-6 @4xl:inset-auto @4xl:z-auto @4xl:rounded-md @4xl:border @4xl:p-4">
              <p className="mb-3 hidden text-sm font-medium @4xl:block">{t("Contact {name}", { name: data.title || t("Your name") })}</p>
              <button type="button" onClick={() => setContact(true)}
                className={`flex h-11 w-full items-center justify-center bg-[var(--pg-accent)] text-sm font-semibold text-[var(--pg-on-accent)] transition-opacity hover:opacity-90 @4xl:h-10 ${SHAPE[data.buttons]}`}>
                {data.cta || t("Send message")}
              </button>
            </aside>
          )}
        </div>
      </div>

      {contact && (
        <ContactModal data={data} slug={slug} preview={preview} rating={rating} count={allReviews.length} initials={initials} onClose={() => setContact(false)} />
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/80 p-3 @3xl:p-10" role="dialog" aria-modal="true" onClick={() => setProject(null)}>
          <div className="relative h-fit w-full max-w-3xl rounded-lg bg-[var(--pg-bg)] p-5 @3xl:p-7" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={t("Close")} onClick={() => setProject(null)}
              className="absolute top-4 right-4 rounded-full p-2 hover:bg-[var(--pg-field)]"><XIcon className="size-5" /></button>
            <h3 className="pr-12 text-xl font-semibold tracking-tight">{open.title || t("Our work")}</h3>
            {open.city && <p className="mt-1 flex items-center gap-1 text-sm text-[var(--pg-muted)]"><MapPinIcon className="size-4" />{open.city}</p>}
            {open.description && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line">{open.description}</p>}
            <div className="mt-5 flex flex-col gap-3">
              {open.photos.map((src) => <img key={src} src={src} alt="" loading="lazy" className="w-full rounded-md" />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewItem({ review, color, locale }: { review: PageReview; color: string; locale: string }) {
  const { t } = useT()
  const [more, setMore] = useState(false)
  const long = review.text.length > 240
  return (
    <figure className="border-t border-[var(--pg-border)] py-4 first:border-none first:pt-0">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: color }}>{initialsOf(review.name)}</span>
        <span className="flex flex-col gap-0.5">
          <figcaption className="text-sm font-semibold">{review.name}</figcaption>
          <Stars value={review.rating} className="size-3.5" />
        </span>
      </div>
      <blockquote className={`mt-3 text-sm leading-relaxed whitespace-pre-line ${long && !more ? "line-clamp-3" : ""}`}>{review.text}</blockquote>
      {long && (
        <button type="button" onClick={() => setMore((v) => !v)} className="mt-1 flex items-center gap-1 text-sm font-semibold">
          {more ? t("Read less") : t("Read more")}<ChevronDownIcon className={`size-4 transition-transform ${more ? "rotate-180" : ""}`} />
        </button>
      )}
      <p className="mt-2 text-xs text-[var(--pg-muted)]">{new Date(review.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</p>
    </figure>
  )
}

function StarPicker({ value, onChange, size = "size-7", label }: { value: number; onChange: (v: number) => void; size?: string; label: string }) {
  return (
    <span className="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${label}: ${i}`} onClick={() => onChange(i)} className="p-0.5">
          <StarIcon className={`${size} ${i <= value ? "" : "text-[var(--pg-border)]"}`} style={i <= value ? { fill: STAR, color: STAR } : undefined} />
        </button>
      ))}
    </span>
  )
}

/** "Write a review": overall stars, optional marks per aspect, a name and a few words. Shows at once. */
function ReviewForm({ slug, preview, onClose, onSent }: { slug: string; preview: boolean; onClose: () => void; onSent: (r: PageReview) => void }) {
  const { t } = useT()
  const [rating, setRating] = useState(0)
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [trap, setTrap] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (preview) return
    if (!rating) { setError(t("Choose a rating")); return }
    if (!name.trim() || text.trim().length < 3) { setError(t("Enter your name and a few words")); return }
    setSending(true)
    setError(null)
    const res = await fetch(`/api/page/${encodeURIComponent(slug)}/review`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, ...marks, name: name.trim(), text: text.trim(), company: trap }),
    }).catch(() => null)
    setSending(false)
    const body = await res?.json().catch(() => null)
    if (res?.ok && body?.review) { onSent(body.review); return }
    setError(res?.status === 429 ? t("Too many requests. Try again in a few minutes.") : t("Couldn't send the review. Try again."))
  }

  const field = "w-full rounded-md border border-[var(--pg-border)] bg-[var(--pg-bg)] px-3.5 py-2.5 text-[16px] text-[var(--pg-text)] outline-none placeholder:text-[var(--pg-muted)] focus:border-[var(--pg-text)] sm:text-sm"
  return (
    <form onSubmit={submit} className="mb-5 flex flex-col gap-3 rounded-md border border-[var(--pg-border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{t("Your rating")}</span>
        <StarPicker value={rating} onChange={setRating} label={t("Rating")} />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
        {REVIEW_ASPECTS.map((k) => [
          <span key={`${k}-l`} className="text-[var(--pg-muted)]">{t(ASPECT_LABEL[k])}</span>,
          <StarPicker key={`${k}-s`} value={marks[k] ?? 0} onChange={(v) => setMarks((m) => ({ ...m, [k]: v }))} size="size-5" label={t(ASPECT_LABEL[k])} />,
        ])}
      </div>
      <input className={field} placeholder={t("Your name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
      <textarea className={`${field} min-h-24 resize-y`} placeholder={t("What did they make for you? How did it go?")} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
      <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} name="company" />
      {error && <p className="text-sm text-[#c2410c]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-[var(--pg-border)] px-4 text-sm font-medium">{t("Cancel")}</button>
        <button type="submit" disabled={sending}
          className="h-10 rounded-md bg-[var(--pg-accent)] px-5 text-sm font-semibold text-[var(--pg-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-60">
          {sending ? t("Sending...") : t("Publish review")}
        </button>
      </div>
    </form>
  )
}

const MAX_FILES = 3
const MAX_FILE_BYTES = 2 * 1024 * 1024

/** "Contact this pro", in two steps: the message, then how to reach the client. Lands in Requests. */
function ContactModal({ data, slug, preview, rating, count, initials, onClose }: {
  data: PageData; slug: string; preview: boolean; rating: number; count: number; initials: string; onClose: () => void
}) {
  const { t } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [trap, setTrap] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"))
    const total = (e.target.files?.length ?? 0)
    e.target.value = ""
    setError(null)
    const shrunk = await Promise.all(picked.slice(0, MAX_FILES).map(shrinkImage))
    const ok = shrunk.filter((f) => f.size <= MAX_FILE_BYTES)
    if (ok.length < total) setError(t("Photos only, up to 2 MB each"))
    setFiles((prev) => [...prev, ...ok].slice(0, MAX_FILES))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (preview) return
    if (!name.trim() || !contact.trim()) { setError(t("Enter your name and how to reach you")); return }
    setSending(true)
    setError(null)
    const form = new FormData()
    form.set("name", name.trim())
    form.set("contact", contact.trim())
    form.set("message", message.trim())
    form.set("company", trap)
    files.forEach((f) => form.append("files", f))
    const res = await fetch(`/api/page/${encodeURIComponent(slug)}/request`, { method: "POST", body: form }).catch(() => null)
    setSending(false)
    if (res?.ok) { setStep(3); return }
    const body = await res?.json().catch(() => null)
    setError(body?.error === "slow_down" ? t("Too many requests. Try again in a few minutes.") : t("Couldn't send the request. Try again."))
  }

  const field = "w-full rounded-md border border-[var(--pg-border)] bg-[var(--pg-bg)] px-3.5 py-2.5 text-[16px] text-[var(--pg-text)] outline-none placeholder:text-[var(--pg-muted)] focus:border-[var(--pg-text)] sm:text-sm"
  const primary = "h-10 rounded-md bg-[var(--pg-accent)] px-5 text-sm font-semibold text-[var(--pg-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-40"
  const secondary = "h-10 rounded-md border border-[var(--pg-border)] px-4 text-sm font-medium"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-lg bg-[var(--pg-bg)] p-5 shadow-2xl @3xl:p-6">
        <button type="button" aria-label={t("Close")} onClick={onClose} className="absolute top-4 right-4 rounded-full p-1.5 text-[var(--pg-muted)] hover:bg-[var(--pg-field)]"><XIcon className="size-5" /></button>
        {step === 3 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-xl font-semibold">{t("Request sent")}</p>
            <p className="text-sm text-[var(--pg-muted)]">{t("{name} will get back to you soon.", { name: data.title })}</p>
            <button type="button" onClick={onClose} className={`${primary} mt-4`}>{t("Done")}</button>
          </div>
        ) : (
          <>
            <h2 className="pr-8 text-2xl font-semibold tracking-tight">{t("Contact this workshop")}</h2>
            <div>
              <p className="mb-1.5 text-sm">{t("To:")}</p>
              <div className="flex items-center gap-2.5">
                <Avatar data={data} initials={initials} className="size-9 text-xs" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{data.title}</span>
                  {count > 0 && <span className="flex items-center gap-1.5 text-xs text-[var(--pg-muted)]"><Stars value={rating} className="size-3" />{t("Reviews: {n}", { n: count })}</span>}
                </span>
              </div>
            </div>
            {step === 1 ? (
              <>
                <label className="flex flex-col gap-1.5 text-sm">
                  {t("Message:")}
                  <textarea autoFocus className={`${field} min-h-44 resize-y`} placeholder={t("Tell what you have in mind: what to make, sizes, wishes, dates…")}
                    value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
                </label>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={onClose} className={secondary}>{t("Cancel")}</button>
                  <button type="button" disabled={!message.trim()} onClick={() => setStep(2)} className={primary}>{t("Next")}</button>
                </div>
              </>
            ) : (
              <>
                <input autoFocus className={field} placeholder={t("Your name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
                <input className={field} placeholder={t("Phone, Telegram or Instagram")} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} />
                <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} name="company" />
                <div className="flex flex-wrap items-center gap-2">
                  {files.map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-md bg-[var(--pg-field)] px-2.5 py-1.5 text-xs">
                      <span className="max-w-32 truncate">{f.name}</span>
                      <button type="button" aria-label={t("Remove")} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}><XIcon className="size-3.5" /></button>
                    </span>
                  ))}
                  {files.length < MAX_FILES && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[var(--pg-muted)] hover:text-[var(--pg-text)]">
                      <ImagePlusIcon className="size-4" /> {t("Add photos")}
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
                </div>
                {error && <p className="text-sm text-[#c2410c]">{error}</p>}
                <div className="flex justify-between gap-2">
                  <button type="button" onClick={() => setStep(1)} className={secondary}>{t("Back")}</button>
                  <button type="submit" disabled={sending} className={primary}>{sending ? t("Sending...") : t("Send request")}</button>
                </div>
              </>
            )}
          </>
        )}
      </form>
    </div>
  )
}
