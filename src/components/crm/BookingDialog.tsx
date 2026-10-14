"use client"

import { useMemo, useState } from "react"
import { FileTextIcon, ReceiptTextIcon, Trash2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  APPOINTMENT_STATUSES, ORDER_STATUSES, appointmentEnd, counts, createClient, dayKey, deleteBooking, saveBooking, updateClient,
  type BookingDraft, type BookingStatus, type CrmBooking, type CrmClient, type CrmService,
} from "@/lib/crm"
import type { NicheConfig } from "@/lib/niches"
import { cn } from "@/lib/utils"
import { DatePicker, Picker, TimePicker } from "@/components/crm/Pickers"
import { useT } from "@/lib/i18n"
import { useFileUrl } from "@/lib/files"

/** Where a new booking starts: a time slot, a day, a client. */
export type BookingPreset = { startsAt?: Date; dueOn?: string; clientId?: string }

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240]
export const FIELD = "h-11 w-full rounded-xl bg-foreground/[0.05] px-3 text-[14px] text-foreground outline-none ring-1 ring-transparent placeholder:text-muted-foreground focus:ring-foreground/25"
const LABEL = "text-[12.5px] font-medium text-muted-foreground"

/** Only what makes a number: digits and one decimal mark (so a weight can't read "asdasd kg"). */
function numeric(v: string) {
  const s = v.replace(/[^\d.,]/g, "").replace(/,/g, ".")
  const i = s.indexOf(".")
  return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "")
}

function timeOf(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function durationLabel(min: number, t: ReturnType<typeof useT>["t"]) {
  const h = Math.floor(min / 60), m = min % 60
  if (!h) return t("{m} min", { m })
  return m ? t("{h} h {m} min", { h, m }) : t("{h} h", { h })
}

/** Make or change an appointment (a time) or an order (a date with the niche's order form). */
export function BookingDialog({ open, booking, preset, config, shopId, services, clients, bookings, onClose, onSaved, onDeleted, onClientAdded }: {
  open: boolean
  booking?: CrmBooking | null
  preset?: BookingPreset
  config: NicheConfig
  shopId: string
  services: CrmService[]
  clients: CrmClient[]
  bookings: CrmBooking[]
  onClose: () => void
  onSaved: (booking: CrmBooking) => void
  onDeleted: (id: string) => void
  onClientAdded: (client: CrmClient) => void
}) {
  const { t, locale } = useT()
  const isOrder = config.kind === "order"
  const offered = services.filter((s) => !s.archived && s.kind === config.kind)

  const [clientId, setClientId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [suggest, setSuggest] = useState(false)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState(60)
  const [staff, setStaff] = useState("")
  const [price, setPrice] = useState("")
  const [prepaid, setPrepaid] = useState("")
  const [details, setDetails] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<BookingStatus>(isOrder ? "new" : "booked")
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // fill in each time the dialog opens
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const key = open ? (booking?.id ?? `new-${preset?.startsAt?.getTime() ?? ""}-${preset?.dueOn ?? ""}-${preset?.clientId ?? ""}`) : null
  if (key !== openedFor) {
    setOpenedFor(key)
    if (key) {
      const client = clients.find((c) => c.id === (booking?.client_id ?? preset?.clientId))
      const start = booking?.starts_at ? new Date(booking.starts_at) : preset?.startsAt
      setClientId(client?.id ?? null)
      setName(client?.name ?? "")
      setPhone(client?.phone ?? "")
      setSuggest(false)
      setServiceId(booking ? booking.service_id : null)
      setTitle(booking?.title ?? "")
      setDate(isOrder ? (booking?.due_on ?? preset?.dueOn ?? "") : start ? dayKey(start) : dayKey(new Date()))
      setTime(isOrder ? (booking?.due_time ?? "") : start ? timeOf(start) : "10:00")
      setDuration(booking?.duration_min ?? 60)
      setStaff(booking?.staff ?? "")
      setPrice(booking?.price != null ? String(booking.price) : "")
      setPrepaid(booking?.prepaid != null ? String(booking.prepaid) : "")
      setDetails(booking?.details ?? {})
      setNotes(booking?.notes ?? "")
      setStatus(booking?.status ?? (isOrder ? "new" : "booked"))
      setConfirmDelete(false)
      setError(null)
    }
  }

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase()
    if (!q || clientId) return []
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "—")).slice(0, 5)
  }, [name, clients, clientId])

  const staffNames = useMemo(() => [...new Set(bookings.map((b) => b.staff).filter(Boolean))], [bookings])

  function pickService(s: CrmService) {
    setServiceId(s.id)
    setTitle(s.title)
    if (s.duration_min) setDuration(s.duration_min)
    if (s.price != null && !s.price_from) setPrice(String(s.price))
  }

  // another appointment of the same person at an overlapping time
  const clash = useMemo(() => {
    if (isOrder || !date || !time) return null
    const start = new Date(`${date}T${time}`)
    const end = new Date(start.getTime() + duration * 60_000)
    return bookings.find((b) => b.kind === "appointment" && b.id !== booking?.id && counts(b) && b.starts_at
      && (b.staff || "") === (staff.trim() || "")
      && new Date(b.starts_at) < end && appointmentEnd(b) > start) ?? null
  }, [isOrder, date, time, duration, staff, bookings, booking?.id])

  async function save() {
    if (!title.trim()) { setError(isOrder ? t("Pick what is ordered") : t("Pick a service")); return }
    if (!date || (!isOrder && !time)) { setError(isOrder ? t("Pick the day it's needed") : t("Pick the day and time")); return }
    setSaving(true)
    setError(null)
    try {
      let id = clientId
      if (!id && name.trim()) {
        const client = await createClient(shopId, { name: name.trim(), phone: phone.trim() })
        onClientAdded(client)
        id = client.id
      } else if (id) {
        const client = clients.find((c) => c.id === id)
        if (client && phone.trim() !== client.phone) {
          await updateClient(id, { phone: phone.trim() })
          onClientAdded({ ...client, phone: phone.trim() })
        }
      }
      const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v.replace(",", ".")) || 0))
      const draft: BookingDraft = {
        client_id: id,
        service_id: serviceId,
        kind: config.kind,
        title: title.trim(),
        starts_at: isOrder ? null : new Date(`${date}T${time}`).toISOString(),
        duration_min: isOrder ? null : duration,
        due_on: isOrder ? date : null,
        due_time: isOrder ? time : "",
        status,
        price: num(price),
        prepaid: isOrder ? num(prepaid) : null,
        // the order's fields, and what the client left when booking (how to reach them, photos)
        details: Object.fromEntries(Object.entries(details).filter(([, v]) => v.trim())),
        staff: staff.trim(),
        notes: notes.trim(),
      }
      onSaved(await saveBooking(shopId, draft, booking?.id))
      onClose()
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't save. Try again."))
    }
    setSaving(false)
  }

  async function remove() {
    if (!booking) return
    setSaving(true)
    try {
      await deleteBooking(booking.id)
      onDeleted(booking.id)
      onClose()
    } catch (e) {
      setError((e as Error)?.message || t("Couldn't delete. Try again."))
    }
    setSaving(false)
  }

  const statuses = isOrder ? ORDER_STATUSES : APPOINTMENT_STATUSES
  const heading = booking ? (isOrder ? t("Order") : t("Appointment")) : (isOrder ? t("New order") : t("New appointment"))

  return (
    <Dialog isOpen={open} onOpenChange={(v) => !v && !saving && onClose()} className="max-h-[92dvh] gap-5 overflow-y-auto rounded-[24px] p-6 sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-[20px] tracking-[-0.01em]">{heading}</DialogTitle>
        <DialogDescription>{isOrder ? t("Who orders, what and for when.") : t("Who comes, for what and when.")}</DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        {/* client */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* not a label: it would pass clicks on the suggestions to the "×" button */}
          <div className="relative flex flex-col gap-1.5">
            <span className={LABEL}>{t("Client")}</span>
            {clientId ? (
              <span className={cn(FIELD, "flex items-center justify-between gap-2")}>
                <span className="truncate font-medium">{name}</span>
                <button type="button" aria-label={t("Another client")} onClick={() => { setClientId(null); setName(""); setPhone("") }}
                  className="-mr-1.5 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"><XIcon className="size-3.5" /></button>
              </span>
            ) : (
              <input value={name} onChange={(e) => { setName(e.target.value); setSuggest(true) }} onFocus={() => setSuggest(true)} onBlur={() => window.setTimeout(() => setSuggest(false), 150)}
                placeholder={t("Client's name")} aria-label={t("Client")} maxLength={120} className={FIELD} autoComplete="off" />
            )}
            {suggest && matches.length > 0 && (
              <div className="absolute top-full right-0 left-0 z-10 mt-1 flex flex-col rounded-xl bg-popover p-1 shadow-lg ring-1 ring-border">
                {matches.map((c) => (
                  <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setClientId(c.id); setName(c.name); setPhone(c.phone); setSuggest(false) }}
                    className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-hover">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="shrink-0 text-[12px] text-muted-foreground">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{t("Phone")}</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+380…" maxLength={40} className={FIELD} />
          </label>
        </div>

        {/* what */}
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>{isOrder ? t("What is ordered") : t("Service")}</span>
          {offered.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {offered.map((s) => (
                <button key={s.id} type="button" onClick={() => pickService(s)}
                  className={cn("rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition-colors",
                    serviceId === s.id ? "bg-foreground text-background ring-foreground" : "ring-border hover:bg-hover")}>
                  {s.title}
                </button>
              ))}
            </div>
          )}
          <input value={title} onChange={(e) => { setTitle(e.target.value); setServiceId(null) }} placeholder={offered.length ? t("…or type it") : t("e.g. Manicure")} maxLength={160} className={FIELD} />
        </div>

        {/* when */}
        <div className={cn("grid gap-3", isOrder ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>{isOrder ? t("Needed on") : t("Day")}</span>
            <DatePicker value={date} onChange={setDate} label={isOrder ? t("Needed on") : t("Day")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>{isOrder ? t("By what time") : t("Time")}</span>
            <TimePicker value={time} onChange={setTime} label={isOrder ? t("By what time") : t("Time")} clearable={isOrder} placeholder={isOrder ? t("any time") : undefined} />
          </div>
          {!isOrder && (
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <span className={LABEL}>{t("Takes")}</span>
              <Picker value={duration} onChange={setDuration} label={t("Takes")}
                options={[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => ({ value: d, label: durationLabel(d, t) }))} />
            </div>
          )}
        </div>
        {clash && (
          <p className="-mt-2 text-[12.5px] text-muted-foreground">
            ⚠︎ {t("Overlaps with {title} at {time}", { title: clash.title, time: new Date(clash.starts_at!).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) })}
          </p>
        )}

        {/* the order's form */}
        {isOrder && config.orderFields && (
          <div className="grid gap-3 sm:grid-cols-2">
            {config.orderFields.filter((f) => !f.when || details[f.when.key] === f.when.value).map((f) => (
              <label key={f.key} className={cn("flex flex-col gap-1.5", (f.type === "text" && f.key !== "filling") && "sm:col-span-2")}>
                <span className={LABEL}>{t(f.label)}</span>
                {f.type === "choice" ? (
                  <div role="radiogroup" aria-label={t(f.label)} className="grid h-10 grid-cols-2 gap-0.5 rounded-lg bg-foreground/[0.06] p-0.5">
                    {f.options!.map((o) => (
                      <button key={o} type="button" role="radio" aria-checked={details[f.key] === o} onClick={() => setDetails((d) => ({ ...d, [f.key]: d[f.key] === o ? "" : o }))}
                        className={cn("rounded-md px-1 text-[13px] font-medium transition-colors",
                          details[f.key] === o ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:bg-[#636366]" : "text-muted-foreground hover:text-foreground")}>
                        {t(o)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input value={details[f.key] ?? ""} onChange={(e) => { const v = f.type === "number" ? numeric(e.target.value) : e.target.value; setDetails((d) => ({ ...d, [f.key]: v })) }}
                    inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.placeholder ? t(f.placeholder) : ""} maxLength={300} className={FIELD} />
                )}
              </label>
            ))}
          </div>
        )}

        {/* money and who */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>{t("Price, ₴")}</span>
            <input value={price} onChange={(e) => setPrice(numeric(e.target.value))} inputMode="decimal" placeholder="0" className={FIELD} />
          </label>
          {isOrder ? (
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>{t("Prepaid, ₴")}</span>
              <input value={prepaid} onChange={(e) => setPrepaid(numeric(e.target.value))} inputMode="decimal" placeholder="0" className={FIELD} />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>{t(config.staffWord)} <span className="font-normal">· {t("optional")}</span></span>
              <input value={staff} onChange={(e) => setStaff(e.target.value)} maxLength={80} className={FIELD} />
            </label>
          )}
        </div>

        {!isOrder && staffNames.length > 0 && (
          <div className="-mt-2 flex flex-wrap justify-end gap-1.5">
            {staffNames.map((s) => (
              <button key={s} type="button" onClick={() => setStaff(staff === s ? "" : s)}
                className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 transition-colors", staff === s ? "bg-foreground text-background ring-foreground" : "ring-border hover:bg-hover")}>{s}</button>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Notes")}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder={t("Anything to remember")}
            className={cn(FIELD, "h-auto resize-none py-2.5 leading-snug")} />
        </label>

        {booking && (
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>{t("Status")}</span>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map(([s, label]) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn("rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition-colors",
                    status === s ? "bg-foreground text-background ring-foreground" : "ring-border hover:bg-hover")}>
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* what the client left on the booking page */}
        {booking && (booking.details.contact || booking.details.photos) && (
          <div className="flex flex-col gap-2 rounded-2xl bg-foreground/[0.04] p-3">
            {booking.details.contact && (
              <p className="text-[13.5px]"><span className="text-muted-foreground">{t("Reach by")}: </span>
                <span className="font-medium">{booking.details.contact === "telegram" ? "Telegram" : booking.details.contact === "viber" ? "Viber" : t("Phone call")}</span>
                {booking.details.telegram && <> · <a href={`https://t.me/${booking.details.telegram.replace(/^@/, "")}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">{booking.details.telegram}</a></>}
              </p>
            )}
            {booking.details.photos && (
              <div className="flex flex-col gap-1.5">
                <span className={LABEL}>{t("Client's photos")}</span>
                <div className="flex flex-wrap gap-2">{booking.details.photos.split("\n").filter(Boolean).map((u) => <ClientPhoto key={u} url={u} />)}</div>
              </div>
            )}
          </div>
        )}

        {booking && (
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>{t("Documents")}</span>
            <div className="flex flex-wrap gap-1.5">
              <a href={`/receipt/${booking.id}?doc=invoice`} target="_blank" rel="noopener"
                className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 ring-border hover:bg-hover"><FileTextIcon className="size-4" />{t("Invoice")}</a>
              <a href={`/receipt/${booking.id}?doc=receipt`} target="_blank" rel="noopener"
                className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 ring-border hover:bg-hover"><ReceiptTextIcon className="size-4" />{t("Receipt")}</a>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="mt-1 flex-row items-center">
          {booking && (confirmDelete ? (
            <Button type="button" variant="destructive" onPress={remove} isDisabled={saving} className="mr-auto">{t("Delete for good")}</Button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label={t("Delete")} title={t("Delete")}
              className="mr-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover hover:text-destructive"><Trash2Icon className="size-4" /></button>
          ))}
          <Button type="button" variant="outline" onPress={onClose} isDisabled={saving}>{t("Cancel")}</Button>
          <Button type="submit" isDisabled={saving}>{saving ? t("Saving…") : t("Save")}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

/** A photo the client attached when booking: stored privately, shown through a short-lived link. */
function ClientPhoto({ url }: { url: string }) {
  const src = useFileUrl(url)
  return (
    <a href={src ?? undefined} target="_blank" rel="noopener" className="block size-20 overflow-hidden rounded-xl bg-foreground/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="size-full object-cover" />}
    </a>
  )
}
