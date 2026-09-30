"use client"

import { cn } from "@/lib/utils"
import { setLang, useLang, type Lang } from "@/lib/i18n"

const OPTIONS: { lang: Lang; short: string; label: string }[] = [
  { lang: "ru", short: "RU", label: "Русский" },
  { lang: "en", short: "EN", label: "English" },
]

/** A small two-way toggle: "RU | EN", the active language sits on a raised chip. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLang()
  return (
    <div role="radiogroup" aria-label="Language" className={cn("inline-flex items-center rounded-full bg-muted p-0.5", className)}>
      {OPTIONS.map(({ lang, short, label }) => {
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
              "h-6 min-w-9 rounded-full px-2.5 text-xs font-medium tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {short}
          </button>
        )
      })}
    </div>
  )
}
