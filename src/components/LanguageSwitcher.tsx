"use client"

import { cn } from "@/lib/utils"
import { setLang, useLang, type Lang } from "@/lib/i18n"

function RuFlag() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className="size-full">
      <rect width="30" height="10" fill="#ffffff" />
      <rect y="10" width="30" height="10" fill="#0039a6" />
      <rect y="20" width="30" height="10" fill="#d52b1e" />
    </svg>
  )
}

function GbFlag() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className="size-full">
      <rect width="30" height="30" fill="#012169" />
      <path d="M0 0L30 30M30 0L0 30" stroke="#ffffff" strokeWidth="6" />
      <path d="M0 0L30 30M30 0L0 30" stroke="#c8102e" strokeWidth="2" />
      <path d="M15 0V30M0 15H30" stroke="#ffffff" strokeWidth="10" />
      <path d="M15 0V30M0 15H30" stroke="#c8102e" strokeWidth="6" />
    </svg>
  )
}

const OPTIONS: { lang: Lang; label: string; Flag: () => React.JSX.Element }[] = [
  { lang: "ru", label: "Русский", Flag: RuFlag },
  { lang: "en", label: "English", Flag: GbFlag },
]

/** Two round flag buttons; the active language is lifted and ringed. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLang()
  return (
    <div role="radiogroup" aria-label="Language" className={cn("flex items-center gap-1 rounded-full bg-muted/40 p-0.5", className)}>
      {OPTIONS.map(({ lang, label, Flag }) => {
        const active = lang === current
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setLang(lang)}
            className={cn(
              "size-6 overflow-hidden rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
              active ? "scale-100 opacity-100 ring-2 ring-accent" : "scale-90 opacity-50 grayscale-[40%] hover:scale-95 hover:opacity-90"
            )}
          >
            <Flag />
          </button>
        )
      })}
    </div>
  )
}
