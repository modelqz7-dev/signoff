"use client"

import { useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import { NICHES, type CrmNiche } from "@/lib/niches"
import { chooseNiche } from "@/lib/crm"
import { cn } from "@/lib/utils"
import { notifyPlanChanged } from "@/lib/use-plan"
import { useT } from "@/lib/i18n"

/** The first screen of a new account: what the business does, which sets up its dashboard. */
export function NichePicker({ shopId, onChosen }: { shopId: string; onChosen: (niche: CrmNiche | "smm") => void }) {
  const { t } = useT()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function pick(niche: CrmNiche | "smm") {
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
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-[28px] font-semibold tracking-tight">{t("What do you do?")}</h1>
          <p className="text-[15px] text-muted-foreground">{t("We'll set Nodly up for your work: services, the booking form and the dashboard.")}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {NICHES.map((n) => (
            <button
              key={n.id}
              type="button"
              disabled={!!busy}
              onClick={() => pick(n.id)}
              className={cn(
                "group flex items-center gap-4 rounded-2xl bg-card p-4 text-left ring-1 ring-border transition-all hover:ring-foreground/30 disabled:opacity-60",
                busy === n.id && "ring-foreground/50"
              )}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-[28px]" aria-hidden>{n.emoji}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-semibold">{t(n.name)}</span>
                <span className="text-[13.5px] text-muted-foreground">{t(n.hint)}</span>
              </span>
              <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <button type="button" disabled={!!busy} onClick={() => pick("smm")} className="mx-auto text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t("I'm an SMM specialist: content plans for clients")}
        </button>
      </div>
    </div>
  )
}
