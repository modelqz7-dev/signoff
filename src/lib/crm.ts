"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { BookingKind, CrmNiche } from "@/lib/niches"
import { NICHES, nicheConfig } from "@/lib/niches"

// The CRM's data (see supabase/crm.sql): services, clients and bookings of one shop.

export type CrmService = {
  id: string
  shop_id: string
  title: string
  kind: BookingKind
  duration_min: number | null
  price: number | null
  price_from: boolean
  unit: string
  position: number
  archived: boolean
}

export type CrmClient = {
  id: string
  shop_id: string
  name: string
  phone: string
  telegram: string
  instagram: string
  notes: string
  created_at: string
}

export type AppointmentStatus = "booked" | "done" | "no_show" | "cancelled"
export type OrderStatus = "new" | "confirmed" | "in_progress" | "ready" | "delivered" | "cancelled"
export type BookingStatus = AppointmentStatus | OrderStatus

export type CrmBooking = {
  id: string
  shop_id: string
  client_id: string | null
  service_id: string | null
  kind: BookingKind
  title: string
  starts_at: string | null
  duration_min: number | null
  due_on: string | null
  due_time: string
  status: BookingStatus
  price: number | null
  prepaid: number | null
  details: Record<string, string>
  staff: string
  notes: string
  created_at: string
}

/** Statuses in the order work moves through them; names are English, shown through t(). */
export const APPOINTMENT_STATUSES: [AppointmentStatus, string][] = [
  ["booked", "Booked"], ["done", "Came"], ["no_show", "Didn't come"], ["cancelled", "Cancelled"],
]
export const ORDER_STATUSES: [OrderStatus, string][] = [
  ["new", "New order"], ["confirmed", "Confirmed"], ["in_progress", "In the making"], ["ready", "Ready"], ["delivered", "Handed over"], ["cancelled", "Cancelled"],
]
/** The order board's columns; handed-over and cancelled orders are listed below it. */
export const BOARD_STATUSES: OrderStatus[] = ["new", "confirmed", "in_progress", "ready"]
/** The columns' names: many orders, where a status names one. */
export const BOARD_TITLES: Record<string, string> = { new: "New", confirmed: "Confirmed orders", in_progress: "Making now", ready: "Ready orders" }

export function statusLabel(status: BookingStatus) {
  return [...APPOINTMENT_STATUSES, ...ORDER_STATUSES].find(([s]) => s === status)?.[1] ?? status
}

/** The next step on the order board, or null at the end. */
export function nextOrderStatus(status: BookingStatus): OrderStatus | null {
  const i = BOARD_STATUSES.indexOf(status as OrderStatus)
  if (i < 0) return null
  return i === BOARD_STATUSES.length - 1 ? "delivered" : BOARD_STATUSES[i + 1]
}

/** Bookings that still count: not cancelled and, for appointments, not missed. */
export function counts(b: CrmBooking) {
  return b.status !== "cancelled" && b.status !== "no_show"
}

export function money(value: number | null | undefined, locale: string) {
  if (value == null) return ""
  return new Intl.NumberFormat(locale, { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(value)
}

/** YYYY-MM-DD of a local date. */
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function appointmentEnd(b: CrmBooking) {
  return new Date(new Date(b.starts_at!).getTime() + (b.duration_min ?? 60) * 60_000)
}

async function fetchCrm(shopId: string) {
  const [s, c, b] = await Promise.all([
    supabase.from("crm_services").select("*").eq("shop_id", shopId).order("position", { ascending: true }),
    supabase.from("crm_clients").select("*").eq("shop_id", shopId).order("name", { ascending: true }),
    supabase.from("crm_bookings").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(5000),
  ])
  const failed = s.error || c.error || b.error
  return {
    error: failed ? failed.message : null,
    services: (s.data as CrmService[]) ?? [],
    clients: (c.data as CrmClient[]) ?? [],
    bookings: ((b.data as CrmBooking[]) ?? []).map((x) => ({ ...x, details: x.details ?? {} })),
  }
}

/** Everything the CRM screens show, loaded once and kept in step as it changes. */
export function useCrmData(shopId: string | null | undefined) {
  const [services, setServices] = useState<CrmService[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [bookings, setBookings] = useState<CrmBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchCrm>>) => {
    setError(r.error)
    setServices(r.services)
    setClients(r.clients)
    setBookings(r.bookings)
    setLoading(false)
  }, [])

  const reload = useCallback(() => (shopId ? fetchCrm(shopId).then(apply) : Promise.resolve()), [shopId, apply])

  useEffect(() => {
    if (!shopId) return
    let off = false
    fetchCrm(shopId).then((r) => { if (!off) apply(r) })
    return () => { off = true }
  }, [shopId, apply])

  return { services, setServices, clients, setClients, bookings, setBookings, loading, error, reload }
}

export type CrmData = ReturnType<typeof useCrmData>

export type BookingDraft = Omit<CrmBooking, "id" | "shop_id" | "created_at">

export async function saveBooking(shopId: string, draft: BookingDraft, id?: string) {
  const row = { ...draft, shop_id: shopId }
  const query = id
    ? supabase.from("crm_bookings").update(row).eq("id", id).select().single()
    : supabase.from("crm_bookings").insert(row).select().single()
  const { data, error } = await query
  if (error) throw error
  return { ...(data as CrmBooking), details: (data as CrmBooking).details ?? {} }
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  const { error } = await supabase.from("crm_bookings").update({ status }).eq("id", id)
  if (error) throw error
}

export async function deleteBooking(id: string) {
  const { error } = await supabase.from("crm_bookings").delete().eq("id", id)
  if (error) throw error
}

export async function createClient(shopId: string, client: Partial<CrmClient> & { name: string }) {
  const { data, error } = await supabase.from("crm_clients").insert({ ...client, shop_id: shopId }).select().single()
  if (error) throw error
  return data as CrmClient
}

export async function updateClient(id: string, patch: Partial<CrmClient>) {
  const { error } = await supabase.from("crm_clients").update(patch).eq("id", id)
  if (error) throw error
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("crm_clients").delete().eq("id", id)
  if (error) throw error
}

export async function saveService(shopId: string, service: Partial<CrmService> & { title: string }, id?: string) {
  const row = { ...service, shop_id: shopId }
  const query = id
    ? supabase.from("crm_services").update(row).eq("id", id).select().single()
    : supabase.from("crm_services").insert(row).select().single()
  const { data, error } = await query
  if (error) throw error
  return data as CrmService
}

export async function deleteService(id: string) {
  const { error } = await supabase.from("crm_services").delete().eq("id", id)
  if (error) throw error
}

/** Saves the chosen niche and, the first time, the niche's starter services in the account's language. */
export async function chooseNiche(shopId: string, niche: CrmNiche | "smm", translate: (s: string) => string) {
  const { error } = await supabase.from("shops").update({ niche }).eq("id", shopId)
  if (error) throw error
  const config = nicheConfig(niche)
  if (!config) return
  // starter services only when there are none of this niche's kind (switching nails → cakes adds the cakes)
  const { count } = await supabase.from("crm_services").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("kind", config.kind).eq("archived", false)
  if (count) return
  const rows = config.services.map((s, i) => ({
    shop_id: shopId,
    title: translate(s.title),
    kind: config.kind,
    duration_min: s.duration_min ?? null,
    price: s.price,
    price_from: !!s.price_from,
    unit: s.unit ? translate(s.unit) : "",
    position: i,
  }))
  const { error: seedError } = await supabase.from("crm_services").insert(rows)
  if (seedError) throw seedError
}

/**
 * Starts the niche over: every booking and order and every service are deleted for good, the
 * niche is cleared, and the dashboard asks what the business is again. Only the clients stay.
 */
export async function resetNiche(shopId: string) {
  const { error: bookingsError } = await supabase.from("crm_bookings").delete().eq("shop_id", shopId)
  if (bookingsError) throw bookingsError
  const { error: servicesError } = await supabase.from("crm_services").delete().eq("shop_id", shopId)
  if (servicesError) throw servicesError
  const { error } = await supabase.from("shops").update({ niche: null }).eq("id", shopId)
  if (error) throw error
}

/** Starter services created in English (before the account's language was known), renamed into it. */
export async function translateStarterTitles(services: CrmService[], translate: (s: string) => string) {
  const starters = new Set(NICHES.flatMap((n) => n.services.map((x) => x.title)))
  const fixes = services.filter((s) => starters.has(s.title) && translate(s.title) !== s.title)
  for (const s of fixes) await supabase.from("crm_services").update({ title: translate(s.title) }).eq("id", s.id)
  return fixes.length ? services.map((s) => (starters.has(s.title) ? { ...s, title: translate(s.title) } : s)) : null
}
