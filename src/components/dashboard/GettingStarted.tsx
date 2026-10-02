"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckIcon, XIcon } from "lucide-react"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { dismissOnboarding, isOnboardingDismissed, wasLinkShared } from "@/lib/onboarding"
import { openPanel } from "@/lib/panels"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import type { Order, Shop } from "./types"

type Step = { label: string; done: boolean; href?: string; onClick?: () => void }

/** First-steps checklist for new workshops; hides itself once everything is done or dismissed. */
export function GettingStarted({ orders, shop, onNewOrder }: { orders: Order[]; shop: Shop | null; onNewOrder: () => void }) {
  const { t } = useT()
  // Only rendered on the client after the dashboard has loaded, so reading storage here is safe.
  const [dismissed, setDismissed] = useState(isOnboardingDismissed)
  const [shared] = useState(wasLinkShared)

  const first = orders[orders.length - 1]
  const withFile = orders.find((o) => o.file_url)
  const steps: Step[] = [
    { label: t("Create your first order"), done: orders.length > 0, onClick: onNewOrder },
    { label: t("Upload the design (PDF or image)"), done: !!withFile, href: first ? `/orders/${first.id}` : undefined, onClick: first ? undefined : onNewOrder },
    { label: t("Copy the portal link and send it to the client"), done: shared, href: (withFile ?? first) ? `/orders/${(withFile ?? first).id}` : undefined },
    { label: t("Get notified in Telegram"), done: !!shop?.telegram_chat_id, onClick: () => openPanel("notifications") },
    { label: t("Get your first approval"), done: orders.some((o) => o.status === "approved" || o.status === "prod") },
  ]
  const doneCount = steps.filter((s) => s.done).length

  if (dismissed || doneCount === steps.length) return null

  return (
    <Card size="sm" className="gap-3 px-4">
      <CardHeader className="px-0">
        <CardTitle>{t("Getting started")}</CardTitle>
        <CardDescription>{t("{done} of {total} done. Your first approval is a few minutes away.", { done: doneCount, total: steps.length })}</CardDescription>
        <CardAction>
          <button
            type="button"
            aria-label={t("Hide")}
            onClick={() => { dismissOnboarding(); setDismissed(true) }}
            className="-m-1.5 rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground sm:m-0 sm:p-1"
          >
            <XIcon className="size-4" />
          </button>
        </CardAction>
      </CardHeader>
      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {steps.map((step, i) => {
          const body = (
            <>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  step.done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {step.done ? <CheckIcon className="size-3" /> : i + 1}
              </span>
              <span className={cn("text-sm", step.done ? "text-muted-foreground line-through" : "text-foreground")}>{step.label}</span>
            </>
          )
          const cls = "flex items-start gap-2 rounded-lg p-2 text-left transition-colors"
          if (step.done || (!step.href && !step.onClick)) return <li key={i} className={cls}>{body}</li>
          return (
            <li key={i}>
              {step.href ? (
                <Link href={step.href} className={cn(cls, "hover:bg-hover")}>{body}</Link>
              ) : (
                <button type="button" onClick={step.onClick} className={cn(cls, "w-full hover:bg-hover")}>{body}</button>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
