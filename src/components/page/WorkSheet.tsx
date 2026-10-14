"use client"

import { useEffect, useState } from "react"
import { ImagePlusIcon, PlusIcon, XIcon } from "lucide-react"
import { FILLED, FILLED_AREA, FileButton } from "@/components/page/EditorBits"
import { MAX_PROJECT_PHOTOS, type PageProject } from "@/lib/page"
import { useT } from "@/lib/i18n"

/**
 * One work (or project) opened in a sheet: photos first, then a name and a few words.
 * Edits stay in the sheet until Save, so closing it changes nothing.
 */
export function WorkSheet({ work, isNew, salon, hint, upload, onSave, onDelete, onClose }: {
  work: PageProject
  isNew: boolean
  /** A beauty or cake business: "work" wording and no city field. */
  salon: boolean
  /** The name field's example. */
  hint: string
  /** Shrinks and uploads one photo; its address, or null if it failed. */
  upload: (file: File) => Promise<string | null>
  onSave: (work: PageProject) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const { t } = useT()
  const [draft, setDraft] = useState(work)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const set = (patch: Partial<PageProject>) => setDraft((d) => ({ ...d, ...patch }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function addPhotos(files: File[]) {
    const room = MAX_PROJECT_PHOTOS - draft.photos.length
    const images = files.filter((f) => f.type.startsWith("image/")).slice(0, room)
    if (!images.length) return
    setBusy(true)
    for (const f of images) {
      const url = await upload(f)
      if (url) setDraft((d) => ({ ...d, photos: [...d.photos, url].slice(0, MAX_PROJECT_PHOTOS) }))
    }
    setBusy(false)
  }
  // the chosen photo becomes the cover (the first one)
  const makeCover = (src: string) => set({ photos: [src, ...draft.photos.filter((x) => x !== src)] })

  const title = isNew ? (salon ? t("New work") : t("New project")) : (salon ? t("Edit work") : t("Edit project"))
  const empty = !draft.photos.length && !draft.title.trim() && !draft.description.trim()
  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true) },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(false); addPhotos(Array.from(e.dataTransfer.files)) },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-t-[28px] bg-card shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button type="button" aria-label={t("Close")} onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1]"><XIcon className="size-4" /></button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-2">
          {/* Photos first: what clients look at */}
          {draft.photos.length === 0 ? (
            <FileButton multiple busy={busy} label={t("Add photos")} onFiles={addPhotos}
              className={`flex h-52 w-full flex-col items-center justify-center gap-2 rounded-[22px] text-center transition-colors ${over ? "bg-foreground/[0.1]" : "bg-foreground/[0.05] hover:bg-foreground/[0.08]"}`}>
              <span {...dropProps} className="flex size-full flex-col items-center justify-center gap-2">
                <span className="flex size-12 items-center justify-center rounded-full bg-card shadow-[0_1px_3px_rgba(0,0,0,0.12)]"><ImagePlusIcon className="size-5" /></span>
                <span className="text-[15px] font-medium">{busy ? t("Uploading...") : t("Add photos")}</span>
                <span className="text-[13px] text-muted-foreground">{t("Drag them here or choose a few at once")}</span>
              </span>
            </FileButton>
          ) : (
            <div {...dropProps} className={`grid grid-cols-3 gap-2 rounded-[22px] transition-colors ${over ? "bg-foreground/[0.06]" : ""}`}>
              {draft.photos.map((src, k) => (
                <div key={src} className={`group relative overflow-hidden rounded-2xl bg-foreground/[0.05] ${k === 0 ? "col-span-2 row-span-2" : ""} aspect-square`}>
                  <img src={src} alt="" className="size-full object-cover" />
                  {k === 0
                    ? <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{t("Cover")}</span>
                    : <button type="button" onClick={() => makeCover(src)}
                        className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-black/55 py-0.5 text-[11px] font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100">{t("Make cover")}</button>}
                  <button type="button" aria-label={t("Remove")} onClick={() => set({ photos: draft.photos.filter((x) => x !== src) })}
                    className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75"><XIcon className="size-3.5" /></button>
                </div>
              ))}
              {draft.photos.length < MAX_PROJECT_PHOTOS && (
                <FileButton multiple busy={busy} label={t("Add photos")} onFiles={addPhotos}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl bg-foreground/[0.05] text-[12px] text-muted-foreground hover:bg-foreground/[0.08] disabled:opacity-60">
                  {busy ? "…" : <><PlusIcon className="size-5" />{t("Photos")}</>}
                </FileButton>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("Name")}</span>
            <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder={hint} maxLength={80}
              className={`w-full outline-none placeholder:text-muted-foreground ${FILLED}`} />
          </div>
          {!salon && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-muted-foreground">{t("City")}</span>
              <input value={draft.city} onChange={(e) => set({ city: e.target.value })} placeholder={t("City")} maxLength={60}
                className={`w-full outline-none placeholder:text-muted-foreground ${FILLED}`} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("Description")}</span>
            <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} maxLength={1000}
              placeholder={salon ? t("A few words about this work") : t("The task, what you did, the result…")}
              className={`min-h-24 w-full resize-none outline-none placeholder:text-muted-foreground ${FILLED_AREA}`} />
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
          <button type="button" disabled={busy || empty} onClick={() => onSave(draft)}
            className="h-12 rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40">
            {isNew ? t("Add") : t("Save")}
          </button>
          {onDelete && (
            <button type="button" onClick={() => { if (window.confirm(salon ? t("Delete this work?") : t("Delete this project?"))) onDelete() }}
              className="h-10 rounded-full text-[14px] text-destructive hover:bg-destructive/10">
              {salon ? t("Delete work") : t("Delete project")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
