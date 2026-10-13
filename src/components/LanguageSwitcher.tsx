"use client"

import { cn } from "@/lib/utils"
import { setLang, useLang, useT, type Lang } from "@/lib/i18n"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Languages the site can be shown in, each named in its own language. Add new ones here. */
const LANGUAGES: { id: Lang; name: string }[] = [
  { id: "uk", name: "Українська" },
  { id: "ru", name: "Русский" },
]

/** Language picker: the current language with a chevron; opens a list of all languages. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLang()
  const { t } = useT()
  return (
    <Select
      aria-label={t("Language")}
      selectedKey={current}
      onSelectionChange={(key) => key && setLang(key as Lang)}
      className={cn("w-fit", className)}
    >
      <SelectTrigger size="sm" className="min-w-28 gap-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent placement="bottom end">
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.id} id={lang.id} className="focus:bg-muted data-focused:bg-muted text-foreground! **:text-foreground!">{lang.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
