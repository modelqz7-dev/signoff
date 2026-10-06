"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, CheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, EyeIcon, ImagePlusIcon,
  LayoutListIcon, PaletteIcon, PlusIcon, SettingsIcon, Share2Icon, Trash2Icon, UserRoundIcon, XIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PageView, CONTACT_ICON, CONTACT_LABEL } from "@/components/page/PageView"
import { AvatarPlaceholder, Block, Field, FileButton, IconBtn, ImagePick, Toggle } from "@/components/page/EditorBits"
import { getOrCreateShop } from "@/lib/shop"
import { uploadPublicAsset } from "@/lib/files"
import { shrinkImage } from "@/lib/image"
import { useT } from "@/lib/i18n"
import {
  ACCENTS, CONTACT_KEYS, MAX_LINKS, MAX_PORTFOLIO, MAX_SERVICES, cleanPage, emptyPage, normalizeSlug, pagePath,
  slugProblem, suggestSlug, type ButtonShape, type PageContacts, type PageData,
} from "@/lib/page"
import type { Shop } from "@/components/dashboard/types"

type Section = "content" | "header" | "design" | "settings"
type ContentTab = "links" | "services" | "portfolio"
type SlugState = { slug: string; status: "checking" | "ok" | "taken" | "invalid"; problem?: string }
type SaveState = "saved" | "dirty" | "saving" | "error"

const CONTACT_PLACEHOLDER: Record<keyof PageContacts, string> = {
  instagram: "@yourstudio", telegram: "@yourname", viber: "+380 67 123 4567", whatsapp: "+1 555 123 4567",
  phone: "+1 555 123 4567", email: "hello@studio.com", website: "studio.com",
}
const QUICK_CONTACTS: (keyof PageContacts)[] = ["instagram", "telegram", "whatsapp", "email"]

/** Full-screen page editor: sections on the left, the content in the middle, the phone preview on the right. */
export default function PageEditor() {
  const router = useRouter()
  const { t } = useT()
  const [shop, setShop] = useState<Shop | null>(null)
  const [data, setData] = useState<PageData | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [slug, setSlug] = useState<SlugState>({ slug: "", status: "checking" })
  const [published, setPublished] = useState(false)
  const [save, setSave] = useState<SaveState>("saved")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [missingTable, setMissingTable] = useState(false)
  const [section, setSection] = useState<Section>("content")
  const [tab, setTab] = useState<ContentTab>("links")
  const [uploading, setUploading] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [pillOpen, setPillOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pillOpen) return
    const onDown = (e: MouseEvent) => { if (!pillRef.current?.contains(e.target as Node)) setPillOpen(false) }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [pillOpen])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<keyof PageContacts | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: shopData } = await getOrCreateShop(session.user)
      if (!shopData) return
      setShop(shopData)
      const { data: row, error } = await supabase.from("shop_pages").select("*").eq("shop_id", shopData.id).maybeSingle()
      if (error && /shop_pages|relation|schema cache/i.test(error.message)) setMissingTable(true)
      if (row) {
        setData(cleanPage(row.data, shopData.name))
        setSavedSlug(row.slug)
        setSlug({ slug: row.slug, status: "ok" })
        setPublished(row.published)
        return
      }
      // A new page: suggest an address from the name and check it.
      setData(emptyPage(shopData.name, shopData.logo_url))
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

  async function upload(file: File | undefined, kind: "avatar" | "banner" | "portfolio") {
    if (!file || !shop) return
    if (!file.type.startsWith("image/")) { setSaveError(t("Choose an image file")); return }
    setUploading(kind)
    try {
      const small = await shrinkImage(file, kind === "avatar" ? 600 : 1600)
      if (small.size > 4 * 1024 * 1024) throw new Error(t("Image must be under 4 MB"))
      const url = await uploadPublicAsset(shop.id, small, `page-${kind}`)
      if (kind === "avatar") update({ avatar_url: url })
      else if (kind === "banner") update({ banner_url: url })
      else setData((d) => (d ? { ...d, portfolio: [...d.portfolio, url].slice(0, MAX_PORTFOLIO) } : d))
      if (kind === "portfolio") setSave("dirty")
    } catch (e) {
      setSaveError((e as Error)?.message || t("Upload failed"))
    }
    setUploading(null)
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

  const preview = <PageView data={cleanPage(data, shop?.name ?? "")} slug={slug.slug} preview />
  const move = <K extends "links" | "services">(key: K, i: number, d: -1 | 1) => {
    const list = [...data[key]] as PageData[K]
    const j = i + d
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update({ [key]: list } as Partial<PageData>)
  }


  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/50 bg-background/90 px-3 backdrop-blur sm:px-5 lg:h-[72px] lg:border-none lg:bg-background lg:px-3 lg:backdrop-blur-none">
        <a href="/link" aria-label={t("Back")} className="flex size-10 items-center justify-center rounded-full hover:bg-hover lg:bg-muted"><ArrowLeftIcon className="size-4" /></a>
        {/* Address pill, 187×40 like the reference: names longer than 14 letters are cut */}
        <div ref={pillRef} className="relative mx-auto">
          <button type="button" onClick={() => setPillOpen((v) => !v)} aria-haspopup="menu" aria-expanded={pillOpen}
            className="flex h-10 w-[187px] items-center gap-1.5 rounded-full bg-muted pr-2 pl-1.5 text-[13px] font-medium hover:bg-hover-strong">
            <span className="size-7 shrink-0 overflow-hidden rounded-full bg-card">{data.avatar_url ? <img src={data.avatar_url} alt="" className="size-full object-cover" /> : <AvatarPlaceholder className="size-full" />}</span>
            <span className="min-w-0 flex-1 truncate text-left">{slug.slug.length > 14 ? slug.slug.slice(0, 14) + "…" : slug.slug || "…"}</span>
            <ChevronDownIcon className={`size-4 shrink-0 transition-transform ${pillOpen ? "rotate-180" : ""}`} />
          </button>
          {pillOpen && (
            <div role="menu" className="absolute top-12 left-1/2 z-40 flex w-60 -translate-x-1/2 flex-col gap-0.5 rounded-2xl bg-popover p-1.5 shadow-xl ring-1 ring-foreground/10">
              <p className="truncate px-2.5 pt-1.5 pb-1 text-xs text-muted-foreground">{published ? t("Live") : t("Draft")} · {pagePath(slug.slug)}</p>
              {published && savedSlug && (
                <a role="menuitem" href={pagePath(savedSlug)} target="_blank" rel="noopener" onClick={() => setPillOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-hover"><ExternalLinkIcon className="size-4" />{t("Open page")}</a>
              )}
              {published && savedSlug && (
                <button type="button" role="menuitem" onClick={() => { copyLink(); setPillOpen(false) }}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-hover"><CopyIcon className="size-4" />{t("Copy Link")}</button>
              )}
              <button type="button" role="menuitem" onClick={() => { setSection("settings"); setPillOpen(false) }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-hover"><SettingsIcon className="size-4" />{t("Page address")}</button>
              <a role="menuitem" href="/link" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-hover"><ArrowLeftIcon className="size-4" />{t("Back to My page")}</a>
            </div>
          )}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShareOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-[15px] font-medium hover:bg-hover-strong"><Share2Icon className="size-4" />{t("Share")}</button>
          {shareOpen && (
            <div className="absolute right-0 top-12 z-40 flex w-80 flex-col gap-3 rounded-2xl bg-popover p-4 shadow-xl ring-1 ring-foreground/10">
              {published && savedSlug ? (
                <>
                  <p className="text-sm font-medium">{t("Your page is live")}</p>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{publicUrl.replace(/^https?:\/\//, "")}</span>
                    <IconBtn label={t("Copy Link")} onClick={copyLink}>{copied ? <CheckIcon /> : <CopyIcon />}</IconBtn>
                  </div>
                  <div className="flex gap-2">
                    <a href={pagePath(savedSlug)} target="_blank" rel="noopener" className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium hover:bg-hover"><ExternalLinkIcon className="size-4" />{t("Open page")}</a>
                    <Button variant="outline" size="sm" className="h-8" onPress={() => persist(false)}>{t("Hide page")}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("Put this link in your Instagram bio and send it to clients.")}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">{t("Publish your page to share it")}</p>
                  <p className="text-xs text-muted-foreground">{t("Until then only you can see it here.")}</p>
                  <Button onPress={async () => { if (await persist(true)) setShareOpen(true) }} isDisabled={slug.status !== "ok"}>{t("Publish")}</Button>
                  {slug.status !== "ok" && <p className="text-xs text-destructive">{t("Choose a free page address first")}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {(missingTable || saveError) && (
        <p className="mx-3 mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-5">{saveError || t("Run supabase/pages.sql in Supabase first, then try again.")}</p>
      )}

      <div className="flex flex-1 flex-col lg:relative lg:flex-row lg:items-start">
        {/* Section rail */}
        {/* Section rail: 92px wide on a computer, items in the middle and settings at the bottom */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto px-3 pt-3 lg:sticky lg:top-[72px] lg:h-[calc(100dvh-72px)] lg:w-[92px] lg:flex-col lg:items-center lg:justify-center lg:gap-4 lg:overflow-visible lg:px-0 lg:pt-0">
          {([
            ["content", t("Content"), <LayoutListIcon key="c" />],
            ["header", t("Header"), <UserRoundIcon key="h" />],
            ["design", t("Design"), <PaletteIcon key="d" />],
            ["settings", t("Settings"), <SettingsIcon key="s" />],
          ] as [Section, string, React.ReactNode][]).map(([id, label, icon]) => (
            <button key={id} type="button" onClick={() => setSection(id)} aria-label={label}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm lg:flex-col lg:gap-1.5 lg:rounded-none lg:px-0 lg:py-0 lg:text-xs ${id === "settings" ? "lg:absolute lg:bottom-4" : ""}`}>
              <span className={`flex items-center justify-center rounded-full transition-colors [&_svg]:size-4 lg:size-11 lg:[&_svg]:size-5 ${section === id ? "text-foreground lg:bg-foreground lg:text-background lg:ring-2 lg:ring-foreground lg:ring-offset-2 lg:ring-offset-background" : "text-muted-foreground lg:bg-muted lg:text-foreground"}`}>{icon}</span>
              <span className={`${section === id ? "font-medium text-foreground" : "text-muted-foreground lg:text-foreground"} ${id === "settings" ? "lg:hidden" : ""}`}>{label}</span>
            </button>
          ))}
        </nav>

        {/* Panel */}
        {/* The white panel: 851×856 on a full-size screen, scrolls inside */}
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 lg:mt-[10px] lg:h-[calc(100dvh-88px)] lg:w-[851px] lg:max-w-[851px] lg:flex-none lg:overflow-y-auto lg:rounded-t-[32px] lg:bg-card lg:px-8 lg:pt-12 lg:pb-10 lg:ring-1 lg:ring-foreground/10">
          <div className="mx-auto flex w-full max-w-[580px] flex-col gap-4">
            {section === "content" && <h2 className="hidden text-xl font-bold lg:block">{t("Content")}</h2>}
            {section === "content" && (
              <>
                <div className="flex items-center gap-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-full bg-muted">
                    {data.avatar_url ? <img src={data.avatar_url} alt="" className="size-full object-cover" /> : <AvatarPlaceholder className="size-full" />}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="truncate text-lg font-medium">{data.title || shop?.name}</p>
                    <div className="flex items-center gap-0.5">
                      {QUICK_CONTACTS.map((key) => (
                        <button key={key} type="button" title={t(CONTACT_LABEL[key])} onClick={() => setEditingContact(editingContact === key ? null : key)}
                          className={`relative flex size-9 items-center justify-center rounded-full transition-colors [&_svg]:size-[24px] [&_svg]:stroke-[1.75] ${data.contacts[key] ? "text-foreground" : "text-muted-foreground"} ${editingContact === key ? "bg-hover-strong" : "hover:bg-hover"}`}>
                          {CONTACT_ICON[key]}
                          {!data.contacts[key] && <span className="absolute top-0.5 right-0.5 flex size-3 items-center justify-center rounded-full bg-card text-[11px] leading-none font-bold text-foreground">+</span>}
                        </button>
                      ))}
                      <button type="button" title={t("All contacts")} onClick={() => setSection("settings")} className="ml-1 flex size-7 items-center justify-center rounded-full bg-muted text-foreground hover:bg-hover-strong"><PlusIcon className="size-[18px]" /></button>
                    </div>
                  </div>
                </div>
                {editingContact && (
                  <div className="flex items-center gap-2">
                    <Input autoFocus aria-label={t(CONTACT_LABEL[editingContact])} value={data.contacts[editingContact] ?? ""} placeholder={CONTACT_PLACEHOLDER[editingContact]}
                      onChange={(e) => update({ contacts: { ...data.contacts, [editingContact]: e.target.value } })} />
                    <Button size="sm" variant="outline" onPress={() => setEditingContact(null)}>{t("Done")}</Button>
                  </div>
                )}

                <div className="flex gap-5 border-b border-border text-sm">
                  {([["links", t("Links")], ["services", t("Services")], ["portfolio", t("Portfolio")]] as [ContentTab, string][]).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setTab(id)}
                      className={`-mb-px border-b-2 px-1 pb-2.5 ${tab === id ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
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
                        <Input aria-label={t("Title")} placeholder={t("Title")} value={l.title} maxLength={80} className="h-9 border-none px-0 text-[15px] font-medium shadow-none focus-visible:ring-0"
                          onChange={(e) => update({ links: data.links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                        <Input aria-label="URL" placeholder="https://" value={l.url} maxLength={600} className="h-8 border-none px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                          onChange={(e) => update({ links: data.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                      </ItemCard>
                    ))}
                  </>
                )}

                {tab === "services" && (
                  <>
                    <AddButton disabled={data.services.length >= MAX_SERVICES} onClick={() => update({ services: [...data.services, { name: "", price: "" }] })} label={t("Add service")} />
                    {data.services.length === 0 && <Empty title={t("No services yet")} text={t("List what you make and from what price: clients see it right away.")} />}
                    {data.services.map((s, i) => (
                      <ItemCard key={i} onUp={() => move("services", i, -1)} onDown={() => move("services", i, 1)} first={i === 0} last={i === data.services.length - 1}
                        onRemove={() => update({ services: data.services.filter((_, j) => j !== i) })}>
                        <div className="flex gap-3">
                          <Input aria-label={t("Service")} placeholder={t("Service")} value={s.name} maxLength={80} className="h-9 flex-1 border-none px-0 text-[15px] font-medium shadow-none focus-visible:ring-0"
                            onChange={(e) => update({ services: data.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                          <Input aria-label={t("Price")} placeholder={t("from $500")} value={s.price} maxLength={40} className="h-9 w-32 border-none px-0 text-right text-sm shadow-none focus-visible:ring-0"
                            onChange={(e) => update({ services: data.services.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })} />
                        </div>
                      </ItemCard>
                    ))}
                  </>
                )}

                {tab === "portfolio" && (
                  <>
                    {data.portfolio.length < MAX_PORTFOLIO && (
                      <FileButton multiple busy={uploading === "portfolio"} label={t("Add photos")}
                        onFiles={async (files) => { for (const f of files.slice(0, MAX_PORTFOLIO - data.portfolio.length)) await upload(f, "portfolio") }}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60">
                        <ImagePlusIcon className="size-4" />{uploading === "portfolio" ? t("Uploading...") : t("Add photos")}
                      </FileButton>
                    )}
                    {data.portfolio.length === 0
                      ? <Empty title={t("No photos yet")} text={t("Up to {n} photos of your work.", { n: MAX_PORTFOLIO })} />
                      : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {data.portfolio.map((src) => (
                            <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                              <img src={src} alt="" className="size-full object-cover" />
                              <button type="button" aria-label={t("Remove")} onClick={() => update({ portfolio: data.portfolio.filter((p) => p !== src) })}
                                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"><Trash2Icon className="size-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      )}
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
                <Field label={t("Name")}><Input value={data.title} maxLength={80} onChange={(e) => update({ title: e.target.value })} /></Field>
                <Field label={t("One line about you")}><Input value={data.tagline} placeholder={t("Custom kitchens · Austin")} maxLength={120} onChange={(e) => update({ tagline: e.target.value })} /></Field>
                <Field label={t("About")}><Textarea value={data.bio} placeholder={t("What you make, how you work, what clients love.")} maxLength={600} onChange={(e) => update({ bio: e.target.value })} /></Field>
              </Block>
            )}

            {section === "design" && (
              <>
                <Block title={t("Theme")}>
                  <div className="grid grid-cols-2 gap-3">
                    {(["light", "dark"] as const).map((th) => (
                      <button key={th} type="button" onClick={() => update({ theme: th })}
                        className={`flex flex-col gap-2 rounded-2xl p-2 text-sm ring-2 transition-colors ${data.theme === th ? "ring-foreground" : "ring-transparent hover:ring-border"}`}>
                        <span className={`flex h-24 flex-col items-center justify-center gap-1.5 rounded-xl ${th === "light" ? "bg-[#f6f5f3]" : "bg-[#141312]"}`}>
                          <span className={`size-6 rounded-full ${th === "light" ? "bg-[#d9d6d2]" : "bg-[#3a3836]"}`} />
                          <span className={`h-3 w-20 rounded-full ${th === "light" ? "bg-white ring-1 ring-black/10" : "bg-[#1e1d1c] ring-1 ring-white/10"}`} />
                          <span className={`h-3 w-20 rounded-full ${th === "light" ? "bg-white ring-1 ring-black/10" : "bg-[#1e1d1c] ring-1 ring-white/10"}`} />
                        </span>
                        {th === "light" ? t("Light") : t("Dark")}
                      </button>
                    ))}
                  </div>
                </Block>
                <Block title={t("Accent color")}>
                  <div className="flex flex-wrap gap-3">
                    {ACCENTS.map((a) => (
                      <button key={a} type="button" aria-label={a} onClick={() => update({ accent: a })}
                        className={`size-9 rounded-full ring-offset-2 ring-offset-card ${data.accent === a ? "ring-2 ring-foreground" : ""}`} style={{ background: a }} />
                    ))}
                  </div>
                </Block>
                <Block title={t("Buttons")}>
                  <div className="grid grid-cols-3 gap-3">
                    {([["pill", "rounded-full", t("Round")], ["rounded", "rounded-xl", t("Soft")], ["square", "rounded-sm", t("Square")]] as [ButtonShape, string, string][]).map(([id, cls, label]) => (
                      <button key={id} type="button" onClick={() => update({ buttons: id })}
                        className={`flex flex-col items-center gap-2 rounded-2xl p-3 text-sm ring-2 ${data.buttons === id ? "ring-foreground" : "ring-transparent hover:ring-border"}`}>
                        <span className={`h-8 w-full bg-muted ring-1 ring-border ${cls}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </Block>
              </>
            )}

            {section === "settings" && (
              <>
                <Block title={t("Page address")}>
                  <div className="flex items-center rounded-lg border border-input focus-within:border-ring">
                    <span className="shrink-0 pl-2.5 text-sm text-muted-foreground">{typeof window !== "undefined" ? window.location.host : ""}/@</span>
                    <input aria-label={t("Page address")} value={slug.slug} maxLength={30} onChange={(e) => changeSlug(e.target.value)}
                      className="h-9 min-w-0 flex-1 bg-transparent pr-2.5 text-base outline-none md:text-sm" />
                  </div>
                  <p className={`text-xs ${slug.status === "ok" ? "text-[var(--status-approved)]" : slug.status === "checking" ? "text-muted-foreground" : "text-destructive"}`}>
                    {slug.status === "ok" ? (slug.slug === savedSlug ? t("This is your address") : t("Address is free"))
                      : slug.status === "checking" ? t("Checking...") : slug.status === "taken" ? t("This address is already taken") : t(slug.problem!)}
                  </p>
                </Block>
                <Block title={t("Request form")}>
                  <Toggle checked={data.requests} onChange={(v) => update({ requests: v })} label={t("Clients can leave a request on the page")} />
                  {data.requests && (
                    <Field label={t("Button text")}><Input value={data.cta} placeholder={t("Leave a request")} maxLength={40} onChange={(e) => update({ cta: e.target.value })} /></Field>
                  )}
                  <p className="text-xs text-muted-foreground">{t("Requests arrive in Requests and in your Telegram or email notifications.")}</p>
                </Block>
                <Block title={t("Contacts")} hint={t("Only filled ones show on the page.")}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CONTACT_KEYS.map((key) => (
                      <Field key={key} label={t(CONTACT_LABEL[key])}>
                        <Input value={data.contacts[key] ?? ""} placeholder={CONTACT_PLACEHOLDER[key]} maxLength={120}
                          onChange={(e) => update({ contacts: { ...data.contacts, [key]: e.target.value } })} />
                      </Field>
                    ))}
                  </div>
                </Block>
                <Block title={t("Visibility")}>
                  {published
                    ? <div className="flex items-center justify-between gap-3"><span className="text-sm">{t("Your page is live")}</span><Button size="sm" variant="outline" onPress={() => persist(false)}>{t("Hide page")}</Button></div>
                    : <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{t("The page is hidden until you publish it.")}</span><Button size="sm" onPress={() => persist(true)} isDisabled={slug.status !== "ok"}>{t("Publish")}</Button></div>}
                </Block>
              </>
            )}
          </div>
        </main>

        {/* Phone preview */}
        <aside className="hidden min-w-0 flex-1 lg:flex lg:h-[calc(100dvh-72px)] lg:items-center lg:justify-center">
          <div className="flex items-center gap-4">
            <div className="h-[min(735px,calc(100dvh-140px))] w-[340px] overflow-hidden rounded-[40px] bg-background shadow-[0_8px_40px_rgba(0,0,0,0.12)] ring-1 ring-foreground/10">
              <div className="h-full overflow-y-auto">{preview}</div>
            </div>
            {published && savedSlug && (
              <div className="flex flex-col gap-1 rounded-full bg-muted p-1">
                <IconBtn label={t("Copy Link")} onClick={copyLink}>{copied ? <CheckIcon /> : <CopyIcon />}</IconBtn>
                <IconBtn label={t("Open page")} onClick={() => window.open(pagePath(savedSlug), "_blank", "noopener")}><ExternalLinkIcon /></IconBtn>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Phones: preview on demand */}
      <button type="button" onClick={() => setPreviewOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-xl lg:hidden">
        <EyeIcon className="size-4" />{t("Preview")}
      </button>
      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background lg:hidden">
          <button type="button" aria-label={t("Close")} onClick={() => setPreviewOpen(false)}
            className="fixed top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg"><XIcon className="size-5" /></button>
          {preview}
        </div>
      )}
    </div>
  )
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40">
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
    <div className="flex items-start gap-2 rounded-2xl bg-card p-3 pl-4 ring-1 ring-foreground/10">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <div className="flex shrink-0 flex-col items-center sm:flex-row">
        <IconBtn label={t("Move up")} onClick={onUp} disabled={first}><ArrowUpIcon /></IconBtn>
        <IconBtn label={t("Move down")} onClick={onDown} disabled={last}><ArrowDownIcon /></IconBtn>
        <IconBtn label={t("Remove")} onClick={onRemove}><Trash2Icon /></IconBtn>
      </div>
    </div>
  )
}
