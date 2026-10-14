"use client"

import { nicheConfig } from "@/lib/niches"
import { useT } from "@/lib/i18n"

/**
 * Shown to the owner when the business isn't chosen (e.g. right after switching it): the page
 * then has no booking, so say so and lead to the business picker.
 */
export function NoNicheNotice({ niche }: { niche: string | null | undefined }) {
  const { t } = useT()
  if (niche === "smm" || nicheConfig(niche)) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[22px] bg-destructive/[0.08] px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold">{t("Online booking is off: your business isn't chosen.")}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{t("Clients see the page without booking. Choose the business and the booking form appears.")}</p>
      </div>
      <a href="/welcome" className="flex h-10 shrink-0 items-center rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90">{t("Choose the business")}</a>
    </div>
  )
}
