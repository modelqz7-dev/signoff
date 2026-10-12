"use client"

import { useMemo, useState } from "react"
import { AtSignIcon, CalendarPlusIcon, PhoneIcon, PlusIcon, SearchIcon, SendIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FIELD, type BookingPreset } from "@/components/crm/BookingDialog"
import {
  counts, createClient, deleteClient, money, statusLabel, updateClient,
  type CrmBooking, type CrmClient, type CrmData,
} from "@/lib/crm"
import type { NicheConfig } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

const LABEL = "text-[12.5px] font-medium text-muted-foreground"

/** When a booking happens: its start for appointments, its day for orders. */
function when(b: CrmBooking) {
  return b.starts_at ?? (b.due_on ? `${b.due_on}T12:00:00` : b.created_at)
}

/** The client base: who they are, how to reach them, how often they come and what they spend. */
export function ClientsView({ data, config, shopId, onNew, onOpen }: {
  data: CrmData
  config: NicheConfig
  shopId: string
  onNew: (preset?: BookingPreset) => void
  onOpen: (booking: CrmBooking) => void
}) {
  const { t, locale } = useT()
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<string | "new" | null>(null)

  const stats = useMemo(() => {
    const map = new Map<string, { visits: number; spent: number; last: string | null; bookings: CrmBooking[] }>()
    for (const b of data.bookings) {
      if (!b.client_id) continue
      const s = map.get(b.client_id) ?? { visits: 0, spent: 0, last: null, bookings: [] }
      s.bookings.push(b)
      if (counts(b)) {
        s.visits++
        if (b.status === "done" || b.status === "delivered") s.spent += b.price ?? 0
        if (!s.last || when(b) > s.last) s.last = when(b)
      }
      map.set(b.client_id, s)
    }
    return map
  }, [data.bookings])

  const q = query.trim().toLowerCase()
  const shown = data.clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.telegram.toLowerCase().includes(q) || c.instagram.toLowerCase().includes(q))
  const open = openId && openId !== "new" ? data.clients.find((c) => c.id === openId) ?? null : null
  const visitWord = config.kind === "order" ? t("Orders") : t("Visits")

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold tracking-tight">{t("Clients")}</h1>
          <p className="text-[13.5px] text-muted-foreground">{t("{n} in the base", { n: data.clients.length })}</p>
        </div>
        <Button onPress={() => setOpenId("new")} className="h-9 gap-1.5 rounded-full px-4"><PlusIcon className="size-4" />{t("New client")}</Button>
      </div>

      <label className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by name, phone or @")} className={cn(FIELD, "pl-9")} />
      </label>

      {shown.length ? (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          <div className="hidden grid-cols-[1.4fr_1fr_80px_110px_110px] gap-3 border-b border-border px-4 py-2 text-[12px] font-medium text-muted-foreground sm:grid">
            <span>{t("Full name")}</span><span>{t("Phone")}</span><span className="text-right">{visitWord}</span><span className="text-right">{t("Spent")}</span><span className="text-right">{t("Last time")}</span>
          </div>
          {shown.map((c) => {
            const s = stats.get(c.id)
            return (
              <button key={c.id} type="button" onClick={() => setOpenId(c.id)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-border px-4 py-3 text-left text-[13.5px] last:border-0 hover:bg-hover sm:grid-cols-[1.4fr_1fr_80px_110px_110px]">
                <span className="truncate font-medium">{c.name}</span>
                <span className="truncate text-muted-foreground sm:text-foreground">{c.phone || (c.telegram && `@${c.telegram}`) || "—"}</span>
                <span className="text-[12.5px] text-muted-foreground sm:text-right sm:text-[13.5px] sm:text-foreground tabular-nums">
                  <span className="sm:hidden">{visitWord}: </span>{s?.visits ?? 0}
                </span>
                <span className="text-right text-[12.5px] tabular-nums sm:text-[13.5px]">{money(s?.spent ?? 0, locale)}</span>
                <span className="hidden text-right text-muted-foreground tabular-nums sm:block">{s?.last ? new Date(s.last).toLocaleDateString(locale, { day: "numeric", month: "short" }) : "—"}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-border">
          <p className="font-medium">{q ? t("Nobody found") : t("No clients yet")}</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{q ? t("Try another name or number.") : t("They're added when you book someone, or add one yourself.")}</p>
        </div>
      )}

      <ClientDialog
        open={!!openId}
        client={open}
        bookings={open ? (stats.get(open.id)?.bookings ?? []) : []}
        shopId={shopId}
        onClose={() => setOpenId(null)}
        onSaved={(c) => data.setClients((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c].sort((a, b) => a.name.localeCompare(b.name))))}
        onDeleted={(id) => { data.setClients((prev) => prev.filter((c) => c.id !== id)); data.setBookings((prev) => prev.map((b) => (b.client_id === id ? { ...b, client_id: null } : b))) }}
        onBook={(id) => { setOpenId(null); onNew({ clientId: id }) }}
        onOpenBooking={(b) => { setOpenId(null); onOpen(b) }}
        bookWord={config.kind === "order" ? t("New order") : t("Book")}
      />
    </div>
  )
}

function ClientDialog({ open, client, bookings, shopId, onClose, onSaved, onDeleted, onBook, onOpenBooking, bookWord }: {
  open: boolean
  client: CrmClient | null
  bookings: CrmBooking[]
  shopId: string
  onClose: () => void
  onSaved: (c: CrmClient) => void
  onDeleted: (id: string) => void
  onBook: (id: string) => void
  onOpenBooking: (b: CrmBooking) => void
  bookWord: string
}) {
  const { t, locale } = useT()
  const [form, setForm] = useState({ name: "", phone: "", telegram: "", instagram: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const key = open ? (client?.id ?? "new") : null
  if (key !== openedFor) {
    setOpenedFor(key)
    if (key) {
      setForm({ name: client?.name ?? "", phone: client?.phone ?? "", telegram: client?.telegram ?? "", instagram: client?.instagram ?? "", notes: client?.notes ?? "" })
      setConfirm(false)
      setError(null)
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const clean = (v: string) => v.trim().replace(/^@/, "").replace(/^https?:\/\/(t\.me|(www\.)?instagram\.com)\//i, "").replace(/\/$/, "")

  async function save() {
    if (!form.name.trim()) { setError(t("Enter the name")); return }
    setSaving(true)
    setError(null)
    const patch = { name: form.name.trim(), phone: form.phone.trim(), telegram: clean(form.telegram), instagram: clean(form.instagram), notes: form.notes.trim() }
    try {
      if (client) {
        await updateClient(client.id, patch)
        onSaved({ ...client, ...patch })
      } else {
        onSaved(await createClient(shopId, patch))
      }
      onClose()
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't save. Try again."))
    }
    setSaving(false)
  }

  async function remove() {
    if (!client) return
    setSaving(true)
    try { await deleteClient(client.id); onDeleted(client.id); onClose() } catch (e) { setError((e as Error).message) }
    setSaving(false)
  }

  const history = [...bookings].sort((a, b) => when(b).localeCompare(when(a)))
  const phoneDigits = form.phone.replace(/[^\d+]/g, "")

  return (
    <Dialog isOpen={open} onOpenChange={(v) => !v && !saving && onClose()} className="max-h-[92dvh] gap-5 overflow-y-auto rounded-2xl p-5 sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-[17px]">{client ? client.name : t("New client")}</DialogTitle>
        <DialogDescription>{t("Contacts and notes stay in your base only.")}</DialogDescription>
      </DialogHeader>

      {client && (
        <div className="flex flex-wrap gap-1.5">
          <Button onPress={() => onBook(client.id)} className="h-8 gap-1.5 rounded-full px-3 text-[13px]"><CalendarPlusIcon className="size-3.5" />{bookWord}</Button>
          {phoneDigits && <a href={`tel:${phoneDigits}`} className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 ring-border hover:bg-hover"><PhoneIcon className="size-3.5" />{t("Call")}</a>}
          {client.telegram && <a href={`https://t.me/${client.telegram}`} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 ring-border hover:bg-hover"><SendIcon className="size-3.5" />Telegram</a>}
          {client.instagram && <a href={`https://instagram.com/${client.instagram}`} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 ring-border hover:bg-hover"><AtSignIcon className="size-3.5" />Instagram</a>}
        </div>
      )}

      <form className="flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); save() }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Full name")}</span><input value={form.name} onChange={set("name")} maxLength={120} className={FIELD} autoFocus={!client} /></label>
          <label className="flex flex-col gap-1.5"><span className={LABEL}>{t("Phone")}</span><input value={form.phone} onChange={set("phone")} type="tel" placeholder="+380…" maxLength={40} className={FIELD} /></label>
          <label className="flex flex-col gap-1.5"><span className={LABEL}>Telegram</span><input value={form.telegram} onChange={set("telegram")} placeholder="@username" maxLength={64} className={FIELD} /></label>
          <label className="flex flex-col gap-1.5"><span className={LABEL}>Instagram</span><input value={form.instagram} onChange={set("instagram")} placeholder="@username" maxLength={64} className={FIELD} /></label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Notes")}</span>
          <textarea value={form.notes} onChange={set("notes")} rows={2} maxLength={2000} placeholder={t("Preferences, allergies, birthday…")} className={cn(FIELD, "h-auto resize-none py-2.5 leading-snug")} />
        </label>

        {client && (
          <div className="flex flex-col gap-1">
            <span className={LABEL}>{t("History")}</span>
            {history.length ? (
              <div className="flex flex-col rounded-xl ring-1 ring-border">
                {history.slice(0, 20).map((b) => (
                  <button key={b.id} type="button" onClick={() => onOpenBooking(b)} className="flex items-center gap-3 border-b border-border px-3 py-2 text-left text-[13px] last:border-0 hover:bg-hover">
                    <span className="w-20 shrink-0 text-muted-foreground tabular-nums">{new Date(when(b)).toLocaleDateString(locale, { day: "numeric", month: "short", year: "2-digit" })}</span>
                    <span className={cn("min-w-0 flex-1 truncate", !counts(b) && "text-muted-foreground line-through")}>{b.title}</span>
                    <span className="shrink-0 text-[12px] text-muted-foreground">{t(statusLabel(b.status))}</span>
                    <span className="w-16 shrink-0 text-right tabular-nums">{money(b.price, locale)}</span>
                  </button>
                ))}
              </div>
            ) : <p className="text-[13px] text-muted-foreground">{t("Nothing yet.")}</p>}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="mt-1 flex-row items-center">
          {client && (confirm ? (
            <Button type="button" variant="destructive" onPress={remove} isDisabled={saving} className="mr-auto">{t("Delete for good")}</Button>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} aria-label={t("Delete")} title={t("Delete the client (their history stays without a name)")}
              className="mr-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-destructive"><Trash2Icon className="size-4" /></button>
          ))}
          <Button type="button" variant="outline" onPress={onClose} isDisabled={saving}>{t("Cancel")}</Button>
          <Button type="submit" isDisabled={saving}>{saving ? t("Saving…") : t("Save")}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
