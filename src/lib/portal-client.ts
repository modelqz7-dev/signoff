"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Order } from "@/components/dashboard/types"
import type { NewPin, Pin } from "@/lib/pins"

/** The order as the portal sees it: private fields (password, client email…) are never sent. */
export type PortalOrder = Pick<
  Order,
  "id" | "title" | "code" | "client_name" | "value" | "deadline" | "notes" | "status" | "created_at" | "file_url"
> & Partial<Pick<Order, "version" | "approved_at" | "approved_by">>

type Phase = "loading" | "auth" | "view" | "missing"

const POLL_MS = 5000

function sortPins(pins: Pin[]) {
  return [...pins].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    credentials: "same-origin",
  })
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { res, body }
}

/**
 * Client portal state, served by /api/portal/[id]/* (the database is closed to visitors).
 * A signed cookie remembers the visitor, so the name and password are asked once per device.
 */
export function usePortal(orderId: string) {
  const base = `/api/portal/${orderId}`
  const [phase, setPhase] = useState<Phase>("loading")
  const [order, setOrder] = useState<PortalOrder | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [viewer, setViewer] = useState("")
  const [hasPassword, setHasPassword] = useState(true)
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  const load = useCallback(async () => {
    const { res, body } = await api(`${base}/state`)
    if (res.ok && body) {
      setOrder(body.order)
      setPins(sortPins(body.pins))
      setViewer(body.viewer)
      setPhase("view")
    } else if (res.status === 401) {
      setHasPassword(body?.hasPassword !== false)
      setPhase("auth")
    } else if (res.status === 404) {
      setPhase("missing")
    } else if (phaseRef.current === "loading") {
      setPhase("auth")
    }
    return res.status
  }, [base])

  // First load, then keep in sync with the workshop while the tab is visible.
  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(() => {
      if (phaseRef.current === "view" && document.visibilityState === "visible") load()
    }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === "visible" && phaseRef.current === "view") load() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  /** Returns an error code: "wrong_password", "too_many_attempts", "not_found" or "failed". */
  const enter = useCallback(async (name: string, password: string) => {
    const { res, body } = await api(`${base}/session`, { method: "POST", body: JSON.stringify({ name, password }) })
    if (!res.ok) return (body?.error as string) || "failed"
    const status = await load()
    return status === 200 ? null : "failed"
  }, [base, load])

  const leave = useCallback(async () => {
    await api(`${base}/session`, { method: "DELETE" })
    setPhase("auth")
    setOrder(null)
    setPins([])
  }, [base])

  const addPin = useCallback(async (pin: NewPin) => {
    const { res, body } = await api(`${base}/pins`, { method: "POST", body: JSON.stringify(pin) })
    if (!res.ok || !body?.pin) throw new Error(body?.error || "Couldn't save the comment")
    setPins((prev) => sortPins([...prev.filter((p) => p.id !== body.pin.id), body.pin]))
  }, [base])

  const patchPin = useCallback(async (id: string, patch: Partial<Pin>) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { res } = await api(`${base}/pins/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
    if (!res.ok) load()
  }, [base, load])

  const setResolved = useCallback((id: string, resolved: boolean) => patchPin(id, { resolved }), [patchPin])
  const movePin = useCallback((id: string, x: number, y: number) => patchPin(id, { x, y }), [patchPin])

  const deletePin = useCallback(async (id: string) => {
    const { res } = await api(`${base}/pins/${id}`, { method: "DELETE" })
    if (!res.ok) {
      load()
      throw new Error("Not allowed to delete this comment")
    }
    setPins((prev) => prev.filter((p) => p.id !== id))
  }, [base, load])

  /** Approve or ask for changes; returns false if it couldn't be saved. */
  const decide = useCallback(async (status: "approved" | "changes") => {
    const { res, body } = await api(`${base}/decision`, { method: "POST", body: JSON.stringify({ status }) })
    if (!res.ok || !body?.order) return false
    setOrder(body.order)
    return true
  }, [base])

  return { phase, order, pins, viewer, hasPassword, enter, leave, addPin, setResolved, movePin, deletePin, decide }
}
