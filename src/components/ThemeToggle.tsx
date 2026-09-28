"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { setTheme, useTheme } from "@/lib/theme"
import { useT } from "@/lib/i18n"

/** Sun/moon icon button; the new theme grows from the button (see setTheme). */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme()
  const { t } = useT()
  const next = theme === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      aria-label={next === "light" ? t("Switch to light theme") : t("Switch to dark theme")}
      title={next === "light" ? t("Switch to light theme") : t("Switch to dark theme")}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setTheme(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }}
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </button>
  )
}
