"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

// A client's own account (signed in with Telegram through the Nodly bot), shared by every
// component on the page: the booking sheet, the review form and the "My bookings" page.

export type ClientAccount = { id: string; name: string; username: string }
export type ClientBooking = {
  id: string; shop_id: string; kind: string; title: string; starts_at: string | null; due_on: string | null; due_time: string
  status: string; price: number | null; business: string; slug: string | null; avatar: string | null; reviewed: boolean
}

type State = { loaded: boolean; account: ClientAccount | null; bookings: ClientBooking[] }
let state: State = { loaded: false, account: null, bookings: [] }
const listeners = new Set<() => void>()
const set = (next: State) => { state = next; listeners.forEach((l) => l()) }
let loading: Promise<void> | null = null

export function reloadClient() {
  loading = fetch("/api/client/me", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { account: null, bookings: [] }))
    .then((d: { account: ClientAccount | null; bookings?: ClientBooking[] }) => set({ loaded: true, account: d.account, bookings: d.bookings ?? [] }))
    .catch(() => set({ loaded: true, account: null, bookings: [] }))
  return loading
}

const SERVER: State = { loaded: false, account: null, bookings: [] }

export function useClientAccount() {
  const snap = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state, () => SERVER)
  useEffect(() => { if (!loading) reloadClient() }, [])
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Opens the bot in a new tab; once the client presses Start there, this page signs in. */
  const signIn = useCallback(async () => {
    setError(null)
    setSigning(true)
    const tab = window.open("", "_blank")
    const res = await fetch("/api/client/login", { method: "POST" }).catch(() => null)
    const body = res?.ok ? await res.json() as { token: string; url: string } : null
    if (!body) { tab?.close(); setSigning(false); setError("failed"); return }
    if (tab) tab.location.href = body.url
    else window.location.href = body.url
    const until = Date.now() + 10 * 60_000
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, 2000))
      const r = await fetch(`/api/client/login?token=${body.token}`, { cache: "no-store" }).catch(() => null)
      if (!r) continue
      if (r.status === 410) break
      const d = await r.json().catch(() => ({})) as { ok?: boolean }
      if (d.ok) { await reloadClient(); setSigning(false); return }
    }
    setSigning(false)
    setError("expired")
  }, [])

  const signOut = useCallback(async () => {
    await fetch("/api/client/me", { method: "DELETE" }).catch(() => null)
    set({ loaded: true, account: null, bookings: [] })
  }, [])

  return { ...snap, signIn, signOut, signing, error }
}
