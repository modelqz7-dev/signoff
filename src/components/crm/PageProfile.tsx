"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { DownloadIcon, ImagePlusIcon, PlusIcon, XIcon } from "lucide-react"
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { FileButton } from "@/components/page/EditorBits"
import { CONTACT_ICON } from "@/components/page/contact-icons"
import { FIELD } from "@/components/crm/BookingDialog"
import { NicheIcon } from "@/components/crm/NicheIcon"
import { uploadPublicAsset } from "@/lib/files"
import { shrinkImage } from "@/lib/image"
import { BOOKING_CONTACTS, MAX_LINKS, MAX_PROJECT_PHOTOS, pagePhotos, type PageContacts, type PageData } from "@/lib/page"
import type { CrmNiche } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

const LABEL = "text-[12.5px] font-medium text-muted-foreground"

const CONTACT_HINT: Record<string, string> = { instagram: "@studio", telegram: "@name", viber: "+380 67 123 4567", whatsapp: "+380 67 123 4567", phone: "+380 67 123 4567" }

/** The page's look: photo, cover, name, a line and a word about the business, contacts, links and work photos. */
export function PageProfile({ shopId, niche, data, onChange }: {
  shopId: string
  niche: CrmNiche
  data: PageData
  onChange: (patch: Partial<PageData>) => void
}) {
  const { t } = useT()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const photos = pagePhotos(data)

  async function upload(file: File, kind: string, maxSide: number) {
    if (!file.type.startsWith("image/")) { setError(t("Choose an image file")); return null }
    try {
      const small = await shrinkImage(file, maxSide)
      if (small.size > 4 * 1024 * 1024) throw new Error(t("Image must be under 4 MB"))
      return await uploadPublicAsset(shopId, small, `page-${kind}`)
    } catch (e) {
      setError((e as Error)?.message || t("Upload failed"))
      return null
    }
  }
  async function pickImage(file: File, kind: "avatar" | "banner") {
    setBusy(kind)
    setError(null)
    const url = await upload(file, kind, kind === "avatar" ? 600 : 1600)
    if (url) onChange(kind === "avatar" ? { avatar_url: url } : { banner_url: url })
    setBusy(null)
  }
  async function addPhotos(files: File[]) {
    setBusy("photos")
    setError(null)
    const added: string[] = []
    for (const f of files.slice(0, MAX_PROJECT_PHOTOS - photos.length)) {
      const url = await upload(f, "work", 1600)
      if (url) added.push(url)
    }
    if (added.length) setPhotos([...photos, ...added])
    setBusy(null)
  }
  const setPhotos = (list: string[]) => onChange({ projects: list.length ? [{ title: "", city: "", description: "", photos: list.slice(0, MAX_PROJECT_PHOTOS) }] : [] })
  const setContact = (key: keyof PageContacts, value: string) => onChange({ contacts: { ...data.contacts, [key]: value } })

  return (
    <>
      <section className="flex flex-col gap-4 rounded-[22px] apple-card p-4">
        <h2 className="text-[15px] font-semibold">{t("How the page looks")}</h2>
        {/* the cover with the photo over its edge, as clients see it */}
        <div className="relative pb-10">
          <FileButton label={t("Cover")} busy={busy === "banner"} onFiles={(f) => pickImage(f[0], "banner")}
            className="group relative flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl bg-foreground/[0.05] text-muted-foreground transition-colors hover:bg-foreground/[0.08]">
            {data.banner_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={data.banner_url} alt="" className="size-full object-cover" />
              : <span className="flex items-center gap-1.5 text-[13px] font-medium"><ImagePlusIcon className="size-4" />{busy === "banner" ? t("Uploading...") : t("Add a cover")}</span>}
          </FileButton>
          {data.banner_url && (
            <button type="button" aria-label={t("Remove")} onClick={() => onChange({ banner_url: null })}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"><XIcon className="size-4" /></button>
          )}
          <div className="absolute bottom-0 left-4 flex items-end gap-3">
            <FileButton label={t("Photo or logo")} busy={busy === "avatar"} onFiles={(f) => pickImage(f[0], "avatar")}
              className="relative size-20 overflow-hidden rounded-full bg-card ring-4 ring-card transition-opacity hover:opacity-85">
              {data.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={data.avatar_url} alt="" className="size-full object-cover" />
                : <NicheIcon niche={niche} className="size-full" />}
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-center text-[10px] font-medium text-white">{busy === "avatar" ? "…" : t("Photo")}</span>
            </FileButton>
            {data.avatar_url && <button type="button" onClick={() => onChange({ avatar_url: null })} className="mb-1 text-[12px] text-muted-foreground hover:text-foreground">{t("Remove")}</button>}
          </div>
        </div>

        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Name")}</span>
          <input value={data.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={80} className={FIELD} /></label>
        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("One line under the name")}</span>
          <input value={data.tagline} onChange={(e) => onChange({ tagline: e.target.value })} maxLength={120} placeholder={t("e.g. Manicure in Podil · 9 years of experience")} className={FIELD} /></label>
        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("About")}</span>
          <textarea value={data.bio} onChange={(e) => onChange({ bio: e.target.value })} rows={3} maxLength={2000}
            placeholder={t("e.g. Studio at Khreshchatyk 10, 2nd floor. Sterile tools, coffee included.")} className={cn(FIELD, "h-auto resize-none py-2.5 leading-snug")} /></label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-[22px] apple-card p-4">
        <div>
          <h2 className="text-[15px] font-semibold">{t("Contacts")}</h2>
          <p className="text-[12.5px] text-muted-foreground">{t("Only filled ones show on the page, as round buttons.")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {BOOKING_CONTACTS.map((k) => (
            <label key={k} className={cn(FIELD, "flex items-center gap-2.5")}>
              <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{CONTACT_ICON[k]}</span>
              <input value={data.contacts[k] ?? ""} onChange={(e) => setContact(k, e.target.value)} maxLength={120} placeholder={CONTACT_HINT[k]}
                aria-label={k} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[22px] apple-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">{t("Work photos")}</h2>
            <p className="text-[12.5px] text-muted-foreground">{t("Your best work: clients look at it before they book.")}</p>
          </div>
          <span className="text-[12.5px] text-muted-foreground tabular-nums">{photos.length}/{MAX_PROJECT_PHOTOS}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((src, i) => (
            <div key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
              <button type="button" aria-label={t("Remove")} onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-90 hover:bg-black/75"><XIcon className="size-3.5" /></button>
            </div>
          ))}
          {photos.length < MAX_PROJECT_PHOTOS && (
            <FileButton multiple label={t("Add photos")} busy={busy === "photos"} onFiles={addPhotos}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-foreground/[0.05] text-[12px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.08]">
              <ImagePlusIcon className="size-5" />{busy === "photos" ? t("Uploading...") : t("Add photos")}
            </FileButton>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[22px] apple-card p-4">
        <div>
          <h2 className="text-[15px] font-semibold">{t("Links")}</h2>
          <p className="text-[12.5px] text-muted-foreground">{t("Buttons under the booking: price list, reviews, a map, a gift certificate…")}</p>
        </div>
        {data.links.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={l.title} onChange={(e) => onChange({ links: data.links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
              maxLength={80} placeholder={t("Title")} aria-label={t("Title")} className={cn(FIELD, "w-2/5")} />
            <input value={l.url} onChange={(e) => onChange({ links: data.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
              maxLength={600} placeholder="https://" aria-label={t("Link")} className={cn(FIELD, "min-w-0 flex-1")} />
            <button type="button" aria-label={t("Remove")} onClick={() => onChange({ links: data.links.filter((_, j) => j !== i) })}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground"><XIcon className="size-4" /></button>
          </div>
        ))}
        {data.links.length < MAX_LINKS && (
          <button type="button" onClick={() => onChange({ links: [...data.links, { title: "", url: "" }] })}
            className="flex h-10 items-center justify-center gap-1.5 self-start rounded-full px-4 text-[13.5px] font-medium ring-1 ring-border hover:bg-hover">
            <PlusIcon className="size-4" />{t("Add link")}
          </button>
        )}
      </section>
    </>
  )
}

/** The page's QR code, to print on cards and stickers or put at the counter. */
export function QrDialog({ url, slug, open, onClose }: { url: string; slug: string; open: boolean; onClose: () => void }) {
  const { t } = useT()
  const [png, setPng] = useState("")
  useEffect(() => {
    if (!open || !url) return
    let off = false
    QRCode.toDataURL(url, { margin: 2, width: 1024, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } })
      .then((p) => { if (!off) setPng(p) })
    return () => { off = true }
  }, [open, url])
  return (
    <Dialog isOpen={open} onOpenChange={(v) => !v && onClose()} className="gap-4 rounded-[24px] p-6 sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-[20px] tracking-[-0.01em]">{t("QR code")}</DialogTitle>
        <DialogDescription>{t("Clients point their camera at it and your page opens. Print it on cards or put it at the counter.")}</DialogDescription>
      </DialogHeader>
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-white ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {png && <img src={png} alt={t("QR code")} className="size-full" />}
      </div>
      <a href={png || undefined} download={`nodly-${slug}-qr.png`} aria-disabled={!png}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-medium text-background hover:opacity-90">
        <DownloadIcon className="size-4" />{t("Download PNG")}
      </a>
    </Dialog>
  )
}
