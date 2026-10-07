"use client"

import { SparklesIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { formatPrice, planFor, YEARLY_DISCOUNT, type Feature, type Plan } from "@/lib/plans"
import { openPanel } from "@/lib/panels"

/** Monthly / yearly switch for plan prices. */
export function BillingCycleToggle({ yearly, onChange }: { yearly: boolean; onChange: (yearly: boolean) => void }) {
  const { t } = useT()
  const option = (value: boolean, label: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={yearly === value}
      onClick={() => onChange(value)}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors",
        yearly === value ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {option(false, t("Monthly"))}
      {option(true, (
        <>
          {t("Yearly")}
          <span className="rounded bg-accent/15 px-1 text-[10px] font-medium text-accent">−{YEARLY_DISCOUNT * 100}%</span>
        </>
      ))}
    </div>
  )
}

export function PlanPrice({ plan, yearly, className }: { plan: Plan; yearly: boolean; className?: string }) {
  const { t } = useT()
  return (
    <span className={cn("flex items-baseline gap-1", className)}>
      <span>{formatPrice(plan, yearly)}</span>
      {plan.monthly > 0 && (
        <span className="text-xs font-normal text-muted-foreground">
          {yearly ? t("/mo, billed yearly") : t("/mo")}
        </span>
      )}
    </span>
  )
}

/** "2 of 3 active orders" with a bar that turns red at the limit. */
export function UsageMeter({ used, limit, className }: { used: number; limit: number | null; className?: string }) {
  const { t } = useT()
  const share = limit ? Math.min(used / limit, 1) : 0
  const full = limit !== null && used >= limit
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{t("Active orders")}</span>
        <span
          className={cn("shrink-0 font-medium", full ? "text-destructive" : "text-foreground")}
          title={limit === null ? t("Unlimited") : undefined}
        >
          {limit === null ? `${used} / ∞` : t("{used} of {limit}", { used, limit })}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", full ? "bg-destructive" : "bg-accent")}
            style={{ width: `${Math.round(share * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** Small "Pro" chip for features the current plan doesn't include; opens Billing. */
export function UpgradeChip({ feature, className }: { feature: Feature; className?: string }) {
  const { t } = useT()
  const plan = planFor(feature)
  return (
    <button
      type="button"
      onClick={() => openPanel("billing")}
      title={t("Available on {plan}", { plan: t(plan.name) })}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/25",
        className
      )}
    >
      <SparklesIcon className="size-3" />
      {t(plan.name)}
    </button>
  )
}
