"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import {
  BanknoteIcon, CalendarIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, GlobeIcon, HourglassIcon, ImageIcon, ImagePlusIcon,
  ImagesIcon, MailIcon, MapIcon, MapPinIcon, MessageCircleIcon, PhoneIcon, RulerIcon, SendIcon, Share2Icon, ShieldCheckIcon,
  StarIcon, UsersIcon, XIcon,
} from "lucide-react"
import { useT } from "@/lib/i18n"
import {
  ACCENTS, BUSINESS_KEYS, CONTACT_KEYS, pageContactHref, type PageBusiness, type PageContacts, type PageData, type PageHours,
  type PageReview,
} from "@/lib/page"
import { shrinkImage } from "@/lib/image"

/** Colours of the page itself: it keeps its own look whatever theme the visitor uses on Nodly. */
function palette(data: PageData) {
  const dark = data.theme === "dark"
  // The darkest accent would vanish on a dark page: it turns light there.
  const accent = dark && data.accent === ACCENTS[0] ? "#efeeec" : data.accent
  return {
    "--pg-bg": dark ? "#141312" : "#f6f5f3",
    "--pg-card": dark ? "#1e1d1c" : "#ffffff",
    "--pg-text": dark ? "#ecebea" : "#1f1e1d",
    "--pg-muted": dark ? "rgba(236,235,234,0.62)" : "rgba(31,30,29,0.6)",
    "--pg-border": dark ? "rgba(236,235,234,0.12)" : "rgba(31,30,29,0.1)",
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

const SHAPE = { pill: "rounded-full", rounded: "rounded-xl", square: "rounded-md" } as const

/** Weekday names, Monday first (1 Jan 2024 was a Monday). */
export function weekdays(locale: string, style: "short" | "long" = "short") {
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: style }))
}

const hasHours = (hours: PageHours) => hours.some(Boolean)
const noop = () => () => {}

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
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={`${className} ${i <= Math.round(value) ? "fill-[#f5a524] text-[#f5a524]" : "fill-none text-[var(--pg-border)]"}`} />
      ))}
    </span>
  )
}

function Avatar({ data, initials, className = "" }: { data: PageData; initials: string; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--pg-card)] font-semibold ring-1 ring-[var(--pg-border)] ${className}`}>
      {data.avatar_url ? <img src={data.avatar_url} alt="" className="size-full object-cover" /> : initials}
    </div>
  )
}

function Section({ id, title, aside, children }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-14 border-b border-[var(--pg-border)] px-5 py-8 last:border-none @3xl:px-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/**
 * The workshop's public page, built like a Houzz profile: cover, name and rating, sections
 * (about, projects, services, business, reviews, contacts) and a request form. `preview` is the
 * editor's live copy: links stay inert and forms don't send.
 */
export function PageView({ data, slug, reviews = [], preview = false }: {
  data: PageData
  slug: string
  reviews?: PageReview[]
  preview?: boolean
}) {
  const { t, locale } = useT()
  const [project, setProject] = useState<number | null>(null)
  const [moreAbout, setMoreAbout] = useState(false)
  const [shared, setShared] = useState(false)
  const [added, setAdded] = useState<PageReview[]>([])
  const openNow = useOpenNow(data.hours)

  const contacts = CONTACT_KEYS
    .map((key) => ({ key, value: data.contacts[key], href: data.contacts[key] ? pageContactHref(key, data.contacts[key]!) : null }))
    .filter((c) => c.value && c.href)
  const initials = data.title.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "N"
  const facts = BUSINESS_KEYS.filter((k) => data.business[k])
  const allReviews = [...added, ...reviews]
  const rating = allReviews.length ? allReviews.reduce((n, r) => n + r.rating, 0) / allReviews.length : 0
  const longAbout = data.bio.length > 280 || data.bio.split("\n").length > 4
  const days = weekdays(locale)
  const today = useSyncExternalStore(noop, () => (new Date().getDay() + 6) % 7, () => -1)

  // Section ids differ in the editor's preview, so they never clash with the editor itself.
  const sid = (s: string) => (preview ? `pg-${s}-preview` : `pg-${s}`)
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(sid(id))?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const tabs = ([
    [!!data.bio, "about", t("About us")],
    [data.projects.length > 0, "projects", t("Projects")],
    [data.services.length > 0, "services", t("Services & prices")],
    [facts.length > 0 || hasHours(data.hours), "business", t("Business")],
    [true, "reviews", t("Reviews")],
    [contacts.length > 0, "contacts", t("Contacts")],
  ] as [boolean, string, string][]).filter(([on]) => on)

  async function share() {
    if (preview) return
    const url = window.location.href
    if (navigator.share) { await navigator.share({ title: data.title, url }).catch(() => {}); return }
    await navigator.clipboard.writeText(url).catch(() => {})
    setShared(true)
    window.setTimeout(() => setShared(false), 1500)
  }

  const btn = `flex h-10 items-center gap-2 border border-[var(--pg-border)] bg-[var(--pg-card)] px-4 text-sm font-medium transition-colors hover:border-[var(--pg-text)] [&_svg]:size-4 ${SHAPE[data.buttons]}`
  const open = project !== null ? data.projects[project] : null

  // Laid out by its own width (a container), not the screen's: the editor previews it as a phone or a computer.
  return (
    <div style={palette(data)} className="@container min-h-full bg-[var(--pg-bg)] text-[var(--pg-text)]">
      <div className="mx-auto w-full max-w-[1120px] pb-10 @3xl:px-8 @3xl:pt-6">
        {/* Cover: the workshop's photo; without one, its logo blurred, or a wash of the accent */}
        <div className="h-44 overflow-hidden bg-[var(--pg-card)] @3xl:h-[320px] @3xl:rounded-2xl">
          {data.banner_url ? (
            <img src={data.banner_url} alt="" className="size-full object-cover" />
          ) : data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="size-full scale-125 object-cover opacity-50 blur-3xl" />
          ) : (
            <div className="size-full" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--pg-accent) 22%, var(--pg-card)), var(--pg-card) 70%)" }} />
          )}
        </div>

        {/* Logo, name, rating, category */}
        <div className="flex items-center gap-4 px-5 pt-5 @3xl:px-0 @3xl:pt-6">
          <Avatar data={data} initials={initials} className="size-[72px] text-xl @3xl:size-24 @3xl:text-2xl" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-[22px] leading-tight font-semibold tracking-tight @3xl:text-[28px]">{data.title || t("Your name")}</h1>
            {allReviews.length > 0 && (
              <a href="#reviews" onClick={go("reviews")} className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-semibold">{rating.toFixed(1)}</span>
                <Stars value={rating} />
                <span className="text-[var(--pg-muted)] hover:underline">{t("Reviews: {n}", { n: allReviews.length })}</span>
              </a>
            )}
            {data.tagline && <p className="text-sm text-[var(--pg-muted)]">{data.tagline}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 px-5 pt-5 @3xl:px-0">
          {data.requests && (
            <a href="#request" onClick={go("request")}
              className={`flex h-10 items-center bg-[var(--pg-accent)] px-5 text-sm font-medium text-[var(--pg-on-accent)] transition-opacity hover:opacity-90 @4xl:hidden ${SHAPE[data.buttons]}`}>
              {data.cta || t("Leave a request")}
            </a>
          )}
          <a href="#write-review" onClick={go("reviews")} className={btn}><StarIcon />{t("Write a review")}</a>
          <button type="button" onClick={share} className={btn}><Share2Icon />{shared ? t("Link copied") : t("Share")}</button>
          {openNow && (
            <span className={`flex h-10 items-center gap-1.5 px-2 text-sm font-medium ${openNow === "open" ? "text-[#2f8a4c]" : "text-[var(--pg-muted)]"}`}>
              <span className={`size-2 rounded-full ${openNow === "open" ? "bg-[#2f8a4c]" : "bg-[var(--pg-muted)]"}`} />
              {openNow === "open" ? t("Open now") : t("Closed now")}
            </span>
          )}
        </div>

        {/* Section tabs, pinned while scrolling */}
        <nav className="sticky top-0 z-10 mt-6 flex gap-6 overflow-x-auto border-b border-[var(--pg-border)] bg-[var(--pg-bg)] px-5 text-sm [scrollbar-width:none] @3xl:px-0">
          {tabs.map(([, id, label]) => (
            <a key={id} href={`#${id}`} onClick={go(id)}
              className="shrink-0 border-b-2 border-transparent py-3 font-medium whitespace-nowrap text-[var(--pg-muted)] transition-colors hover:border-[var(--pg-text)] hover:text-[var(--pg-text)]">
              {label}
            </a>
          ))}
        </nav>

        {/* Sections; on a computer the request form sits on the right and follows the scroll */}
        <div className="@4xl:grid @4xl:grid-cols-[minmax(0,1fr)_340px] @4xl:items-start @4xl:gap-12">
          <div className="flex min-w-0 flex-col">
            {data.bio && (
              <Section id={sid("about")} title={t("About us")}>
                <p className={`text-[15px] leading-relaxed whitespace-pre-line ${longAbout && !moreAbout ? "line-clamp-4" : ""}`}>{data.bio}</p>
                {longAbout && (
                  <button type="button" onClick={() => setMoreAbout((v) => !v)} className="mt-2 flex items-center gap-1 text-sm font-semibold">
                    {moreAbout ? t("Show less") : t("Read more")}
                    <ChevronDownIcon className={`size-4 transition-transform ${moreAbout ? "rotate-180" : ""}`} />
                  </button>
                )}
                {data.links.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {data.links.map((l, i) => (
                      <a key={i} href={preview ? undefined : l.url} target="_blank" rel="noopener noreferrer" className={btn}>{l.title}</a>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {data.projects.length > 0 && (
              <Section id={sid("projects")} title={t("Projects: {n}", { n: data.projects.length })}>
                <div className="grid gap-4 @md:grid-cols-2">
                  {data.projects.map((p, i) => (
                    <button key={i} type="button" onClick={() => setProject(i)}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)] text-left">
                      <span className="relative block aspect-[4/3] overflow-hidden bg-[var(--pg-field)]">
                        {p.photos[0]
                          ? <img src={p.photos[0]} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                          : <span className="flex size-full items-center justify-center text-[var(--pg-muted)]"><ImageIcon className="size-8" /></span>}
                        {p.photos.length > 0 && (
                          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white">
                            <ImagesIcon className="size-3.5" />{p.photos.length}
                          </span>
                        )}
                      </span>
                      <span className="flex flex-col gap-1 px-4 py-3.5">
                        <span className="font-medium">{p.title || t("Our work")}</span>
                        {p.city && <span className="flex items-center gap-1 text-xs text-[var(--pg-muted)]"><MapPinIcon className="size-3.5" />{p.city}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {data.services.length > 0 && (
              <Section id={sid("services")} title={t("Services & prices")}>
                <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)]">
                  {data.services.map((s, i) => (
                    <div key={i} className={`flex items-start justify-between gap-4 px-4 py-3.5 @3xl:px-5 @3xl:py-4 ${i ? "border-t border-[var(--pg-border)]" : ""}`}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[15px] font-medium">{s.name}</span>
                        {s.description && <span className="text-sm text-[var(--pg-muted)]">{s.description}</span>}
                      </span>
                      {s.price && <span className="shrink-0 text-[15px] font-semibold tabular-nums">{s.price}</span>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(facts.length > 0 || hasHours(data.hours)) && (
              <Section id={sid("business")} title={t("Business")}>
                <div className="flex flex-col gap-6 @2xl:flex-row @2xl:items-start">
                  {facts.length > 0 && (
                    <dl className="grid flex-1 gap-x-8 gap-y-5 @md:grid-cols-2">
                      {facts.map((k) => (
                        <div key={k} className="flex gap-3">
                          <span className="mt-0.5 text-[var(--pg-muted)] [&_svg]:size-5">{BUSINESS_FIELDS[k].icon}</span>
                          <div className="min-w-0">
                            <dt className="text-xs text-[var(--pg-muted)]">{t(BUSINESS_FIELDS[k].label)}</dt>
                            <dd className="mt-0.5 text-[15px] whitespace-pre-line">{data.business[k]}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  )}
                  {hasHours(data.hours) && (
                    <div className="rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)] p-4 @2xl:w-64">
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><ClockIcon className="size-4" />{t("Working hours")}</p>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {data.hours.map((d, i) => (
                          <li key={i} className={`flex justify-between gap-4 ${i === today ? "font-semibold" : ""}`}>
                            <span className="capitalize">{days[i]}</span>
                            <span className={d ? "tabular-nums" : "text-[var(--pg-muted)]"}>{d ? `${d.from}–${d.to}` : t("Day off")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>
            )}

            <Section id={sid("reviews")} title={t("Reviews")}
              aside={allReviews.length > 0 && <span className="flex items-center gap-1.5 text-sm"><span className="font-semibold">{rating.toFixed(1)}</span><Stars value={rating} /></span>}>
              <ReviewForm slug={slug} preview={preview} onSent={(r) => setAdded((list) => [r, ...list])} empty={allReviews.length === 0} />
              {allReviews.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  {allReviews.map((r) => (
                    <figure key={r.id} className="rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <figcaption className="text-sm font-semibold">{r.name}</figcaption>
                        <span className="text-xs text-[var(--pg-muted)]">{new Date(r.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      <Stars value={r.rating} className="mt-1.5 size-3.5" />
                      <blockquote className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{r.text}</blockquote>
                    </figure>
                  ))}
                </div>
              )}
            </Section>

            {contacts.length > 0 && (
              <Section id={sid("contacts")} title={t("Contacts")}>
                <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)]">
                  {contacts.map((c, i) => (
                    <a key={c.key} href={preview ? undefined : c.href!} target={c.key === "website" || c.key === "instagram" ? "_blank" : undefined} rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--pg-field)] [&_svg]:size-5 ${i ? "border-t border-[var(--pg-border)]" : ""}`}>
                      <span className="text-[var(--pg-muted)]">{CONTACT_ICON[c.key]}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-xs text-[var(--pg-muted)]">{t(CONTACT_LABEL[c.key])}</span>
                        <span className="truncate text-[15px]">{c.value}</span>
                      </span>
                      <ChevronRightIcon className="text-[var(--pg-muted)]" />
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <aside className="flex flex-col @4xl:sticky @4xl:top-16 @4xl:pt-8">
            {data.requests && (
              <section id={sid("request")} className="scroll-mt-14 px-5 py-8 @3xl:px-0 @4xl:py-0">
                <RequestForm slug={slug} title={data.title} preview={preview} />
              </section>
            )}
            <a href={preview ? undefined : "/?ref=page"} className="mt-2 self-center text-xs text-[var(--pg-muted)] transition-colors hover:text-[var(--pg-text)] @4xl:mt-5">
              {t("Made with Nodly")}
            </a>
          </aside>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/80 p-3 @3xl:p-10" role="dialog" aria-modal="true" onClick={() => setProject(null)}>
          <div className="relative h-fit w-full max-w-3xl rounded-2xl bg-[var(--pg-bg)] p-5 @3xl:p-7" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={t("Close")} onClick={() => setProject(null)}
              className="absolute top-4 right-4 rounded-full bg-[var(--pg-card)] p-2 ring-1 ring-[var(--pg-border)]"><XIcon className="size-5" /></button>
            <h3 className="pr-12 text-xl font-semibold tracking-tight">{open.title || t("Our work")}</h3>
            {open.city && <p className="mt-1 flex items-center gap-1 text-sm text-[var(--pg-muted)]"><MapPinIcon className="size-4" />{open.city}</p>}
            {open.description && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line">{open.description}</p>}
            <div className="mt-5 flex flex-col gap-3">
              {open.photos.map((src) => <img key={src} src={src} alt="" loading="lazy" className="w-full rounded-xl" />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** "Write a review": stars, a name and a few words. It shows at once; the workshop can delete it. */
function ReviewForm({ slug, preview, empty, onSent }: { slug: string; preview: boolean; empty: boolean; onSent: (r: PageReview) => void }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [trap, setTrap] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (preview) return
    if (!rating) { setError(t("Choose a rating")); return }
    if (!name.trim() || text.trim().length < 3) { setError(t("Enter your name and a few words")); return }
    setSending(true)
    setError(null)
    const res = await fetch(`/api/page/${encodeURIComponent(slug)}/review`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, name: name.trim(), text: text.trim(), company: trap }),
    }).catch(() => null)
    setSending(false)
    const body = await res?.json().catch(() => null)
    if (res?.ok && body?.review) { onSent(body.review); setSent(true); setOpen(false); return }
    setError(res?.status === 429 ? t("Too many requests. Try again in a few minutes.") : t("Couldn't send the review. Try again."))
  }

  if (sent) return <p className="rounded-2xl bg-[var(--pg-card)] px-4 py-3 text-sm ring-1 ring-[var(--pg-border)]">{t("Thank you for your review!")}</p>

  if (!open) {
    return (
      <div id="write-review" className="flex flex-col items-start gap-3">
        {empty && <p className="text-[15px] text-[var(--pg-muted)]">{t("No reviews yet. Worked with us? Tell others how it went.")}</p>}
        <button type="button" onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-full border border-[var(--pg-border)] bg-[var(--pg-card)] px-4 text-sm font-medium hover:border-[var(--pg-text)]">
          <StarIcon className="size-4" />{t("Write a review")}
        </button>
      </div>
    )
  }

  const field = "w-full rounded-xl border border-[var(--pg-border)] bg-[var(--pg-field)] px-3.5 py-3 text-[16px] text-[var(--pg-text)] outline-none placeholder:text-[var(--pg-muted)] focus:border-[var(--pg-accent)] sm:text-[15px]"
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)] p-4">
      <div className="flex items-center gap-1" role="radiogroup" aria-label={t("Rating")}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i}`} onClick={() => setRating(i)} className="p-0.5">
            <StarIcon className={`size-7 ${i <= rating ? "fill-[#f5a524] text-[#f5a524]" : "text-[var(--pg-border)]"}`} />
          </button>
        ))}
      </div>
      <input className={field} placeholder={t("Your name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
      <textarea className={`${field} min-h-24 resize-y`} placeholder={t("What did they make for you? How did it go?")} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
      <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} name="company" />
      {error && <p className="text-sm text-[#c2410c]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={sending}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--pg-accent)] text-[15px] font-medium text-[var(--pg-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-60">
          {sending ? t("Sending...") : t("Publish review")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl px-4 text-sm text-[var(--pg-muted)] hover:text-[var(--pg-text)]">{t("Cancel")}</button>
      </div>
    </form>
  )
}

const MAX_FILES = 3
const MAX_FILE_BYTES = 2 * 1024 * 1024

function RequestForm({ slug, title, preview }: { slug: string; title: string; preview: boolean }) {
  const { t } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [trap, setTrap] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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
    if (res?.ok) { setSent(true); return }
    const body = await res?.json().catch(() => null)
    setError(body?.error === "slow_down" ? t("Too many requests. Try again in a few minutes.") : t("Couldn't send the request. Try again."))
  }

  const field = "w-full rounded-xl border border-[var(--pg-border)] bg-[var(--pg-field)] px-3.5 py-3 text-[16px] text-[var(--pg-text)] outline-none placeholder:text-[var(--pg-muted)] focus:border-[var(--pg-accent)] sm:text-[15px]"

  if (sent) {
    return (
      <div className="rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)] px-5 py-8 text-center">
        <p className="text-lg font-medium">{t("Request sent")}</p>
        <p className="mt-1 text-sm text-[var(--pg-muted)]">{t("{name} will get back to you soon.", { name: title })}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)] p-4 sm:p-5">
      <h2 className="text-lg font-medium">{t("Leave a request")}</h2>
      <input className={field} placeholder={t("Your name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
      <input className={field} placeholder={t("Phone, Telegram or Instagram")} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} />
      <textarea className={`${field} min-h-28 resize-y`} placeholder={t("What would you like? Sizes, ideas, dates…")} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
      {/* Hidden from people; bots fill it in. */}
      <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} name="company" />

      <div className="flex flex-wrap items-center gap-2">
        {files.map((f, i) => (
          <span key={i} className="flex items-center gap-1.5 rounded-lg bg-[var(--pg-field)] px-2.5 py-1.5 text-xs">
            <span className="max-w-32 truncate">{f.name}</span>
            <button type="button" aria-label={t("Remove")} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
              <XIcon className="size-3.5" />
            </button>
          </span>
        ))}
        {files.length < MAX_FILES && (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[var(--pg-muted)] hover:text-[var(--pg-text)]">
            <ImagePlusIcon className="size-4" /> {t("Add photos")}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      </div>

      {error && <p className="text-sm text-[#c2410c]">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="mt-1 flex h-12 items-center justify-center rounded-xl bg-[var(--pg-accent)] text-[15px] font-medium text-[var(--pg-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {sending ? t("Sending...") : t("Send request")}
      </button>
    </form>
  )
}
