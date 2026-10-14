"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownIcon, ArrowUpIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, ExternalLinkIcon, EyeIcon, ImagePlusIcon, PlusIcon, Trash2Icon, XIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PageView, BUSINESS_FIELDS, CONTACT_ICON, CONTACT_LABEL, weekdays, type PageEditTarget } from "@/components/page/PageView"
import { DevicePreview } from "@/components/page/DevicePreview"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { AvatarPlaceholder, Block, FILLED, FILLED_AREA, Field, FileButton, IconBtn, ImagePick, Toggle } from "@/components/page/EditorBits"
import { getOrCreateShop } from "@/lib/shop"
import { uploadPublicAsset } from "@/lib/files"
import { shrinkImage } from "@/lib/image"
import { useT } from "@/lib/i18n"
import {
  ACCENTS, BUSINESS_KEYS, CONTACT_KEYS, MAX_CREDENTIALS, MAX_LINKS, MAX_PROJECT_PHOTOS, MAX_PROJECTS, MAX_SERVICES, cleanPage, emptyPage,
  normalizeSlug, pagePath, slugProblem, suggestSlug, type ButtonShape, type PageBusiness, type PageContacts, type PageData,
  type PageProject, type PageReview,
} from "@/lib/page"
import type { Shop } from "@/components/dashboard/types"
import { nicheConfig, type CrmNiche } from "@/lib/niches"
import { cleanBooking } from "@/lib/booking"
import { CITIES, UKRAINE, cityById } from "@/lib/cities"
import dynamic from "next/dynamic"

// the map loads only when the catalog block opens
const MapView = dynamic(() => import("@/components/catalog/MapView").then((m) => m.MapView), { ssr: false, loading: () => <div className="h-60 w-full animate-pulse rounded-xl bg-muted" /> })
import { Picker, TimePicker, Toggle as Switch } from "@/components/crm/Pickers"
import { BookingPage } from "@/components/booking/BookingPage"
import { PublicBooking, type PublicService } from "@/components/booking/PublicBooking"

type Section = "content" | "header" | "design" | "settings"
type ContentTab = "projects" | "services" | "reviews" | "credentials" | "links"
type SlugState = { slug: string; status: "checking" | "ok" | "taken" | "invalid"; problem?: string }
type SaveState = "saved" | "dirty" | "saving" | "error"

const CONTACT_PLACEHOLDER: Record<keyof PageContacts, string> = {
  instagram: "@yourstudio", telegram: "@yourname", viber: "+380 67 123 4567", whatsapp: "+1 555 123 4567",
  phone: "+1 555 123 4567", email: "hello@studio.com", website: "studio.com",
}
const QUICK_CONTACTS: (keyof PageContacts)[] = ["instagram", "telegram", "whatsapp", "email"]
const BUSINESS_PLACEHOLDER: Record<keyof PageBusiness, string> = {
  since: "2012", team: "3 people: SMM manager, designer, videographer", address: "Dnipro, 12 Naberezhna St",
  areas: "Dnipro, Samar, Pidhorodne and up to 50 km around", measure: "Free 15-minute call",
  terms: "Content plan in 3 days, first posts in a week", payment: "Monthly, paid upfront", warranty: "2 rounds of revisions included",
}

/** Hints for a beauty or cake business, in place of the agency ones above. */
const SALON_HINTS: Record<CrmNiche, { work: string; category: string; tagline: string; bio: string; team: string; payment: string }> = {
  nails: { work: "e.g. Nude manicure with a pattern", category: "Manicure and pedicure", tagline: "Nail master · Kyiv, Podil", bio: "e.g. Studio at Khreshchatyk 10, 2nd floor. Sterile tools, coffee included.", team: "2 nail masters", payment: "Cash or card" },
  barber: { work: "e.g. Fade with a beard trim", category: "Barbershop", tagline: "Men's haircuts · Lviv, centre", bio: "e.g. Haircuts, beards and hot towel shaves. Coffee or a drink while you wait.", team: "3 barbers", payment: "Cash or card" },
  cakes: { work: "e.g. Bento cake for a birthday", category: "Cakes to order", tagline: "Home bakery · Odesa", bio: "e.g. Cakes from natural ingredients. Pickup at Lvivska 12 or delivery around the city.", team: "Just me", payment: "50% upfront, the rest on pickup" },
}
const SALON_BUSINESS: (keyof PageBusiness)[] = ["since", "team", "address", "payment"]

/** Full-screen page editor: sections on the left, the content in the middle, the phone preview on the right. */
export default function PageEditor() {
  const router = useRouter()
  const { t, locale, lang } = useT()
  const [shop, setShop] = useState<Shop | null>(null)
  const [data, setData] = useState<PageData | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [slug, setSlug] = useState<SlugState>({ slug: "", status: "checking" })
  const [published, setPublished] = useState(false)
  const [save, setSave] = useState<SaveState>("saved")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [missingTable, setMissingTable] = useState(false)
  const [section, setSection] = useState<Section>("content")
  const [tab, setTab] = useState<ContentTab>("projects")
  const [reviews, setReviews] = useState<PageReview[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // the computer preview gets a wider column than the phone one
  const [wide, setWide] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [contactModal, setContactModal] = useState<ContactModalState>(null)
  const [copied, setCopied] = useState(false)
  // a beauty or cake business: its page leads with booking, and its services come from the CRM
  const [salon, setSalon] = useState<CrmNiche | null>(null)
  const [salonServices, setSalonServices] = useState<PublicService[]>([])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: shopData } = await getOrCreateShop(session.user)
      if (!shopData) return
      setShop(shopData)
      const crm = nicheConfig(shopData.niche)
      if (crm) {
        setSalon(crm.id)
        supabase.from("crm_services").select("id, title, duration_min, price, price_from, unit").eq("shop_id", shopData.id)
          .eq("archived", false).eq("kind", crm.kind).order("position", { ascending: true })
          .then(({ data: rows }) => setSalonServices((rows as PublicService[] | null) ?? []))
      }
      // Reviews clients left (a separate table; missing until pages.sql is run again — then just none).
      supabase.from("page_reviews").select("*").eq("shop_id", shopData.id)
        .order("created_at", { ascending: false }).limit(100)
        .then(({ data: rows }) => setReviews((rows as PageReview[] | null) ?? []))
      const { data: row, error } = await supabase.from("shop_pages").select("*").eq("shop_id", shopData.id).maybeSingle()
      if (error && /shop_pages|relation|schema cache/i.test(error.message)) setMissingTable(true)
      if (row) {
        const loaded = cleanPage(row.data, shopData.name)
        // the word for clients written in Online booking before it moved here
        setData(crm && !loaded.bio ? { ...loaded, bio: cleanBooking(shopData.booking).about } : loaded)
        setSavedSlug(row.slug)
        setSlug({ slug: row.slug, status: "ok" })
        setPublished(row.published)
        return
      }
      // A new page: suggest an address from the name and check it.
      setData(crm ? { ...emptyPage(shopData.name, shopData.logo_url), requests: false } : emptyPage(shopData.name, shopData.logo_url))
      setSave("dirty")
      const suggested = suggestSlug(shopData.name)
      const problem = slugProblem(suggested)
      if (problem) { setSlug({ slug: suggested, status: "invalid", problem }); return }
      const res = await fetch(`/api/page/slug?slug=${encodeURIComponent(suggested)}`).catch(() => null)
      const body = await res?.json().catch(() => null)
      setSlug({ slug: suggested, status: body?.available ? "ok" : "taken" })
    }
    init()
  }, [router])

  const checkTimer = useRef<number | undefined>(undefined)
  function changeSlug(raw: string) {
    const value = normalizeSlug(raw)
    window.clearTimeout(checkTimer.current)
    setSave("dirty")
    const problem = slugProblem(value)
    if (problem) { setSlug({ slug: value, status: "invalid", problem }); return }
    if (value === savedSlug) { setSlug({ slug: value, status: "ok" }); return }
    setSlug({ slug: value, status: "checking" })
    checkTimer.current = window.setTimeout(async () => {
      const res = await fetch(`/api/page/slug?slug=${encodeURIComponent(value)}`).catch(() => null)
      const body = await res?.json().catch(() => null)
      setSlug((cur) => (cur.slug !== value ? cur : { slug: value, status: body?.available ? "ok" : "taken" }))
    }, 400)
  }

  function update(patch: Partial<PageData>) {
    setData((d) => (d ? { ...d, ...patch } : d))
    setSave("dirty")
  }

  const persist = useCallback(async (publish?: boolean) => {
    if (!shop || !data || slug.status !== "ok") return false
    setSave("saving")
    setSaveError(null)
    const nextPublished = publish ?? published
    const { error } = await supabase.from("shop_pages").upsert(
      { shop_id: shop.id, slug: slug.slug, published: nextPublished, data: cleanPage(data, shop.name), updated_at: new Date().toISOString() },
      { onConflict: "shop_id" },
    )
    if (error) {
      const taken = /duplicate|unique/i.test(error.message)
      if (taken) setSlug({ slug: slug.slug, status: "taken" })
      setSaveError(taken ? t("This address is already taken")
        : /shop_pages|relation|schema cache/i.test(error.message) ? t("Run supabase/pages.sql in Supabase first, then try again.") : error.message)
      setSave("error")
      return false
    }
    setSavedSlug(slug.slug)
    setPublished(nextPublished)
    setSave("saved")
    return true
  }, [shop, data, slug, published, t])

  // Changes save themselves a moment after you stop typing.
  useEffect(() => {
    if (save !== "dirty" || slug.status !== "ok") return
    const timer = window.setTimeout(() => { persist() }, 900)
    return () => window.clearTimeout(timer)
  }, [save, slug.status, data, persist])

  /** Shrinks and uploads an image; returns its public address (null if it failed, with the reason shown). */
  async function uploadImage(file: File, kind: string, maxSide: number) {
    if (!shop) return null
    if (!file.type.startsWith("image/")) { setSaveError(t("Choose an image file")); return null }
    try {
      const small = await shrinkImage(file, maxSide)
      if (small.size > 4 * 1024 * 1024) throw new Error(t("Image must be under 4 MB"))
      return await uploadPublicAsset(shop.id, small, `page-${kind}`)
    } catch (e) {
      setSaveError((e as Error)?.message || t("Upload failed"))
      return null
    }
  }

  async function upload(file: File | undefined, kind: "avatar" | "banner") {
    if (!file) return
    setUploading(kind)
    const url = await uploadImage(file, kind, kind === "avatar" ? 600 : 1600)
    if (url) update(kind === "avatar" ? { avatar_url: url } : { banner_url: url })
    setUploading(null)
  }

  function updateProject(i: number, patch: Partial<PageProject>) {
    setData((d) => (d ? { ...d, projects: d.projects.map((p, j) => (j === i ? { ...p, ...patch } : p)) } : d))
    setSave("dirty")
  }

  async function addProjectPhotos(i: number, files: File[]) {
    setUploading(`project-${i}`)
    for (const f of files) {
      const url = await uploadImage(f, "project", 1600)
      if (!url) continue
      setData((d) => (d ? { ...d, projects: d.projects.map((p, j) => (j === i ? { ...p, photos: [...p.photos, url].slice(0, MAX_PROJECT_PHOTOS) } : p)) } : d))
      setSave("dirty")
    }
    setUploading(null)
  }

  async function deleteReview(id: string) {
    const { error } = await supabase.from("page_reviews").delete().eq("id", id)
    if (error) { setSaveError(error.message); return }
    setReviews((list) => list.filter((r) => r.id !== id))
  }

  const publicUrl = typeof window !== "undefined" && savedSlug ? `${window.location.origin}${pagePath(savedSlug)}` : ""
  async function copyLink() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-muted-foreground">{t("Loading...")}</p></div>
  }

  // Tapping an empty section in the preview opens the part of the editor where it's filled in.
  const editTarget = (target: PageEditTarget) => {
    if (target === "projects" || target === "services" || target === "credentials") { setSection("content"); setTab(target) }
    else if (target === "contacts") { setSection("content"); setContactModal("pick") }
    else setSection("header")
    setPreviewOpen(false)
  }
  const hints = salon ? SALON_HINTS[salon] : null
  const preview = salon
    ? <BookingPage data={cleanPage(data, shop?.name ?? "")} slug={slug.slug} reviews={reviews} preview onEdit={editTarget} isOrder={nicheConfig(salon)!.kind === "order"} niche={salon}
        booking={<PublicBooking embedded preview slug={slug.slug} title={data.title} avatar={data.avatar_url} about="" niche={salon} services={salonServices} />} />
    : <PageView data={cleanPage(data, shop?.name ?? "")} slug={slug.slug} reviews={reviews} preview onEdit={editTarget} />
  const move = <K extends "links" | "services" | "projects" | "credentials">(key: K, i: number, d: -1 | 1) => {
    const list = [...data[key]] as PageData[K]
    const j = i + d
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update({ [key]: list } as Partial<PageData>)
  }


  const host = typeof window !== "undefined" ? window.location.host : ""
  const sections: [Section, string][] = [["content", t("Content")], ["header", t("Header")], ["design", t("Look")], ["settings", t("Settings")]]

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} activePage="link" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden">
          <DashboardHeader shopName={shop?.name || ""} title={t("Edit page")} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <div className="flex min-w-0 flex-1">
        <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 xl:pb-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            {/* Title, where the page lives and the way to share it, like the app's other screens */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <a href="/link" className="mb-1 inline-flex items-center gap-1 text-[13.5px] text-muted-foreground hover:text-foreground"><ChevronLeftIcon className="size-4" />{t("My page")}</a>
                <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">{t("Edit page")}</h1>
                <p className="mt-1 flex items-center gap-2 text-[15px] text-muted-foreground">
                  <span className={`size-2 shrink-0 rounded-full ${published ? "bg-[var(--status-approved)]" : "bg-foreground/25"}`} />
                  <span className="truncate">{published ? `${host}${pagePath(slug.slug)}` : t("Draft")}</span>
                  <span className="shrink-0 text-[13px]">· {save === "saving" || save === "dirty" ? t("Saving…") : save === "error" ? t("Not saved") : t("Saved")}</span>
                </p>
              </div>
              {published && savedSlug ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={copyLink} className="flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90">
                    {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}{copied ? t("Copied") : t("Copy Link")}
                  </button>
                  <a href={pagePath(savedSlug)} target="_blank" rel="noopener" aria-label={t("Open page")} title={t("Open page")}
                    className="flex size-10 items-center justify-center rounded-full ring-1 ring-border hover:bg-hover"><ExternalLinkIcon className="size-4" /></a>
                </div>
              ) : (
                <button type="button" onClick={() => persist(true)} disabled={slug.status !== "ok"}
                  className="h-10 rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40">{t("Publish")}</button>
              )}
            </div>

            {(missingTable || saveError) && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError || t("Run supabase/pages.sql in Supabase first, then try again.")}</p>
            )}

            {/* The editor's parts, as one segmented control */}
            <div role="tablist" className="flex gap-1 overflow-x-auto rounded-full bg-foreground/[0.05] p-1 text-[14px] whitespace-nowrap no-scrollbar">
              {sections.map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}
                  className={`h-9 flex-1 shrink-0 rounded-full px-4 transition-colors ${section === id ? "bg-card font-medium shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-muted-foreground hover:text-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>
            {section === "content" && (
              <>
                <div className="flex items-center gap-4 rounded-[22px] apple-card p-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-foreground/10">
                    {data.avatar_url ? <img src={data.avatar_url} alt="" className="size-full object-cover" />
                      : salon ? <img src={`/niches/${salon}.svg`} alt="" className="size-full object-cover" /> : <AvatarPlaceholder className="size-full" />}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="truncate text-lg font-medium">{data.title || shop?.name}</p>
                    <div className="flex items-center gap-0.5">
                      {CONTACT_KEYS.filter((key) => QUICK_CONTACTS.includes(key) || data.contacts[key]).map((key) => (
                        <button key={key} type="button" title={t(CONTACT_LABEL[key])} onClick={() => setContactModal({ key, fromPicker: false })}
                          className={`relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-hover [&_svg]:size-[24px] [&_svg]:stroke-[1.75] ${data.contacts[key] ? "text-foreground" : "text-muted-foreground"}`}>
                          {CONTACT_ICON[key]}
                          {!data.contacts[key] && <span className="absolute top-0.5 right-0.5 flex size-3 items-center justify-center rounded-full bg-card text-[11px] leading-none font-bold text-foreground">+</span>}
                        </button>
                      ))}
                      <button type="button" title={t("All contacts")} onClick={() => setContactModal("pick")} className="ml-1 flex size-7 items-center justify-center rounded-full bg-muted text-foreground hover:bg-hover-strong"><PlusIcon className="size-[18px]" /></button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 self-start overflow-x-auto rounded-full bg-foreground/[0.05] p-1 text-[13.5px] whitespace-nowrap no-scrollbar">
                  {(([["projects", salon ? t("Work") : t("Projects")], ["services", t("Services & prices")], ["reviews", t("Reviews")], ["credentials", t("Credentials")], ["links", t("Links")]] as [ContentTab, string][])
                    .filter(([id]) => !salon || (id !== "services" && id !== "credentials"))).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setTab(id)}
                      className={`h-8 shrink-0 rounded-full px-4 transition-colors ${tab === id ? "bg-card font-medium shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-muted-foreground hover:text-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {tab === "links" && (
                  <>
                    <AddButton disabled={data.links.length >= MAX_LINKS} onClick={() => update({ links: [{ title: "", url: "" }, ...data.links] })} label={t("Add link")} />
                    {data.links.length === 0 && <Empty title={t("No links yet")} text={t("Add your catalog, reviews, a booking form or anything else clients should open.")} />}
                    {data.links.map((l, i) => (
                      <ItemCard key={i} onUp={() => move("links", i, -1)} onDown={() => move("links", i, 1)} first={i === 0} last={i === data.links.length - 1}
                        onRemove={() => update({ links: data.links.filter((_, j) => j !== i) })}>
                        <Input aria-label={t("Title")} placeholder={t("Title")} value={l.title} maxLength={80} className={`font-medium ${FILLED}`}
                          onChange={(e) => update({ links: data.links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                        <Input aria-label="URL" placeholder="https://" value={l.url} maxLength={600} className={FILLED}
                          onChange={(e) => update({ links: data.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                      </ItemCard>
                    ))}
                  </>
                )}

                {tab === "services" && (
                  <>
                    <AddButton disabled={data.services.length >= MAX_SERVICES} onClick={() => update({ services: [...data.services, { name: "", price: "", description: "" }] })} label={t("Add service")} />
                    {data.services.length === 0 && <Empty title={t("No services yet")} text={t("List what you make and from what price: clients see it right away.")} />}
                    {data.services.map((s, i) => (
                      <ItemCard key={i} onUp={() => move("services", i, -1)} onDown={() => move("services", i, 1)} first={i === 0} last={i === data.services.length - 1}
                        onRemove={() => update({ services: data.services.filter((_, j) => j !== i) })}>
                        <div className="flex gap-3">
                          <Input aria-label={t("Service")} placeholder={t("Service")} value={s.name} maxLength={80} className={`flex-1 font-medium ${FILLED}`}
                            onChange={(e) => update({ services: data.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                          <Input aria-label={t("Price")} placeholder={t("from $500")} value={s.price} maxLength={40} className={`w-32 text-right ${FILLED}`}
                            onChange={(e) => update({ services: data.services.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })} />
                        </div>
                        <Input aria-label={t("Description")} placeholder={t("What's included: content plan, 12 posts, 20 stories, 2 rounds of revisions…")} value={s.description} maxLength={300}
                          className={FILLED}
                          onChange={(e) => update({ services: data.services.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                      </ItemCard>
                    ))}
                  </>
                )}

                {tab === "projects" && (
                  <>
                    <AddButton disabled={data.projects.length >= MAX_PROJECTS} label={salon ? t("Add work") : t("Add project")}
                      onClick={() => update({ projects: [{ title: "", city: "", description: "", photos: [] }, ...data.projects] })} />
                    {data.projects.length === 0 && <Empty title={t("No projects yet")} text={t("Show finished work: a few images and a couple of words about each project.")} />}
                    {data.projects.map((p, i) => (
                      <ItemCard key={i} onUp={() => move("projects", i, -1)} onDown={() => move("projects", i, 1)} first={i === 0} last={i === data.projects.length - 1}
                        onRemove={() => update({ projects: data.projects.filter((_, j) => j !== i) })}>
                        <Input aria-label={t("Project name")} placeholder={t(hints?.work ?? "Instagram for a coffee shop: +2,000 followers")} value={p.title} maxLength={80}
                          className={`font-medium ${FILLED}`} onChange={(e) => updateProject(i, { title: e.target.value })} />
                        <Input aria-label={t("City")} placeholder={salon ? t("City (optional)") : t("City")} value={p.city} maxLength={60}
                          className={FILLED} onChange={(e) => updateProject(i, { city: e.target.value })} />
                        <Textarea aria-label={t("Description")} placeholder={salon ? t("A few words about this work") : t("The task, what you did, the result…")} value={p.description} maxLength={1000}
                          className={`min-h-16 ${FILLED_AREA}`} onChange={(e) => updateProject(i, { description: e.target.value })} />
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                          {p.photos.map((src, k) => (
                            <div key={src} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                              <img src={src} alt="" className="size-full object-cover" />
                              {k === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{t("Cover")}</span>}
                              <button type="button" aria-label={t("Remove")} onClick={() => updateProject(i, { photos: p.photos.filter((x) => x !== src) })}
                                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"><Trash2Icon className="size-3" /></button>
                            </div>
                          ))}
                          {p.photos.length < MAX_PROJECT_PHOTOS && (
                            <FileButton multiple busy={uploading === `project-${i}`} label={t("Add photos")}
                              onFiles={(files) => addProjectPhotos(i, files.slice(0, MAX_PROJECT_PHOTOS - p.photos.length))}
                              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-foreground/[0.05] text-xs text-muted-foreground hover:bg-hover disabled:opacity-60">
                              <ImagePlusIcon className="size-4" />{uploading === `project-${i}` ? "…" : t("Photos")}
                            </FileButton>
                          )}
                        </div>
                      </ItemCard>
                    ))}
                  </>
                )}

                {tab === "credentials" && (
                  <>
                    <AddButton disabled={data.credentials.length >= MAX_CREDENTIALS} label={t("Add award or certificate")}
                      onClick={() => update({ credentials: [...data.credentials, { title: "", image_url: null }] })} />
                    {data.credentials.length === 0 && <Empty title={t("No credentials yet")} text={t("Awards, certificates, publications, contest wins: they build trust.")} />}
                    {data.credentials.map((c, i) => (
                      <ItemCard key={i} onUp={() => move("credentials", i, -1)} onDown={() => move("credentials", i, 1)} first={i === 0} last={i === data.credentials.length - 1}
                        onRemove={() => update({ credentials: data.credentials.filter((_, j) => j !== i) })}>
                        <div className="flex items-center gap-3">
                          <ImagePick label={t("Badge")} src={c.image_url} busy={uploading === `credential-${i}`}
                            onPick={async (f) => {
                              if (!f) return
                              setUploading(`credential-${i}`)
                              const url = await uploadImage(f, "credential", 600)
                              if (url) update({ credentials: data.credentials.map((x, j) => (j === i ? { ...x, image_url: url } : x)) })
                              setUploading(null)
                            }}
                            onClear={() => update({ credentials: data.credentials.map((x, j) => (j === i ? { ...x, image_url: null } : x)) })} />
                          <Input aria-label={t("Title")} placeholder={t("Meta Blueprint certificate")} value={c.title} maxLength={80}
                            className={`flex-1 font-medium ${FILLED}`}
                            onChange={(e) => update({ credentials: data.credentials.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                        </div>
                      </ItemCard>
                    ))}
                  </>
                )}

                {tab === "reviews" && (
                  <>
                    <p className="text-sm text-muted-foreground">{t("Clients write reviews themselves on your page and they show at once. You can delete any of them.")}</p>
                    {reviews.length === 0 && <Empty title={t("No reviews yet")} text={t("Send your page to happy clients and ask them to leave a review.")} />}
                    {reviews.map((r) => (
                      <div key={r.id} className="flex flex-col gap-1.5 rounded-[22px] apple-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{r.name} <span className="ml-1 text-[#f5a524]">{"★".repeat(r.rating)}<span className="text-foreground/15">{"★".repeat(5 - r.rating)}</span></span></span>
                          <IconBtn label={t("Delete")} onClick={() => { if (window.confirm(t("Delete this review?"))) deleteReview(r.id) }}><Trash2Icon /></IconBtn>
                        </div>
                        <p className="text-sm whitespace-pre-line">{r.text}</p>
                        <p className="text-[12.5px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {section === "header" && (
              <Block>
                <div className="flex flex-wrap gap-6">
                  <ImagePick label={t("Photo or logo")} src={data.avatar_url} round busy={uploading === "avatar"} onPick={(f) => upload(f, "avatar")} onClear={() => update({ avatar_url: null })} />
                  <ImagePick label={t("Cover")} src={data.banner_url} wide busy={uploading === "banner"} onPick={(f) => upload(f, "banner")} onClear={() => update({ banner_url: null })} />
                </div>
                <Field label={t("Name")}><Input value={data.title} maxLength={80} className={FILLED} onChange={(e) => update({ title: e.target.value })} /></Field>
                <Field label={t("Category")}><Input value={data.category} className={FILLED} placeholder={t(hints?.category ?? "Instagram and TikTok for local businesses")} maxLength={80} onChange={(e) => update({ category: e.target.value })} /></Field>
                <Field label={t("One line about you")}><Input value={data.tagline} className={FILLED} placeholder={t(hints?.tagline ?? "SMM specialist · Austin")} maxLength={120} onChange={(e) => update({ tagline: e.target.value })} /></Field>
                <Field label={t("About")}><Textarea value={data.bio} placeholder={t(hints?.bio ?? "What you make, how you work, what clients love.")} maxLength={2000} className={`min-h-28 ${FILLED_AREA}`} onChange={(e) => update({ bio: e.target.value })} /></Field>
              </Block>
            )}

            {section === "header" && (
              <Block title={t("Business")} hint={t("Only filled ones show on the page.")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BUSINESS_KEYS.filter((key) => key !== "areas" && (!salon || SALON_BUSINESS.includes(key))).map((key) => (
                    <Field key={key} label={t(BUSINESS_FIELDS[key].label)}>
                      <Input value={data.business[key]} placeholder={t((key === "team" || key === "payment") && hints ? hints[key] : BUSINESS_PLACEHOLDER[key])} maxLength={160} className={FILLED}
                        onChange={(e) => update({ business: { ...data.business, [key]: e.target.value } })} />
                    </Field>
                  ))}
                </div>
                {!salon && <><Field label={t("Where you work")}>
                  <Textarea value={data.business.areas} placeholder={t(BUSINESS_PLACEHOLDER.areas)} maxLength={300} className={`min-h-16 ${FILLED_AREA}`}
                    onChange={(e) => update({ business: { ...data.business, areas: e.target.value } })} />
                </Field>
                <p className="-mt-2 text-[12.5px] text-muted-foreground">{t("Separate cities and districts with commas: they show as a list.")}</p></>}
              </Block>
            )}

            {section === "header" && (
              <Block title={t("Working hours")} hint={t("Clients see whether you're open right now.")}>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={CHIP} onClick={() => update({ hours: Array.from({ length: 7 }, (_, i) => (i < 5 ? { from: "09:00", to: "18:00" } : null)) })}>{t("Mon–Fri 9–18")}</button>
                  <button type="button" className={CHIP} onClick={() => update({ hours: Array.from({ length: 7 }, (_, i) => (i < 6 ? { from: "09:00", to: i === 5 ? "15:00" : "18:00" } : null)) })}>{t("Mon–Sat")}</button>
                  {data.hours.some(Boolean) && <button type="button" className={`${CHIP} bg-transparent text-muted-foreground`} onClick={() => update({ hours: Array(7).fill(null) })}>{t("Clear")}</button>}
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {weekdays(locale, "long").map((day, i) => {
                    const d = data.hours[i]
                    const set = (v: { from: string; to: string } | null) => update({ hours: data.hours.map((x, j) => (j === i ? v : x)) })
                    return (
                      <div key={i} className="flex min-h-14 items-center gap-3 py-1.5">
                        <Switch checked={!!d} onChange={(on) => set(on ? { from: "09:00", to: "18:00" } : null)} className="w-36 shrink-0 text-[14px] capitalize sm:w-40">
                          {day}
                        </Switch>
                        {d ? (
                          <span className="flex flex-1 items-center gap-2 text-[14px] text-muted-foreground">
                            <TimePicker value={d.from} onChange={(v) => v && set({ ...d, from: v })} label={t("From")} step={15} className="w-24" />
                            –
                            <TimePicker value={d.to} onChange={(v) => v && set({ ...d, to: v })} label={t("Until")} step={15} className="w-24" />
                          </span>
                        ) : <span className="text-[14px] text-muted-foreground">{t("Day off")}</span>}
                      </div>
                    )
                  })}
                </div>
              </Block>
            )}

            {section === "design" && (
              <>
                <Block title={t("Theme")}>
                  <div className="grid grid-cols-2 gap-3">
                    {(["light", "dark"] as const).map((th) => (
                      <button key={th} type="button" onClick={() => update({ theme: th })}
                        className="flex flex-col items-center gap-2.5 text-[14px]">
                        <span className={`flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl ring-offset-2 ring-offset-card transition-shadow ${th === "light" ? "bg-[#f6f5f3] ring-1 ring-black/10" : "bg-[#191919] ring-1 ring-white/10"} ${data.theme === th ? "ring-2 ring-foreground" : ""}`}>
                          <span className={`size-6 rounded-full ${th === "light" ? "bg-[#d9d6d2]" : "bg-[#3a3836]"}`} />
                          <span className={`h-3 w-20 rounded-full ${th === "light" ? "bg-white ring-1 ring-black/10" : "bg-[#252525] ring-1 ring-white/10"}`} />
                          <span className={`h-3 w-20 rounded-full ${th === "light" ? "bg-white ring-1 ring-black/10" : "bg-[#252525] ring-1 ring-white/10"}`} />
                        </span>
                        <Choice on={data.theme === th}>{th === "light" ? t("Light") : t("Dark")}</Choice>
                      </button>
                    ))}
                  </div>
                </Block>
                <Block title={t("Accent color")}>
                  <div className="flex flex-wrap gap-3">
                    {ACCENTS.map((a) => (
                      <button key={a} type="button" aria-label={a} onClick={() => update({ accent: a })}
                        className="flex size-10 items-center justify-center rounded-full text-white ring-1 ring-foreground/10" style={{ background: a }}>{data.accent === a && <CheckIcon className="size-5" strokeWidth={2.5} />}</button>
                    ))}
                  </div>
                </Block>
                <Block title={t("Buttons")}>
                  <div className="grid grid-cols-3 gap-3">
                    {([["pill", "rounded-full", t("Round")], ["rounded", "rounded-xl", t("Soft")], ["square", "rounded-sm", t("Square")]] as [ButtonShape, string, string][]).map(([id, cls, label]) => (
                      <button key={id} type="button" onClick={() => update({ buttons: id })}
                        className="flex flex-col items-center gap-2.5 text-[14px]">
                        <span className={`flex h-16 w-full items-center justify-center rounded-2xl bg-foreground/[0.05] ring-offset-2 ring-offset-card ${data.buttons === id ? "ring-2 ring-foreground" : ""}`}>
                          <span className={`h-8 w-[70%] bg-card shadow-[0_1px_3px_rgba(0,0,0,0.15)] ${cls}`} />
                        </span>
                        <Choice on={data.buttons === id}>{label}</Choice>
                      </button>
                    ))}
                  </div>
                </Block>
              </>
            )}

            {section === "settings" && (
              <>
                {salon && (
                  <Block title={t("Nodly catalog")} hint={t("People look for masters by trade and city on nodly. Your page shows there only if you turn it on.")}>
                    <Toggle checked={data.listed} onChange={(v) => update({ listed: v })} label={t("Show my page in the catalog")} />
                    <Field label={t("City")}>
                      <Picker value={data.city || "none"} onChange={(v) => update({ city: v === "none" ? "" : v })} label={t("City")}
                        options={[{ value: "none", label: t("Not chosen") }, ...CITIES.map((c) => ({ value: c.id, label: c[lang] }))]} />
                    </Field>
                    {data.listed && !data.city && <p className="text-[12.5px] text-muted-foreground">{t("Pick a city so clients nearby find you.")}</p>}
                    <Field label={t("Pin on the map")}>
                      <MapView className="h-60 w-full overflow-hidden rounded-2xl"
                        center={data.geo ?? cityById(data.city) ?? UKRAINE} zoom={data.geo ? 15 : data.city ? 11 : UKRAINE.zoom}
                        picker={{ value: data.geo, onChange: (geo) => update({ geo }) }} />
                    </Field>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" className={PILL} onPress={() => navigator.geolocation?.getCurrentPosition(
                        (pos) => update({ geo: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
                        () => setSaveError(t("Couldn't get your location. Click the map instead.")))}>{t("I'm here now")}</Button>
                      {data.geo && <Button size="sm" variant="ghost" className={PILL} onPress={() => update({ geo: null })}>{t("Remove the pin")}</Button>}
                      <span className="text-[12.5px] text-muted-foreground">{data.geo ? t("Drag the pin to move it.") : t("Click the map where you work.")}</span>
                    </div>
                    {data.listed && !published && <p className="text-[12.5px] text-muted-foreground">{t("The page shows in the catalog once it's published.")}</p>}
                    <a href="/catalog" target="_blank" rel="noopener" className="text-[14px] font-medium underline underline-offset-2">{t("Open the catalog")}</a>
                  </Block>
                )}
                <Block title={t("Page address")}>
                  <div className="flex h-11 items-center rounded-xl bg-foreground/[0.05] ring-1 ring-transparent focus-within:ring-foreground/25">
                    <span className="shrink-0 pl-3 text-[14px] text-muted-foreground">{typeof window !== "undefined" ? window.location.host : ""}/@</span>
                    <input aria-label={t("Page address")} value={slug.slug} maxLength={30} onChange={(e) => changeSlug(e.target.value)}
                      className="h-11 min-w-0 flex-1 bg-transparent pr-3 text-base font-medium outline-none md:text-[14px]" />
                  </div>
                  <p className={`text-[12.5px] ${slug.status === "ok" ? "text-[var(--status-approved)]" : slug.status === "checking" ? "text-muted-foreground" : "text-destructive"}`}>
                    {slug.status === "ok" ? (slug.slug === savedSlug ? t("This is your address") : t("Address is free"))
                      : slug.status === "checking" ? t("Checking...") : slug.status === "taken" ? t("This address is already taken") : t(slug.problem!)}
                  </p>
                </Block>
                {!salon && <Block title={t("Request form")}>
                  <Toggle checked={data.requests} onChange={(v) => update({ requests: v })} label={t("Clients can leave a request on the page")} />
                  {data.requests && (
                    <Field label={t("Button text")}><Input value={data.cta} className={FILLED} placeholder={t("Leave a request")} maxLength={40} onChange={(e) => update({ cta: e.target.value })} /></Field>
                  )}
                  <p className="text-[12.5px] text-muted-foreground">{t("Requests arrive in Requests and in your Telegram or email notifications.")}</p>
                </Block>}
                <Block title={t("Contacts")} hint={t("Only filled ones show on the page.")}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CONTACT_KEYS.map((key) => (
                      <Field key={key} label={t(CONTACT_LABEL[key])}>
                        <Input value={data.contacts[key] ?? ""} className={FILLED} placeholder={CONTACT_PLACEHOLDER[key]} maxLength={120}
                          onChange={(e) => update({ contacts: { ...data.contacts, [key]: e.target.value } })} />
                      </Field>
                    ))}
                  </div>
                </Block>
                <Block title={t("Visibility")}>
                  {published
                    ? <div className="flex items-center justify-between gap-3"><span className="text-[14px]">{t("Your page is live")}</span><Button size="sm" variant="outline" className={PILL} onPress={() => persist(false)}>{t("Hide page")}</Button></div>
                    : <div className="flex items-center justify-between gap-3"><span className="text-[14px] text-muted-foreground">{t("The page is hidden until you publish it.")}</span><Button size="sm" className={PILL} onPress={() => persist(true)} isDisabled={slug.status !== "ok"}>{t("Publish")}</Button></div>}
                </Block>
              </>
            )}
          </div>
        </main>

        {/* Live preview: a phone or a computer, beside the editor on a wide screen */}
        <aside className={`sticky top-0 hidden h-screen shrink-0 py-6 pr-6 transition-[width] duration-300 xl:flex ${wide ? "w-[min(780px,52vw)]" : "w-[440px]"}`}>
          <DevicePreview dark={data.theme === "dark"} onDeviceChange={(d) => setWide(d === "computer")}>{preview}</DevicePreview>
        </aside>
        </div>
      </div>

      {contactModal && (
        <ContactModal key={contactModal === "pick" ? "pick" : contactModal.key} state={contactModal} contacts={data.contacts}
          onPick={(key) => setContactModal({ key, fromPicker: true })}
          onBack={() => setContactModal("pick")}
          onClose={() => setContactModal(null)}
          onSave={(key, value) => { update({ contacts: { ...data.contacts, [key]: value } }); setContactModal(null) }} />
      )}

      {/* Phones: preview on demand */}
      <button type="button" onClick={() => setPreviewOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-xl xl:hidden">
        <EyeIcon className="size-4" />{t("Preview")}
      </button>
      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background xl:hidden">
          <button type="button" aria-label={t("Close")} onClick={() => setPreviewOpen(false)}
            className="fixed top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg"><XIcon className="size-5" /></button>
          {preview}
        </div>
      )}
    </div>
  )
}

const CHIP = "h-8 rounded-full bg-foreground/[0.06] px-3.5 text-[13px] font-medium hover:bg-foreground/[0.1]"
const PILL = "h-9 rounded-full px-4 text-[13.5px]"

/** A tile's caption: a filled check beside the chosen one. */
function Choice({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-1.5 ${on ? "font-medium" : "text-muted-foreground"}`}>
      <span className={`flex size-[18px] items-center justify-center rounded-full ${on ? "bg-foreground text-background" : "ring-[1.5px] ring-foreground/25"}`}>{on && <CheckIcon className="size-3" strokeWidth={3} />}</span>
      {children}
    </span>
  )
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
      <PlusIcon className="size-4" />{label}
    </button>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
      <div className="mb-2 flex gap-1">
        {[0, 1, 2].map((i) => <span key={i} className="h-10 w-16 rounded-lg bg-muted ring-1 ring-border" style={{ transform: `rotate(${(i - 1) * 6}deg)` }} />)}
      </div>
      <p className="font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function ItemCard({ children, onUp, onDown, onRemove, first, last }: {
  children: React.ReactNode; onUp: () => void; onDown: () => void; onRemove: () => void; first: boolean; last: boolean
}) {
  const { t } = useT()
  return (
    <div className="flex items-start gap-2 rounded-[22px] apple-card p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
      <div className="flex shrink-0 flex-col items-center sm:flex-row">
        <IconBtn label={t("Move up")} onClick={onUp} disabled={first}><ArrowUpIcon /></IconBtn>
        <IconBtn label={t("Move down")} onClick={onDown} disabled={last}><ArrowDownIcon /></IconBtn>
        <IconBtn label={t("Remove")} onClick={onRemove}><Trash2Icon /></IconBtn>
      </div>
    </div>
  )
}

type ContactModalState = "pick" | { key: keyof PageContacts; fromPicker: boolean } | null

/** What the field asks for, by contact. */
const CONTACT_PROMPT: Record<keyof PageContacts, string> = {
  instagram: "Enter Instagram username", telegram: "Enter Telegram username or number", viber: "Enter Viber number",
  whatsapp: "Enter WhatsApp number", phone: "Enter phone number", email: "Enter email address", website: "Enter website address",
}

/** "Add Instagram icon": a list of contacts, then one field for the chosen one. */
function ContactModal({ state, contacts, onPick, onBack, onClose, onSave }: {
  state: Exclude<ContactModalState, null>
  contacts: PageContacts
  onPick: (key: keyof PageContacts) => void
  onBack: () => void
  onClose: () => void
  onSave: (key: keyof PageContacts, value: string) => void
}) {
  const { t } = useT()
  const editing = state === "pick" ? null : state
  const current = editing ? contacts[editing.key] ?? "" : ""
  const [value, setValue] = useState(current)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const name = editing ? t(CONTACT_LABEL[editing.key]) : ""
  const title = !editing ? t("Add icon") : current ? t("Edit {name} icon", { name }) : t("Add {name} icon", { name })
  const iconBtn = "flex size-9 items-center justify-center rounded-full hover:bg-hover"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[512px] flex-col gap-5 rounded-t-[28px] bg-card p-6 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-2">
          {editing?.fromPicker ? <button type="button" aria-label={t("Back")} onClick={onBack} className={iconBtn}><ChevronLeftIcon className="size-5" /></button> : <span className="size-9" />}
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" aria-label={t("Close")} onClick={onClose} className={iconBtn}><XIcon className="size-5" /></button>
        </div>

        {!editing ? (
          <div className="flex flex-col">
            {CONTACT_KEYS.map((key) => (
              <button key={key} type="button" onClick={() => onPick(key)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-hover [&_svg]:size-5">
                <span className="flex size-9 items-center justify-center rounded-full bg-muted">{CONTACT_ICON[key]}</span>
                <span className="flex-1 text-[15px] font-medium">{t(CONTACT_LABEL[key])}</span>
                {contacts[key] ? <CheckIcon className="text-muted-foreground" /> : <ChevronRightIcon className="text-muted-foreground" />}
              </button>
            ))}
          </div>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSave(editing.key, value.trim()) }}>
            <div className="flex flex-col gap-2">
              <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={t(CONTACT_PROMPT[editing.key]) + "*"}
                aria-label={t(CONTACT_PROMPT[editing.key])} maxLength={120}
                className="h-12 rounded-xl bg-muted px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20" />
              <p className="px-1.5 text-xs text-muted-foreground">{t("Example: {value}", { value: CONTACT_PLACEHOLDER[editing.key] })}</p>
            </div>
            <button type="submit" disabled={!value.trim() || value.trim() === current}
              className="h-12 rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100">
              {current ? t("Save") : t("Add")}
            </button>
            {current && (
              <button type="button" onClick={() => onSave(editing.key, "")} className="-mt-2 text-sm text-muted-foreground hover:text-destructive">
                {t("Remove icon")}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
