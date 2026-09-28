"use client"

import { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { today, getLocalTimeZone, parseDate, type DateValue } from "@internationalized/date"
import type { Order } from "./types"
import { useT } from "@/lib/i18n"
import { I18nProvider } from "react-aria-components"
import { isPlanLimitError, planById, PLANS, type Plan } from "@/lib/plans"
import { loadPlanUsage, notifyPlanChanged } from "@/lib/use-plan"
import { openPanel } from "@/lib/panels"
import { UsageMeter } from "@/components/plans/PlanBits"
import { uploadOrderFile } from "@/lib/versions"

type NewOrderModalProps = {
  shopId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (order: Order) => void
}

export function NewOrderModal({ shopId, open, onOpenChange, onCreated }: NewOrderModalProps) {
  const { t } = useT()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [value, setValue] = useState("")
  const [deadline, setDeadline] = useState("")
  const [notes, setNotes] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Set when the shop has as many active orders as its plan allows.
  const [limit, setLimit] = useState<{ plan: Plan; used: number } | null>(null)

  useEffect(() => {
    if (!open || !shopId) return
    let cancelled = false
    loadPlanUsage(shopId).then((usage) => {
      if (!cancelled) setLimit(usage?.atLimit ? { plan: usage.plan, used: usage.activeOrders } : null)
    })
    return () => { cancelled = true }
  }, [open, shopId])

  function reset() {
    setTitle("")
    setClientName("")
    setClientEmail("")
    setValue("")
    setDeadline("")
    setNotes("")
    setFile(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !clientName.trim()) return
    if (!shopId) {
      setError(t("Shop not loaded. Please refresh the page."))
      return
    }
    setSaving(true)
    setError(null)

    let fileUrl: string | null = null

    if (file) {
      try {
        fileUrl = await uploadOrderFile(shopId, file)
      } catch (e) {
        setSaving(false)
        setError((e as Error)?.message || t("Couldn't upload the file"))
        return
      }
    }

    const code = `ORD-${Date.now().toString(36).toUpperCase()}`

    const { data, error: insertErr } = await supabase
      .from("orders")
      .insert({
        shop_id: shopId,
        code,
        title: title.trim(),
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        value: parseFloat(value) || 0,
        notes: notes.trim(),
        status: "await",
        deadline: deadline || null,
        file_url: fileUrl,
      })
      .select()
      .single()

    setSaving(false)

    if (insertErr) {
      // The database refuses orders over the plan limit (supabase/plans.sql).
      if (isPlanLimitError(insertErr)) {
        const usage = await loadPlanUsage(shopId)
        const plan = usage?.plan ?? planById("free")
        setLimit({ plan, used: usage?.activeOrders ?? plan.activeOrders ?? 0 })
      } else setError(insertErr.message)
      return
    }

    if (data) {
      notifyPlanChanged()
      onCreated?.(data as Order)
      reset()
      onOpenChange(false)
    }
  }

  if (!open) return null

  if (limit) {
    return (
      <PlanLimitDialog
        plan={limit.plan}
        used={limit.used}
        onOpenChange={onOpenChange}
      />
    )
  }

  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-md"
    >
      <DialogHeader>
        <DialogTitle>{t("New Order")}</DialogTitle>
        <DialogDescription>
          {t("Create a new order for client approval.")}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-title">{t("Order name *")}</Label>
          <Input
            id="order-title"
            placeholder={t("e.g. Custom cabinet set")}
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">{t("Client name *")}</Label>
            <Input
              id="client-name"
              placeholder={t("John Doe")}
              value={clientName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-email">{t("Client email")}</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="john@example.com"
              value={clientEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="order-value">{t("Price ($)")}</Label>
            <Input
              id="order-value"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Deadline")}</Label>
            <DatePickerField value={deadline} onChange={setDeadline} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-file">{t("PDF / File")}</Label>
          <Input
            id="order-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
            className="file:text-muted-foreground file:border-0 file:bg-transparent file:text-sm cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-notes">{t("Notes")}</Label>
          <Textarea
            id="order-notes"
            placeholder={t("Additional details...")}
            rows={3}
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <DialogClose variant="outline">{t("Cancel")}</DialogClose>
          <Button type="submit" isDisabled={saving || !title.trim() || !clientName.trim()}>
            {saving ? t("Creating...") : t("Create Order")}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

/** Shown instead of the form when the plan's active-order limit is reached. */
function PlanLimitDialog({ plan, used, onOpenChange }: {
  plan: Plan
  used: number
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useT()
  const next = PLANS[PLANS.findIndex((p) => p.id === plan.id) + 1]

  return (
    <Dialog isOpen onOpenChange={onOpenChange} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("You've reached your plan limit")}</DialogTitle>
        <DialogDescription>
          {t("The {plan} plan includes up to {n} active orders. Approved orders don't count, so finishing one frees a slot.", {
            plan: plan.name,
            n: plan.activeOrders ?? used,
          })}
        </DialogDescription>
      </DialogHeader>

      <UsageMeter used={used} limit={plan.activeOrders} />

      {next && (
        <div className="rounded-lg bg-accent/10 p-3 text-sm ring-1 ring-accent/30">
          <p className="font-medium text-foreground">
            {next.activeOrders === null
              ? t("{plan}: unlimited active orders", { plan: next.name })
              : t("{plan}: up to {n} active orders", { plan: next.name, n: next.activeOrders })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{next.highlights.slice(1, 4).map((h) => t(h)).join(" · ")}</p>
        </div>
      )}

      <DialogFooter>
        <DialogClose variant="outline">{t("Close")}</DialogClose>
        <Button onPress={() => { onOpenChange(false); openPanel("billing") }}>
          {t("See plans")}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showCal, setShowCal] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t, locale } = useT()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowCal(false)
      }
    }
    if (showCal) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showCal])

  const todayDate = today(getLocalTimeZone())
  const selected: DateValue | undefined = value ? parseDate(value) : undefined

  function formatDisplay(v: string): string {
    if (!v) return ""
    const [y, m, d] = v.split("-")
    return `${d}.${m}.${y}`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setShowCal(!showCal)}
        className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm text-foreground transition-colors hover:bg-hover"
      >
        {value ? (
          <span>{formatDisplay(value)}</span>
        ) : (
          <span className="text-muted-foreground">{t("Pick a date")}</span>
        )}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="ml-auto h-4 w-4 text-muted-foreground" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2.5" width="12" height="11.5" rx="1.5" />
          <line x1="2" y1="6" x2="14" y2="6" />
          <line x1="5.5" y1="1" x2="5.5" y2="4" />
          <line x1="10.5" y1="1" x2="10.5" y2="4" />
        </svg>
      </button>
      {showCal && (
        <div className="absolute top-full left-0 z-[100] mt-1 rounded-lg border border-border bg-popover p-1">
          <I18nProvider locale={locale}>
          <Calendar
            defaultValue={selected || todayDate}
            value={selected}
            onChange={(date) => {
              if (date) {
                const d = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
                onChange(d)
                setShowCal(false)
              }
            }}
          />
          </I18nProvider>
        </div>
      )}
    </div>
  )
}
