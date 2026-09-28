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
}

export type NewPin = Pick<Pin, "x" | "y" | "page" | "title" | "description">

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
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Partial<Pin>).id
            setPins((prev) => prev.filter((p) => p.id !== id))
            return
          }
          const row = payload.new as Pin
          setPins((prev) => sortPins([...prev.filter((p) => p.id !== row.id), row]))
        }
      )
      .subscribe((status) => {
        // (Re)load once the subscription is live so nothing created in between is missed.
        if (status === "SUBSCRIBED") load()
      })
    return () => { supabase.removeChannel(channel) }
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

  return { pins, addPin, setResolved, reload: load }
}

/** Stable pin numbers (by creation order) so the client and the shop see the same "#3". */
export function usePinNumbers(pins: Pin[]) {
  return useMemo(() => new Map(pins.map((p, i) => [p.id, i + 1])), [pins])
}
