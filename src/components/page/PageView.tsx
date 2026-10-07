"use client"

import { useRef, useState } from "react"
import { GlobeIcon, ImagePlusIcon, MailIcon, MessageCircleIcon, PhoneIcon, SendIcon, XIcon } from "lucide-react"
import { useT } from "@/lib/i18n"
import { ACCENTS, CONTACT_KEYS, pageContactHref, type PageContacts, type PageData } from "@/lib/page"
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

const SHAPE = { pill: "rounded-full", rounded: "rounded-2xl", square: "rounded-md" } as const

function Avatar({ data, initials, className = "" }: { data: PageData; initials: string; className?: string }) {
  return (
    <div className={`flex size-24 items-center justify-center overflow-hidden rounded-full bg-[var(--pg-card)] text-2xl font-semibold ${className}`}>
      {data.avatar_url ? <img src={data.avatar_url} alt="" className="size-full object-cover" /> : initials}
    </div>
  )
}

export const CONTACT_LABEL: Record<keyof PageContacts, string> = {
  instagram: "Instagram", telegram: "Telegram", viber: "Viber", whatsapp: "WhatsApp",
  phone: "Phone", email: "Email", website: "Website",
}

/**
 * The public page. `preview` is the editor's live copy: links stay inert and the request
 * form doesn't send.
 */
export function PageView({ data, slug, preview = false }: { data: PageData; slug: string; preview?: boolean }) {
  const { t } = useT()
  const [zoom, setZoom] = useState<string | null>(null)
  const contacts = CONTACT_KEYS
    .map((key) => ({ key, value: data.contacts[key], href: data.contacts[key] ? pageContactHref(key, data.contacts[key]!) : null }))
    .filter((c) => c.value && c.href)
  const initials = data.title.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "N"

  function scrollToForm(e: React.MouseEvent) {
    e.preventDefault()
    document.getElementById(preview ? "pg-request-preview" : "pg-request")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const contactLinks = (pills: boolean) => contacts.map((c) => (
    <a
      key={c.key}
      href={preview ? undefined : c.href!}
      target={c.key === "website" || c.key === "instagram" ? "_blank" : undefined}
      rel="noopener noreferrer"
      aria-label={CONTACT_LABEL[c.key]}
      title={CONTACT_LABEL[c.key]}
      className={pills
        ? "flex h-10 items-center gap-2 rounded-full border border-[var(--pg-border)] bg-[var(--pg-card)] px-4 text-sm font-medium transition-colors hover:border-[var(--pg-text)] [&_svg]:size-4"
        : "flex size-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--pg-card)] [&_svg]:size-5"}
    >
      {CONTACT_ICON[c.key]}
      {pills && t(CONTACT_LABEL[c.key])}
    </a>
  ))

  // Laid out by its own width (a container), not the screen's: the editor previews it as a phone or a computer.
  return (
    <div style={palette(data)} className="@container min-h-full bg-[var(--pg-bg)] text-[var(--pg-text)]">
      {/* Phone: centred, like a link-in-bio page */}
      <div className="mx-auto flex w-full max-w-[560px] flex-col @4xl:hidden">
        {data.banner_url ? (
          <div className="relative mb-14">
            <div className="h-36 w-full overflow-hidden sm:h-44 sm:rounded-b-3xl">
              <img src={data.banner_url} alt="" className="size-full object-cover" />
            </div>
            <Avatar data={data} initials={initials} className="absolute -bottom-12 left-1/2 -translate-x-1/2 ring-4 ring-[var(--pg-bg)]" />
          </div>
        ) : (
          <div className="flex justify-center pt-12 pb-1">
            <Avatar data={data} initials={initials} />
          </div>
        )}
        <div className="mt-3 flex flex-col items-center gap-1 px-5 text-center">
          <h1 className="text-[22px] font-semibold tracking-tight">{data.title || t("Your name")}</h1>
          {data.tagline && <p className="text-sm text-[var(--pg-muted)]">{data.tagline}</p>}
        </div>
        {contacts.length > 0 && <div className="mt-4 flex flex-wrap justify-center gap-1.5 px-5">{contactLinks(false)}</div>}
      </div>

      {/* Computer: a workshop's site — wide cover, the name on the left, contacts as buttons */}
      <div className="hidden @4xl:block">
        <div className="h-64 overflow-hidden bg-[var(--pg-card)]">
          {data.banner_url ? (
            <img src={data.banner_url} alt="" className="size-full object-cover" />
          ) : data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="size-full scale-125 object-cover opacity-50 blur-3xl" />
          ) : (
            <div className="size-full" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--pg-accent) 22%, var(--pg-card)), var(--pg-card) 70%)" }} />
          )}
        </div>
        <div className="mx-auto flex max-w-[1120px] items-end gap-6 px-10">
          <Avatar data={data} initials={initials} className="-mt-16 shrink-0 ring-[6px] ring-[var(--pg-bg)] @4xl:size-32 @4xl:text-4xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
            <h1 className="truncate text-[32px] leading-tight font-semibold tracking-tight">{data.title || t("Your name")}</h1>
            {data.tagline && <p className="text-[15px] text-[var(--pg-muted)]">{data.tagline}</p>}
          </div>
        </div>
        {contacts.length > 0 && <div className="mx-auto mt-6 flex max-w-[1120px] flex-wrap gap-2 px-10">{contactLinks(true)}</div>}
      </div>

      {/* The rest: one column on a phone; on a computer the request form sits on the right and follows the scroll */}
      <div className="mx-auto w-full max-w-[560px] pb-10 @4xl:mt-10 @4xl:grid @4xl:max-w-[1120px] @4xl:grid-cols-[minmax(0,1fr)_360px] @4xl:items-start @4xl:gap-12 @4xl:px-10">
        <div className="flex flex-col">
          {data.bio && (
            <section className="mt-3 px-5 @4xl:mt-0 @4xl:px-0">
              <h2 className="mb-3 hidden text-xs font-medium tracking-wide text-[var(--pg-muted)] uppercase @4xl:block">{t("About us")}</h2>
              <p className="mx-auto max-w-md text-center text-[15px] leading-relaxed whitespace-pre-line @4xl:mx-0 @4xl:max-w-none @4xl:text-left @4xl:text-base">{data.bio}</p>
            </section>
          )}

          {/* Request button (phones only: computers show the form alongside) and link buttons */}
          {(data.requests || data.links.length > 0) && (
            <div className={`mt-6 flex flex-col gap-3 px-5 @4xl:px-0 ${data.links.length ? "" : "@4xl:hidden"} ${data.bio ? "@4xl:mt-9" : "@4xl:mt-0"}`}>
              {data.requests && (
                <a href="#request" onClick={scrollToForm}
                  className={`flex min-h-14 items-center justify-center px-5 text-center text-[15px] font-medium transition-transform hover:scale-[1.015] bg-[var(--pg-accent)] text-[var(--pg-on-accent)] @4xl:hidden ${SHAPE[data.buttons]}`}>
                  {data.cta || t("Leave a request")}
                </a>
              )}
              {data.links.length > 0 && <h2 className="hidden text-xs font-medium tracking-wide text-[var(--pg-muted)] uppercase @4xl:block">{t("Links")}</h2>}
              {data.links.length > 0 && (
                <div className="flex flex-col gap-3 @4xl:grid @4xl:grid-cols-2">
                  {data.links.map((l, i) => (
                    <a key={i} href={preview ? undefined : l.url} target="_blank" rel="noopener noreferrer"
                      className={`flex min-h-14 items-center justify-center border border-[var(--pg-border)] bg-[var(--pg-card)] px-5 text-center text-[15px] font-medium transition-transform hover:scale-[1.015] ${SHAPE[data.buttons]}`}>
                      {l.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {data.services.length > 0 && (
            <section className="mt-9 px-5 @4xl:px-0">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-[var(--pg-muted)] uppercase">{t("Services")}</h2>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-card)]">
                {data.services.map((s, i) => (
                  <div key={i} className={`flex items-baseline justify-between gap-4 px-4 py-3.5 @4xl:px-5 @4xl:py-4 ${i ? "border-t border-[var(--pg-border)]" : ""}`}>
                    <span className="text-[15px]">{s.name}</span>
                    {s.price && <span className="shrink-0 text-sm font-medium tabular-nums">{s.price}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.portfolio.length > 0 && (
            <section className="mt-9 px-5 @4xl:px-0">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-[var(--pg-muted)] uppercase">{t("Portfolio")}</h2>
              <div className="grid grid-cols-3 gap-1.5 @4xl:gap-3">
                {data.portfolio.map((src) => (
                  <button key={src} type="button" onClick={() => setZoom(src)} className="aspect-square overflow-hidden rounded-lg bg-[var(--pg-card)] @4xl:aspect-[4/3] @4xl:rounded-xl">
                    <img src={src} alt="" loading="lazy" className="size-full object-cover transition-transform hover:scale-[1.03]" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col @4xl:sticky @4xl:top-6">
          {data.requests && (
            <section id={preview ? "pg-request-preview" : "pg-request"} className="mt-9 scroll-mt-4 px-5 @4xl:mt-0 @4xl:px-0">
              <RequestForm slug={slug} title={data.title} preview={preview} />
            </section>
          )}
          <a
            href={preview ? undefined : "/?ref=page"}
            className="mt-10 self-center text-xs text-[var(--pg-muted)] transition-colors hover:text-[var(--pg-text)] @4xl:mt-6"
          >
            {t("Made with Nodly")}
          </a>
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)} role="dialog" aria-modal="true">
          <button type="button" aria-label={t("Close")} className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white" onClick={() => setZoom(null)}>
            <XIcon className="size-5" />
          </button>
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
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
