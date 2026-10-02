"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

export type Pin = {
  id: string
  order_id: string
  // Position on the page, in % of page width / height, so it is the same at any zoom level.
  x: number
  y: number
  page: number
  title: string
  description: string | null
  author_name: string
  resolved: boolean
  created_at: string
  /** File version the comment was left on (supabase/retention.sql); missing means 1. */
  version?: number
  // The workshop's answer when it uploads the next version (supabase/revisions.sql).
  fix_status?: FixStatus | null
  reply?: string | null
  answered_version?: number | null
}

/** fixed: done · kept: left as is on purpose · reopened: the client says it isn't done. */
export type FixStatus = "fixed" | "kept" | "reopened"

export type NewPin = Pick<Pin, "x" | "y" | "page" | "title" | "description"> & { version?: number }

/** Comments left on one version of the file. */
export function pinsOfVersion(pins: Pin[], version: number | undefined) {
  return pins.filter((p) => (p.version ?? 1) === (version ?? 1))
}

/**
 * The comments a version answers: those left on the version before it. Shown to the client as
 * "what changed in version N" and to the workshop when it uploads that version.
 */
export function pinsAnsweredBy(pins: Pin[], version: number | undefined) {
  const v = version ?? 1
  return v > 1 ? pins.filter((p) => (p.version ?? 1) === v - 1) : []
}

function sortPins(pins: Pin[]) {
  return [...pins].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/**
 * Pins of one order, kept in sync in real time: changes made by the client in the portal
 * and by the shop on the order page show up for everyone without a reload.
 * Pass null to stay idle (e.g. before the portal password is entered).
 */
export function usePins(orderId: string | null) {
  const [pins, setPins] = useState<Pin[]>([])

  const load = useCallback(async () => {
    if (!orderId) return
    const { data, error } = await supabase
      .from("order_pins").select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
    if (error) console.error("Pins load error:", error)
    else setPins(sortPins(data as Pin[]))
  }, [orderId])

  useEffect(() => {
    if (!orderId) return
    const channel = supabase
      .channel(`pins-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_pins", filter: `order_id=eq.${orderId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return
          const row = payload.new as Pin
          setPins((prev) => sortPins([...prev.filter((p) => p.id !== row.id), row]))
        }
      )
      // Postgres can't filter DELETE events by column, so listen to all deletes on the table;
      // they carry only the row id, and ids we don't have are ignored.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "order_pins" },
        (payload) => {
          const id = (payload.old as Partial<Pin>).id
          if (id) setPins((prev) => prev.filter((p) => p.id !== id))
        }
      )
      .subscribe((status) => {
        // Reload once the subscription is live so nothing created in between is missed.
        if (status === "SUBSCRIBED") load()
      })
    // Load right away too, so pins show even if realtime is unavailable.
    let cancelled = false
    supabase
      .from("order_pins").select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Pins load error:", error)
        else if (!cancelled) setPins(sortPins(data as Pin[]))
      })
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [orderId, load])

  const addPin = useCallback(async (pin: NewPin, authorName: string) => {
    if (!orderId) return
    const { data, error } = await supabase
      .from("order_pins")
      .insert({ ...pin, order_id: orderId, author_name: authorName })
      .select()
      .single()
    if (error) throw error
    const row = data as Pin
    setPins((prev) => sortPins([...prev.filter((p) => p.id !== row.id), row]))
  }, [orderId])

  const setResolved = useCallback(async (id: string, resolved: boolean) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, resolved } : p)))
    const { error } = await supabase.from("order_pins").update({ resolved }).eq("id", id)
    if (error) {
      console.error("Pin update error:", error)
      load()
    }
  }, [load])

  const movePin = useCallback(async (id: string, x: number, y: number) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)))
    const { error } = await supabase.from("order_pins").update({ x, y }).eq("id", id)
    if (error) {
      console.error("Pin move error:", error)
      load()
    }
  }, [load])

  const deletePin = useCallback(async (id: string) => {
    const { data, error } = await supabase.from("order_pins").delete().eq("id", id).select("id")
    // With RLS, a forbidden delete returns no error but also no rows.
    if (error || !data?.length) {
      load()
      throw error ?? new Error("Not allowed to delete this comment")
    }
    setPins((prev) => prev.filter((p) => p.id !== id))
  }, [load])

  return { pins, addPin, setResolved, movePin, deletePin, reload: load }
}

/**
 * Comments across many orders (the dashboard), newest first, kept live via realtime.
 * Realtime `in` filters accept up to 100 values, so only the 100 most recent orders are tracked.
 */
export function useShopPins(orderIds: string[]) {
  const [pins, setPins] = useState<Pin[]>([])
  const ids = orderIds.slice(0, 100)
  const key = ids.join(",")

  useEffect(() => {
    if (!key) return
    const list = key.split(",")
    const newestFirst = (rows: Pin[]) => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.from("order_pins").select("*").in("order_id", list)
      if (error) console.error("Pins load error:", error)
      else if (!cancelled) setPins(newestFirst(data as Pin[]))
    }

    const channel = supabase
      .channel(`shop-pins-${list.length}-${list[0]}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_pins", filter: `order_id=in.(${key})` },
        (payload) => {
          if (payload.eventType === "DELETE") return
          const row = payload.new as Pin
          setPins((prev) => newestFirst([...prev.filter((p) => p.id !== row.id), row]))
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "order_pins" }, (payload) => {
        const id = (payload.old as Partial<Pin>).id
        if (id) setPins((prev) => prev.filter((p) => p.id !== id))
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") load() })
    load()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [key])

  return key ? pins : []
}

/** Stable pin numbers (by creation order) so the client and the shop see the same "#3". */
export function usePinNumbers(pins: Pin[]) {
  return useMemo(() => new Map(pins.map((p, i) => [p.id, i + 1])), [pins])
}
