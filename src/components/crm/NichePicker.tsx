"use client"

import { useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import { NICHES, type CrmNiche } from "@/lib/niches"
import { chooseNiche } from "@/lib/crm"
import { cn } from "@/lib/utils"
import { notifyPlanChanged } from "@/lib/use-plan"
import { useSyncAccountLang } from "@/lib/account-lang"
import { useT } from "@/lib/i18n"

/** The first screen of a new account (and of a niche change): what the business is. */
export function NichePicker({ shopId, onChosen }: { shopId: string; onChosen: (niche: CrmNiche) => void }) {
  // no menu on this screen, and the menu is what brings in the account's language: the starter
  // services are named in it, so take it here too
  useSyncAccountLang()
  const { t } = useT()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function pick(niche: CrmNiche) {
    setBusy(niche)
    setError(null)
    try {
      await chooseNiche(shopId, niche, t)
      // the menu reads the niche with the plan
      notifyPlanChanged()
      onChosen(niche)
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't save. Try again."))
      setBusy(null)
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-[30px] font-semibold tracking-tight">{t("What's your business?")}</h1>
          <p className="text-[15px] text-muted-foreground">{t("We'll set Nodly up for your work: services, the booking form and the dashboard.")}</p>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {NICHES.map((n, i) => (
            <button
              key={n.id}
              type="button"
              disabled={!!busy}
              onClick={() => pick(n.id)}
              style={{ animationDelay: `${120 + i * 70}ms` }}
              className={cn(
                "group flex items-center gap-4 px-5 py-4 text-left transition-colors animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-500 hover:bg-hover disabled:opacity-60",
                i > 0 && "border-t border-border",
                busy === n.id && "bg-hover"
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-semibold">{t(n.name)}</span>
                <span className="text-[13.5px] text-muted-foreground">{t(n.hint)}</span>
              </span>
              {busy === n.id
                ? <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                : <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />}
            </button>
          ))}
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
