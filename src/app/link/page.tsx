"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CopyIcon, ExternalLinkIcon, ImagePlusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageView } from "@/components/page/PageView"
import { getOrCreateShop } from "@/lib/shop"
import { uploadPublicAsset } from "@/lib/files"
import { shrinkImage } from "@/lib/image"
import { useT } from "@/lib/i18n"
import {
  ACCENTS, MAX_PORTFOLIO, MAX_SERVICES, cleanPage, emptyPage, normalizeSlug, pagePath, slugProblem,
  suggestSlug, type PageContacts, type PageData,
} from "@/lib/page"
import type { Shop } from "@/components/dashboard/types"

type SlugState = { slug: string; status: "idle" | "checking" | "ok" | "taken" | "invalid"; problem?: string }

const CONTACT_FIELDS: { key: keyof PageContacts; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@yourstudio" },
  { key: "telegram", label: "Telegram", placeholder: "@yourname" },
  { key: "viber", label: "Viber", placeholder: "+380 67 123 4567" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+1 555 123 4567" },
  { key: "phone", label: "Phone", placeholder: "+1 555 123 4567" },
  { key: "email", label: "Email", placeholder: "hello@studio.com" },
  { key: "website", label: "Website", placeholder: "studio.com" },
]

/** The workshop's public page editor: settings on the left, a live phone preview on the right. */
export default function LinkPage() {
  const router = useRouter()
  const { t } = useT()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [missingTable, setMissingTable] = useState(false)
  const [data, setData] = useState<PageData | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [slug, setSlug] = useState<SlugState>({ slug: "", status: "idle" })
  const [published, setPublished] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: shopData } = await getOrCreateShop(session.user)
      if (!shopData) { setLoading(false); return }
      setShop(shopData)
      const { data: row, error } = await supabase.from("shop_pages").select("*").eq("shop_id", shopData.id).maybeSingle()
      if (error && /shop_pages|relation|schema cache/i.test(error.message)) setMissingTable(true)
      if (row) {
        setData(cleanPage(row.data, shopData.name))
        setSavedSlug(row.slug)
        setSlug({ slug: row.slug, status: "ok" })
        setPublished(row.published)
      } else {
        setData(emptyPage(shopData.name, shopData.logo_url))
        // Suggest an address from the name and check it right away.
        const suggested = suggestSlug(shopData.name)
        const problem = slugProblem(suggested)
        if (problem) setSlug({ slug: suggested, status: "invalid", problem })
        else {
          const res = await fetch(`/api/page/slug?slug=${encodeURIComponent(suggested)}`).catch(() => null)
          const body = await res?.json().catch(() => null)
          setSlug({ slug: suggested, status: body?.available ? "ok" : "taken" })
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  // Check the address while typing (after a short pause).
  const checkTimer = useRef<number | undefined>(undefined)
  const checkSlug = useCallback((value: string) => {
    window.clearTimeout(checkTimer.current)
    const problem = slugProblem(value)
    if (problem) { setSlug({ slug: value, status: "invalid", problem }); return }
    if (value === savedSlug) { setSlug({ slug: value, status: "ok" }); return }
    setSlug({ slug: value, status: "checking" })
    checkTimer.current = window.setTimeout(async () => {
      const res = await fetch(`/api/page/slug?slug=${encodeURIComponent(value)}`).catch(() => null)
      const body = await res?.json().catch(() => null)
      setSlug((cur) => cur.slug !== value ? cur : { slug: value, status: body?.available ? "ok" : "taken" })
    }, 400)
  }, [savedSlug])

  function update(patch: Partial<PageData>) {
    setData((d) => (d ? { ...d, ...patch } : d))
    setDirty(true)
    setMessage(null)
  }

  async function upload(file: File | undefined, kind: "avatar" | "banner" | "portfolio") {
    if (!file || !shop || !data) return
    if (!file.type.startsWith("image/")) { setMessage({ kind: "error", text: t("Choose an image file") }); return }
    setUploading(kind)
    try {
      const small = await shrinkImage(file, kind === "avatar" ? 600 : 1600)
      if (small.size > 4 * 1024 * 1024) throw new Error(t("Image must be under 4 MB"))
      const url = await uploadPublicAsset(shop.id, small, `page-${kind}`)
      if (kind === "avatar") update({ avatar_url: url })
      else if (kind === "banner") update({ banner_url: url })
      else update({ portfolio: [...data.portfolio, url].slice(0, MAX_PORTFOLIO) })
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error)?.message || t("Upload failed") })
    }
    setUploading(null)
  }

  async function save(publish?: boolean) {
    if (!shop || !data) return
    if (slug.status !== "ok") { setMessage({ kind: "error", text: t("Choose a free page address first") }); return }
    setSaving(true)
    setMessage(null)
    const nextPublished = publish ?? published
    const row = { shop_id: shop.id, slug: slug.slug, published: nextPublished, data: cleanPage(data, shop.name), updated_at: new Date().toISOString() }
    const { error } = await supabase.from("shop_pages").upsert(row, { onConflict: "shop_id" })
    setSaving(false)
    if (error) {
      const taken = /duplicate|unique/i.test(error.message)
      if (taken) setSlug({ slug: slug.slug, status: "taken" })
      setMessage({
        kind: "error",
        text: taken ? t("This address is already taken") : /shop_pages|relation|schema cache/i.test(error.message) ? t("Run supabase/pages.sql in Supabase first, then try again.") : error.message,
      })
      return
    }
    setSavedSlug(slug.slug)
    setPublished(nextPublished)
    setDirty(false)
    setMessage({ kind: "ok", text: publish === true ? t("Your page is live") : publish === false ? t("Page hidden") : t("Saved") })
  }

  const publicUrl = typeof window !== "undefined" && savedSlug ? `${window.location.origin}${pagePath(savedSlug)}` : ""

  async function copyLink() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (loading || !data) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">{t("Loading...")}</p></div>
  }

  const services = data.services
  const moveService = (i: number, d: -1 | 1) => {
    const next = [...services]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    update({ services: next })
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage="link" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader shopName={shop?.name || ""} avatarUrl="" sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 p-4 sm:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-medium tracking-tight">{t("My page")}</h1>
                <p className="text-sm text-muted-foreground">{t("One link for Instagram and clients: your work, prices, contacts and a request form.")}</p>
              </div>
              <div className="flex items-center gap-2">
                {message && <span className={`text-xs ${message.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message.text}</span>}
                <Button variant="outline" onPress={() => save()} isDisabled={saving || !dirty}>{saving ? t("Saving...") : t("Save")}</Button>
                {published
                  ? <Button variant="outline" onPress={() => save(false)} isDisabled={saving}>{t("Hide page")}</Button>
                  : <Button onPress={() => save(true)} isDisabled={saving}>{t("Publish")}</Button>}
              </div>
            </div>

            {missingTable && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("Run supabase/pages.sql in Supabase first, then try again.")}</p>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* Settings */}
              <div className="flex flex-col gap-4">
                <Section title={t("Address")}>
                  <div className="flex items-center rounded-lg border border-input focus-within:border-ring">
                    <span className="shrink-0 pl-2.5 text-sm text-muted-foreground">{typeof window !== "undefined" ? window.location.host : ""}/@</span>
                    <input
                      aria-label={t("Page address")}
                      value={slug.slug}
                      onChange={(e) => { const v = normalizeSlug(e.target.value); checkSlug(v); setDirty(true) }}
                      className="h-9 min-w-0 flex-1 bg-transparent pr-2.5 text-base outline-none md:text-sm"
                      maxLength={30}
                    />
                  </div>
                  <p className={`text-xs ${slug.status === "ok" ? "text-[var(--status-approved)]" : slug.status === "checking" || slug.status === "idle" ? "text-muted-foreground" : "text-destructive"}`}>
                    {slug.status === "ok" ? t("Address is free") : slug.status === "checking" ? t("Checking...") : slug.status === "taken" ? t("This address is already taken") : slug.status === "invalid" ? t(slug.problem!) : ""}
                  </p>
                  {savedSlug && published && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onPress={copyLink}>{copied ? <CheckIcon /> : <CopyIcon />}{copied ? t("Copied") : t("Copy Link")}</Button>
                      <a href={pagePath(savedSlug)} target="_blank" rel="noopener" className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-hover">
                        <ExternalLinkIcon className="size-3.5" />{t("Open page")}
                      </a>
                    </div>
                  )}
                  {!published && <p className="text-xs text-muted-foreground">{t("The page is hidden until you publish it.")}</p>}
                </Section>

                <Section title={t("Header")}>
                  <div className="flex items-center gap-4">
                    <ImagePick label={t("Photo or logo")} src={data.avatar_url} round busy={uploading === "avatar"} onPick={(f) => upload(f, "avatar")} onClear={() => update({ avatar_url: null })} />
                    <ImagePick label={t("Cover")} src={data.banner_url} wide busy={uploading === "banner"} onPick={(f) => upload(f, "banner")} onClear={() => update({ banner_url: null })} />
                  </div>
                  <Field label={t("Name")}>
                    <Input value={data.title} onChange={(e) => update({ title: e.target.value })} maxLength={80} />
                  </Field>
                  <Field label={t("One line about you")}>
                    <Input value={data.tagline} placeholder={t("Custom kitchens · Austin")} onChange={(e) => update({ tagline: e.target.value })} maxLength={120} />
                  </Field>
                  <Field label={t("About")}>
                    <Textarea value={data.bio} placeholder={t("What you make, how you work, what clients love.")} onChange={(e) => update({ bio: e.target.value })} maxLength={600} />
                  </Field>
                </Section>

                <Section title={t("Contacts")} hint={t("Only filled ones show on the page.")}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CONTACT_FIELDS.map((c) => (
                      <Field key={c.key} label={t(c.label)}>
                        <Input value={data.contacts[c.key] ?? ""} placeholder={c.placeholder} maxLength={120}
                          onChange={(e) => update({ contacts: { ...data.contacts, [c.key]: e.target.value } })} />
                      </Field>
                    ))}
                  </div>
                </Section>

                <Section title={t("Services and prices")}>
                  {services.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input aria-label={t("Service")} value={s.name} placeholder={t("Service")} maxLength={80} className="flex-1"
                        onChange={(e) => update({ services: services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                      <Input aria-label={t("Price")} value={s.price} placeholder={t("from $500")} maxLength={40} className="w-32"
                        onChange={(e) => update({ services: services.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })} />
                      <IconBtn label={t("Move up")} onClick={() => moveService(i, -1)} disabled={i === 0}><ArrowUpIcon /></IconBtn>
                      <IconBtn label={t("Move down")} onClick={() => moveService(i, 1)} disabled={i === services.length - 1}><ArrowDownIcon /></IconBtn>
                      <IconBtn label={t("Remove")} onClick={() => update({ services: services.filter((_, j) => j !== i) })}><Trash2Icon /></IconBtn>
                    </div>
                  ))}
                  {services.length < MAX_SERVICES && (
                    <Button size="sm" variant="outline" className="self-start" onPress={() => update({ services: [...services, { name: "", price: "" }] })}>
                      <PlusIcon />{t("Add service")}
                    </Button>
                  )}
                </Section>

                <Section title={t("Portfolio")} hint={t("Up to {n} photos of your work.", { n: MAX_PORTFOLIO })}>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {data.portfolio.map((src) => (
                      <div key={src} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                        <img src={src} alt="" className="size-full object-cover" />
                        <button type="button" aria-label={t("Remove")} onClick={() => update({ portfolio: data.portfolio.filter((p) => p !== src) })}
                          className="absolute top-1 right-1 rounded-md bg-black/60 p-1 text-white opacity-90 hover:opacity-100">
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {data.portfolio.length < MAX_PORTFOLIO && (
                      <FileButton busy={uploading === "portfolio"} multiple onFiles={async (files) => { for (const f of files.slice(0, MAX_PORTFOLIO - data.portfolio.length)) await upload(f, "portfolio") }}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-hover">
                        <ImagePlusIcon className="size-5" />{uploading === "portfolio" ? t("Uploading...") : t("Add")}
                      </FileButton>
                    )}
                  </div>
                </Section>

                <Section title={t("Request form")}>
                  <Toggle checked={data.requests} onChange={(v) => update({ requests: v })} label={t("Clients can leave a request on the page")} />
                  {data.requests && (
                    <Field label={t("Button text")}>
                      <Input value={data.cta} placeholder={t("Leave a request")} maxLength={40} onChange={(e) => update({ cta: e.target.value })} />
                    </Field>
                  )}
                  <p className="text-xs text-muted-foreground">{t("Requests arrive in Requests and in your Telegram or email notifications.")}</p>
                </Section>

                <Section title={t("Look")}>
                  <div className="flex gap-2">
                    {(["light", "dark"] as const).map((th) => (
                      <button key={th} type="button" onClick={() => update({ theme: th })}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${data.theme === th ? "border-foreground font-medium" : "border-border text-muted-foreground hover:bg-hover"}`}>
                        {th === "light" ? t("Light") : t("Dark")}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {ACCENTS.map((a) => (
                      <button key={a} type="button" aria-label={a} onClick={() => update({ accent: a })}
                        className={`size-8 rounded-full ring-offset-2 ring-offset-background ${data.accent === a ? "ring-2 ring-foreground" : ""}`} style={{ background: a }} />
                    ))}
                  </div>
                </Section>
              </div>

              {/* Live preview */}
              <div className="lg:sticky lg:top-6 lg:self-start">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">{t("Preview")}</p>
                <div className="mx-auto h-[720px] w-full max-w-[380px] overflow-hidden rounded-[36px] border-8 border-foreground/90 bg-background shadow-xl">
                  <div className="h-full overflow-y-auto">
                    <PageView data={cleanPage(data, shop?.name ?? "")} slug={slug.slug} preview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground disabled:opacity-30 [&_svg]:size-4">
      {children}
    </button>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left text-sm">
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-foreground" : "bg-muted"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-background transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  )
}

function FileButton({ onFiles, multiple, busy, className, children }: { onFiles: (files: File[]) => void; multiple?: boolean; busy?: boolean; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={() => ref.current?.click()}>{children}</button>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) onFiles(files) }} />
    </>
  )
}

function ImagePick({ label, src, round, wide, busy, onPick, onClear }: {
  label: string; src: string | null; round?: boolean; wide?: boolean; busy?: boolean
  onPick: (file: File) => void; onClear: () => void
}) {
  const { t } = useT()
  const box = `${round ? "size-16 rounded-full" : wide ? "h-16 w-32 rounded-lg" : "size-16 rounded-lg"} overflow-hidden bg-muted flex items-center justify-center`
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <FileButton busy={busy} onFiles={(f) => onPick(f[0])} className={`${box} text-muted-foreground hover:opacity-80`}>
          {src ? <img src={src} alt="" className="size-full object-cover" /> : <ImagePlusIcon className="size-5" />}
        </FileButton>
        {src && <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">{t("Remove")}</button>}
      </div>
      {busy && <span className="text-xs text-muted-foreground">{t("Uploading...")}</span>}
    </div>
  )
}
