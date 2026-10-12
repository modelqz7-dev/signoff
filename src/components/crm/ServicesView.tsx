"use client"

import { useState } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FIELD, durationLabel } from "@/components/crm/BookingDialog"
import { deleteService, saveService, type CrmData, type CrmService } from "@/lib/crm"
import type { NicheConfig } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240]

/** What the business offers, with how long it takes and what it costs. Saved as you type. */
export function ServicesView({ data, config, shopId }: { data: CrmData; config: NicheConfig; shopId: string }) {
  const { t } = useT()
  const isOrder = config.kind === "order"
  const [error, setError] = useState<string | null>(null)
  const list = data.services.filter((s) => !s.archived && s.kind === config.kind)

  async function change(s: CrmService, patch: Partial<CrmService>) {
    const next = { ...s, ...patch }
    data.setServices((prev) => prev.map((x) => (x.id === s.id ? next : x)))
    setError(null)
    try { await saveService(shopId, { title: next.title, ...patch }, s.id) } catch (e) { setError((e as Error).message) }
  }

  async function add() {
    setError(null)
    try {
      const created = await saveService(shopId, {
        title: isOrder ? t("New product") : t("New service"),
        kind: config.kind,
        duration_min: isOrder ? null : 60,
        price: null,
        position: Math.max(-1, ...data.services.map((s) => s.position)) + 1,
      })
      data.setServices((prev) => [...prev, created])
    } catch (e) { setError((e as Error).message) }
  }

  async function remove(s: CrmService) {
    data.setServices((prev) => prev.filter((x) => x.id !== s.id))
    try { await deleteService(s.id) } catch (e) { setError((e as Error).message); data.setServices((prev) => [...prev, s]) }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold tracking-tight">{isOrder ? t("Products") : t("Services")}</h1>
          <p className="text-[13.5px] text-muted-foreground">{isOrder ? t("What you make to order. Shown first when you add an order.") : t("What you do, how long it takes and the price. Shown first when you book someone.")}</p>
        </div>
        <Button onPress={add} className="h-9 gap-1.5 rounded-full px-4"><PlusIcon className="size-4" />{isOrder ? t("Add a product") : t("Add a service")}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        {list.map((s) => (
          <div key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl bg-card p-2.5 ring-1 ring-border sm:grid-cols-[1fr_150px_150px_auto]">
            <TextCell value={s.title} onSave={(title) => title.trim() && change(s, { title: title.trim() })} label={t("Name")} className="col-span-2 sm:col-span-1" />
            {isOrder ? (
              <label className="flex h-10 items-center gap-2 rounded-lg bg-foreground/[0.06] px-3 text-[13px] text-muted-foreground">
                <input type="checkbox" checked={s.price_from} onChange={(e) => change(s, { price_from: e.target.checked })} className="accent-foreground" />
                {t("price “from”")}
              </label>
            ) : (
              <select aria-label={t("Takes")} value={s.duration_min ?? 60} onChange={(e) => change(s, { duration_min: Number(e.target.value) })} className={FIELD}>
                {[...new Set([...DURATIONS, s.duration_min ?? 60])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{durationLabel(d, t)}</option>)}
              </select>
            )}
            <div className="flex items-center gap-1.5">
              <TextCell value={s.price != null ? String(s.price) : ""} inputMode="decimal" placeholder={t("Price, ₴")} label={t("Price, ₴")}
                onSave={(v) => change(s, { price: v.trim() === "" ? null : Math.max(0, Number(v.replace(",", ".")) || 0) })} />
              {isOrder && <TextCell value={s.unit} placeholder={t("per…")} label={t("Unit")} className="w-20" onSave={(unit) => change(s, { unit: unit.trim().slice(0, 20) })} />}
            </div>
            <button type="button" onClick={() => remove(s)} aria-label={t("Delete")} title={t("Delete")}
              className="flex size-9 items-center justify-center justify-self-end rounded-lg text-muted-foreground hover:bg-hover hover:text-destructive"><Trash2Icon className="size-4" /></button>
          </div>
        ))}
        {!list.length && (
          <div className="rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-border">
            <p className="font-medium">{isOrder ? t("No products yet") : t("No services yet")}</p>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{t("Add the first one: it'll be offered when you book.")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** An input that saves when you leave it or press Enter. */
function TextCell({ value, onSave, label, placeholder, inputMode, className }: {
  value: string
  onSave: (v: string) => void
  label: string
  placeholder?: string
  inputMode?: "decimal"
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => { if (draft !== null && draft !== value) onSave(draft); setDraft(null) }
  return (
    <input value={draft ?? value} onChange={(e) => setDraft(e.target.value)} onBlur={commit} aria-label={label} placeholder={placeholder} inputMode={inputMode}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDraft(null); e.currentTarget.blur() } }}
      className={cn(FIELD, "font-medium", className)} />
  )
}
