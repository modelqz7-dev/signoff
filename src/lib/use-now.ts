"use client"

import { useEffect, useState } from "react"

/** Current time that re-renders every `intervalMs`, so "x ago" labels and counters stay fresh. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
