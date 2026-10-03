"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Order } from "@/components/dashboard/types"
import type { NewPin, Pin, PinMessage } from "@/lib/pins"
import { fileKey } from "@/lib/storage-path"

/** The order as the portal sees it: private fields (password, client email…) are never sent. */
export type PortalOrder = Pick<
  Order,
  "id" | "title" | "code" | "client_name" | "value" | "deadline" | "notes" | "status" | "created_at" | "file_url"
> & Partial<Pick<Order, "version" | "approved_at" | "approved_by">>

type Phase = "loading" | "auth" | "view" | "missing"

const POLL_MS = 5000

/**
 * Every refresh brings a freshly signed file link. Keep the one already loaded while it points
 * to the same file, so the PDF isn't downloaded again and an open viewer doesn't close.
 */
function keepFileLink(prev: PortalOrder | null, next: PortalOrder): PortalOrder {
  if (prev?.file_url && next.file_url && fileKey(prev.file_url) === fileKey(next.file_url)) {
    return { ...next, file_url: prev.file_url }
  }
  return next
}

function sortPins(pins: Pin[]) {
  return [...pins].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/** What to tell the visitor when the server refuses because of a limit (an i18n key). */
function limitMessage(error: unknown) {
  if (error === "too_many_pins") return "This version already has the maximum number of pins."
  if (error === "slow_down") return "Too many in a row. Wait a minute and try again."
  return null
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
  const [messages, setMessages] = useState<PinMessage[]>([])
  const [viewer, setViewer] = useState("")
  const [hasPassword, setHasPassword] = useState(true)
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])
  // Comment changes show up at once and are saved in the background. A refresh that started
  // before a change was saved would bring the old comments back (a moved pin jumping back),
  // so pins from a refresh are only taken when no change happened while it was on its way.
  const editsRef = useRef({ pending: 0, seq: 0 })
  const track = useCallback(async <T,>(work: () => Promise<T>) => {
    editsRef.current.pending++
    editsRef.current.seq++
    try { return await work() } finally { editsRef.current.pending--; editsRef.current.seq++ }
  }, [])

  const load = useCallback(async () => {
    const seqAtStart = editsRef.current.seq
    const { res, body } = await api(`${base}/state`)
    if (res.ok && body) {
      setOrder((prev) => keepFileLink(prev, body.order))
      if (editsRef.current.pending === 0 && editsRef.current.seq === seqAtStart) {
        setPins(sortPins(body.pins))
        setMessages(body.messages ?? [])
      }
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
    // Shown right away under a temporary id, swapped for the saved one when it's back.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const temp: Pin = {
      id: tempId, order_id: orderId, x: pin.x, y: pin.y, page: pin.page, title: pin.title,
      description: pin.description, author_name: viewer, resolved: false,
      created_at: new Date().toISOString(), version: pin.version,
    }
    setPins((prev) => sortPins([...prev, temp]))
    await track(async () => {
      const { res, body } = await api(`${base}/pins`, { method: "POST", body: JSON.stringify(pin) })
      if (!res.ok || !body?.pin) {
        setPins((prev) => prev.filter((p) => p.id !== tempId))
        throw new Error(limitMessage(body?.error) ?? "Couldn't save the comment")
      }
      setPins((prev) => sortPins([...prev.filter((p) => p.id !== tempId && p.id !== body.pin.id), body.pin]))
    })
  }, [base, orderId, viewer, track])

  const patchPin = useCallback(async (id: string, patch: Partial<Pin>) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    await track(async () => {
      const { res } = await api(`${base}/pins/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
      if (!res.ok) load()
    })
  }, [base, load, track])

  const setResolved = useCallback((id: string, resolved: boolean) => patchPin(id, { resolved }), [patchPin])
  const movePin = useCallback((id: string, x: number, y: number) => patchPin(id, { x, y }), [patchPin])
  /** What a pin is about, written in the list after it was put on the file. */
  const describePin = useCallback(
    (id: string, title: string, description: string | null) => patchPin(id, { title, description }),
    [patchPin]
  )
  /** The client writes in a pin; a fixed pin opens again. Shown at once, saved in the background. */
  const sendMessage = useCallback(async (pinId: string, text: string) => {
    const tempId = `temp-${Date.now()}`
    setMessages((prev) => [...prev, {
      id: tempId, pin_id: pinId, order_id: orderId, author_role: "client", author_name: viewer,
      body: text, file_url: null, marks_fixed: false, created_at: new Date().toISOString(),
    }])
    setPins((prev) => prev.map((p) => (p.id === pinId && p.fix_status === "fixed" ? { ...p, fix_status: "reopened", resolved: false } : p)))
    await track(async () => {
      const { res, body } = await api(`${base}/pins/${pinId}/messages`, { method: "POST", body: JSON.stringify({ body: text }) })
      if (!res.ok || !body?.message) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        load()
        throw new Error(limitMessage(body?.error) ?? "Couldn't send the message")
      }
      setMessages((prev) => prev.map((m) => (m.id === tempId ? body.message : m)))
    })
  }, [base, orderId, viewer, track, load])

  const deletePin = useCallback(async (id: string) => {
    let removed: Pin | undefined
    setPins((prev) => {
      removed = prev.find((p) => p.id === id)
      return prev.filter((p) => p.id !== id)
    })
    await track(async () => {
      const { res } = await api(`${base}/pins/${id}`, { method: "DELETE" })
      if (!res.ok) {
        if (removed) setPins((prev) => sortPins([...prev, removed!]))
        throw new Error("Not allowed to delete this comment")
      }
    })
  }, [base, track])

  /** Approve or ask for changes; returns false if it couldn't be saved. */
  const decide = useCallback(async (status: "approved" | "changes") => {
    const { res, body } = await api(`${base}/decision`, { method: "POST", body: JSON.stringify({ status }) })
    if (!res.ok || !body?.order) return false
    setOrder((prev) => keepFileLink(prev, body.order))
    return true
  }, [base])

  return { phase, order, pins, messages, viewer, hasPassword, enter, leave, addPin, setResolved, movePin, describePin, sendMessage, deletePin, decide }
}
