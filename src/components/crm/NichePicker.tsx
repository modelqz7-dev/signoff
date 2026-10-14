"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"
import { NICHES, type CrmNiche } from "@/lib/niches"
import { chooseNiche } from "@/lib/crm"
import { cn } from "@/lib/utils"
import { notifyPlanChanged } from "@/lib/use-plan"
import { useSyncAccountLang } from "@/lib/account-lang"
import { useT } from "@/lib/i18n"
import { NicheIcon } from "@/components/crm/NicheIcon"
import { LogoMark } from "@/components/Logo"

/**
 * The first screen of a new account (and of a business change), in the manner of Apple's setup
 * screens: a big title, three large cards to pick from, then Continue.
 */
export function NichePicker({ shopId, onChosen }: { shopId: string; onChosen: (niche: CrmNiche) => void }) {
  // no menu on this screen, and the menu is what brings in the account's language: the starter
  // services are named in it, so take it here too
  useSyncAccountLang()
  const { t } = useT()
  const [picked, setPicked] = useState<CrmNiche | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go(niche = picked) {
    if (!niche) return
    setBusy(true)
    setError(null)
    try {
      await chooseNiche(shopId, niche, t)
      // the menu reads the niche with the plan
      notifyPlanChanged()
      onChosen(niche)
    } catch (e) {
      const message = (e as Error)?.message ?? ""
      setError(/niche_check|check constraint/i.test(message) ? t("This business isn't enabled in the database yet: run supabase/tattoo.sql in Supabase, then pick it again.") : message || t("Couldn't save. Try again."))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-[1080px] flex-col items-center gap-10">
        <header className="flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
          <LogoMark className="size-12" />
          <div className="flex flex-col gap-3">
            <h1 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-[44px]">{t("What's your business?")}</h1>
            <p className="mx-auto max-w-md text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">{t("We'll set Nodly up for your work: services, the booking form and the dashboard.")}</p>
          </div>
        </header>

        <div role="radiogroup" aria-label={t("What's your business?")} className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {NICHES.map((n, i) => {
            const on = picked === n.id
            return (
              <button
                key={n.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={busy}
                onClick={() => setPicked(n.id)}
                onDoubleClick={() => go(n.id)}
                style={{ animationDelay: `${150 + i * 90}ms` }}
                className={cn(
                  "group relative flex items-center gap-4 rounded-[22px] bg-card p-4 text-left transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-3 fill-mode-both [animation-duration:700ms]",
                  "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] ring-1 dark:shadow-none",
                  "sm:flex-col sm:items-center sm:gap-5 sm:px-6 sm:pt-9 sm:pb-7 sm:text-center",
                  "hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_18px_40px_-16px_rgba(0,0,0,0.22)] disabled:pointer-events-none",
                  on ? "ring-2 ring-foreground" : "ring-border hover:ring-foreground/20"
                )}
              >
                <span className={cn("rounded-full p-1 transition-all duration-300", on ? "bg-foreground/[0.06] dark:bg-white/10" : "bg-transparent")}>
                  <NicheIcon niche={n.id} className="size-16 transition-transform duration-300 group-hover:scale-[1.03] sm:size-28" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[17px] font-semibold tracking-[-0.01em]">{t(n.name)}</span>
                  <span className="text-[14px] leading-snug text-muted-foreground">{t(n.hint)}</span>
                </span>
                <span aria-hidden className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 sm:absolute sm:top-4 sm:right-4",
                  on ? "scale-100 bg-foreground text-background" : "scale-90 ring-[1.5px] ring-foreground/20",
                )}>
                  <CheckIcon className={cn("size-3.5 transition-opacity duration-200", on ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex w-full max-w-xs flex-col items-center gap-3 animate-in fade-in fill-mode-both duration-700 [animation-delay:450ms]">
          <button
            type="button"
            onClick={() => go()}
            disabled={!picked || busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[16px] font-medium text-background transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-25"
          >
            {busy && <span className="size-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />}
            {busy ? t("Setting up…") : t("Continue")}
          </button>
          <p className="text-[13px] text-muted-foreground">{t("You can change it later in your profile.")}</p>
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  )
}
