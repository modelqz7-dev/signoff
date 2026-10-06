"use client"

import { useId, useRef } from "react"
import { ImagePlusIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n"

// Small building blocks of the page editor.

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

export function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground disabled:opacity-30 [&_svg]:size-4">
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left text-sm">
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-foreground" : "bg-muted ring-1 ring-border"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  )
}

export function FileButton({ onFiles, multiple, busy, className, children, label }: {
  onFiles: (files: File[]) => void; multiple?: boolean; busy?: boolean; className?: string; children: React.ReactNode; label?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" aria-label={label} className={className} disabled={busy} onClick={() => ref.current?.click()}>{children}</button>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) onFiles(files) }} />
    </>
  )
}

export function ImagePick({ label, src, round, wide, busy, onPick, onClear }: {
  label: string; src: string | null; round?: boolean; wide?: boolean; busy?: boolean
  onPick: (file: File) => void; onClear: () => void
}) {
  const { t } = useT()
  const box = `${round ? "size-20 rounded-full" : wide ? "h-20 w-40 rounded-xl" : "size-20 rounded-xl"} overflow-hidden bg-muted flex items-center justify-center`
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-xs font-medium">{label}</span>
      <FileButton busy={busy} label={label} onFiles={(f) => onPick(f[0])} className={`${box} text-muted-foreground transition-opacity hover:opacity-80`}>
        {src ? <img src={src} alt="" className="size-full object-cover" /> : <ImagePlusIcon className="size-5" />}
      </FileButton>
      <div className="flex gap-3 text-xs">
        {busy ? <span className="text-muted-foreground">{t("Uploading...")}</span>
          : src && <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground">{t("Remove")}</button>}
      </div>
    </div>
  )
}

/** A white card section inside an editor panel. */
export function Block({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      {(title || hint) && (
        <div className="flex flex-col gap-0.5">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

/** A grey person silhouette, shown where the page has no photo yet. */
export function AvatarPlaceholder({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 164 164" className={className} aria-hidden>
      <clipPath id={id}><circle cx="82" cy="82" r="82" /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="164" height="164" className="fill-[#a8aaa2] dark:fill-neutral-600" />
        <circle cx="82" cy="62" r="35" className="fill-[#f2f2ef] dark:fill-neutral-300" />
        <ellipse cx="82" cy="168" rx="66" ry="62" className="fill-[#f2f2ef] dark:fill-neutral-300" />
      </g>
    </svg>
  )
}
