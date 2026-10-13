"use client"

import { useState } from "react"
import { ChevronDownIcon, ClockIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FIELD, durationLabel } from "@/components/crm/BookingDialog"
import { deleteService, money, saveService, type CrmData, type CrmService } from "@/lib/crm"
import type { NicheConfig } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import { Picker, Toggle } from "@/components/crm/Pickers"

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240]
const LABEL = "text-[12.5px] font-medium text-muted-foreground"

/** What the business offers: cards with the time and the price, shown or hidden on the booking page. */
export function ServicesView({ data, config, shopId }: { data: CrmData; config: NicheConfig; shopId: string }) {
  const { t } = useT()
  const isOrder = config.kind === "order"
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CrmService | "new" | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const mine = data.services.filter((s) => s.kind === config.kind)
  const shown = mine.filter((s) => !s.archived)
  const hidden = mine.filter((s) => s.archived)

  async function setVisible(s: CrmService, visible: boolean) {
    data.setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, archived: !visible } : x)))
    setError(null)
    try { await saveService(shopId, { title: s.title, archived: !visible }, s.id) } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[34px]">{isOrder ? t("Products") : t("Services")}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{isOrder ? t("What clients can order on your link.") : t("What clients can book on your link.")}</p>
        </div>
        <Button onPress={() => setEditing("new")} className="h-10 gap-1.5 rounded-full px-5 text-[14px]"><PlusIcon className="size-4" />{isOrder ? t("Add a product") : t("Add a service")}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {shown.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((s) => <ServiceCard key={s.id} service={s} isOrder={isOrder} onEdit={() => setEditing(s)} onVisible={(v) => setVisible(s, v)} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[22px] apple-card px-6 py-12 text-center">
          <p className="font-medium">{isOrder ? t("No products yet") : t("No services yet")}</p>
          <p className="max-w-sm text-[13.5px] text-muted-foreground">{t("Add the first one: clients will see it on your booking page.")}</p>
          <Button onPress={() => setEditing("new")} className="h-10 gap-1.5 rounded-full px-5 text-[14px]"><PlusIcon className="size-4" />{isOrder ? t("Add a product") : t("Add a service")}</Button>
        </div>
      )}

      {hidden.length > 0 && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setShowHidden(!showHidden)} className="flex items-center gap-1.5 self-start text-[13px] font-medium text-muted-foreground hover:text-foreground">
            {t("Hidden from booking")} · {hidden.length}
            <ChevronDownIcon className={cn("size-4 transition-transform", showHidden && "rotate-180")} />
          </button>
          {showHidden && (
            <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {hidden.map((s) => <ServiceCard key={s.id} service={s} isOrder={isOrder} onEdit={() => setEditing(s)} onVisible={(v) => setVisible(s, v)} />)}
            </div>
          )}
        </div>
      )}

      <ServiceDialog
        open={!!editing}
        service={editing === "new" ? null : editing}
        isOrder={isOrder}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          const current = editing === "new" ? null : editing
          const saved = await saveService(shopId, current ? patch : {
            ...patch, kind: config.kind, position: Math.max(-1, ...data.services.map((s) => s.position)) + 1,
          }, current?.id)
          data.setServices((prev) => (current ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved]))
        }}
        onDelete={async () => {
          const current = editing === "new" ? null : editing
          if (!current) return
          await deleteService(current.id)
          data.setServices((prev) => prev.filter((x) => x.id !== current.id))
        }}
      />
    </div>
  )
}

function ServiceCard({ service: s, isOrder, onEdit, onVisible }: { service: CrmService; isOrder: boolean; onEdit: () => void; onVisible: (v: boolean) => void }) {
  const { t, locale } = useT()
  return (
    <article className={cn("group flex flex-col gap-4 rounded-[22px] apple-card p-5 transition-all duration-300 hover:-translate-y-0.5", s.archived && "opacity-60")}>
      <button type="button" onClick={onEdit} className="flex items-start gap-3 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-[17px] font-semibold uppercase" aria-hidden>{s.title.trim().charAt(0) || "·"}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] leading-snug font-semibold">{s.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            {!isOrder && s.duration_min && <span className="flex items-center gap-1"><ClockIcon className="size-3.5" />{durationLabel(s.duration_min, t)}</span>}
            {s.price != null
              ? <span className="font-medium text-foreground tabular-nums">{s.price_from ? `${t("from")} ` : ""}{money(s.price, locale)}{s.unit ? ` / ${s.unit}` : ""}</span>
              : <span>{t("Price on request")}</span>}
          </span>
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <Toggle checked={!s.archived} onChange={onVisible} className="text-[12.5px] text-muted-foreground">{t("On the booking page")}</Toggle>
        <button type="button" onClick={onEdit} className="rounded-lg px-2 py-1 text-[12.5px] font-medium text-muted-foreground hover:bg-hover hover:text-foreground">{t("Edit")}</button>
      </div>
    </article>
  )
}

function ServiceDialog({ open, service, isOrder, onClose, onSave, onDelete }: {
  open: boolean
  service: CrmService | null
  isOrder: boolean
  onClose: () => void
  onSave: (patch: Partial<CrmService> & { title: string }) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const { t } = useT()
  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState(60)
  const [price, setPrice] = useState("")
  const [from, setFrom] = useState(false)
  const [unit, setUnit] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const key = open ? (service?.id ?? "new") : null
  if (key !== openedFor) {
    setOpenedFor(key)
    if (key) {
      setTitle(service?.title ?? "")
      setDuration(service?.duration_min ?? 60)
      setPrice(service?.price != null ? String(service.price) : "")
      setFrom(service?.price_from ?? false)
      setUnit(service?.unit ?? "")
      setConfirm(false)
      setError(null)
    }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try { await action(); onClose() } catch (e) { setError((e as Error)?.message || t("Couldn't save. Try again.")) }
    setBusy(false)
  }

  return (
    <Dialog isOpen={open} onOpenChange={(v) => !v && !busy && onClose()} className="gap-5 rounded-[24px] p-6 sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-[20px] tracking-[-0.01em]">{service ? (isOrder ? t("Product") : t("Service")) : (isOrder ? t("New product") : t("New service"))}</DialogTitle>
        <DialogDescription>{isOrder ? t("Clients see the name and the price when they order.") : t("Clients see the name, the time and the price when they book.")}</DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) { setError(t("Enter the name")); return }
        const value = price.trim() === "" ? null : Math.max(0, Number(price.replace(",", ".")) || 0)
        run(() => onSave({ title: title.trim(), price: value, ...(isOrder ? { price_from: from, unit: unit.trim().slice(0, 20) } : { duration_min: duration }) }))
      }}>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Name")}</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={isOrder ? t("e.g. Bento cake") : t("e.g. Manicure")} className={FIELD} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {!isOrder && (
            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>{t("Takes")}</span>
              <Picker value={duration} onChange={setDuration} label={t("Takes")}
                options={[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => ({ value: d, label: durationLabel(d, t) }))} />
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{t("Price, ₴")}</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder={t("on request")} className={FIELD} />
          </label>
          {isOrder && (
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>{t("Per")} <span className="font-normal">· {t("optional")}</span></span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder={t("kg")} className={FIELD} />
            </label>
          )}
        </div>
        {isOrder && <Toggle checked={from} onChange={setFrom} className="text-muted-foreground">{t("The price is a starting point (“from”)")}</Toggle>}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="mt-1 flex-row items-center">
          {service && (confirm ? (
            <Button type="button" variant="destructive" onPress={() => run(onDelete)} isDisabled={busy} className="mr-auto">{t("Delete for good")}</Button>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} aria-label={t("Delete")} title={t("Delete")}
              className="mr-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-destructive"><Trash2Icon className="size-4" /></button>
          ))}
          <Button type="button" variant="outline" onPress={onClose} isDisabled={busy}>{t("Cancel")}</Button>
          <Button type="submit" isDisabled={busy}>{busy ? t("Saving…") : t("Save")}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
