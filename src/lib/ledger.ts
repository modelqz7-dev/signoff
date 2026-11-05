"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// Daily takings and expenses of one shop (see supabase/ledger.sql).

export type LedgerDay = { day: string; cash: number; card: number }
export type Expense = { id: string; day: string; amount: number; category: string; note: string }

/** What an expense can be filed under; English, shown through t(). */
export const EXPENSE_CATEGORIES = ["Groceries", "Supplies", "Rent", "Salary", "Utilities", "Other"]

/** Reads what a person typed: "1 250,5" and "1250.5" both work; empty or broken is 0. */
export function parseAmount(text: string) {
  const n = Number(text.replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

/** Sums by month ("YYYY-MM") or year ("YYYY"): takings and expenses. */
export function totals(days: LedgerDay[], expenses: Expense[], prefix: string) {
  const d = days.filter((x) => x.day.startsWith(prefix))
  const cash = d.reduce((s, x) => s + x.cash, 0)
  const card = d.reduce((s, x) => s + x.card, 0)
  const spent = expenses.filter((x) => x.day.startsWith(prefix)).reduce((s, x) => s + x.amount, 0)
  return { cash, card, revenue: cash + card, spent, profit: cash + card - spent }
}

export function useLedger(shopId: string) {
  const [days, setDays] = useState<LedgerDay[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let off = false
    Promise.all([
      supabase.from("crm_ledger_days").select("day, cash, card").eq("shop_id", shopId).limit(5000),
      supabase.from("crm_expenses").select("id, day, amount, category, note").eq("shop_id", shopId).order("created_at", { ascending: true }).limit(20000),
    ]).then(([d, e]) => {
      if (off) return
      const failed = d.error || e.error
      setError(failed ? failed.message : null)
      setDays(((d.data ?? []) as LedgerDay[]).map((x) => ({ day: x.day, cash: Number(x.cash), card: Number(x.card) })))
      setExpenses(((e.data ?? []) as Expense[]).map((x) => ({ ...x, amount: Number(x.amount) })))
      setLoading(false)
    })
    return () => { off = true }
  }, [shopId])

  /** Saves a day's cash and card (a day with both at 0 is removed). */
  const saveDay = useCallback(async (day: string, cash: number, card: number) => {
    const rest = (prev: LedgerDay[]) => prev.filter((x) => x.day !== day)
    setDays((prev) => (cash || card ? [...rest(prev), { day, cash, card }] : rest(prev)))
    const { error } = cash || card
      ? await supabase.from("crm_ledger_days").upsert({ shop_id: shopId, day, cash, card })
      : await supabase.from("crm_ledger_days").delete().eq("shop_id", shopId).eq("day", day)
    if (error) throw error
  }, [shopId])

  const addExpense = useCallback(async (day: string, amount: number, category: string, note: string) => {
    const { data, error } = await supabase.from("crm_expenses").insert({ shop_id: shopId, day, amount, category, note }).select("id, day, amount, category, note").single()
    if (error) throw error
    setExpenses((prev) => [...prev, { ...(data as Expense), amount: Number((data as Expense).amount) }])
  }, [shopId])

  const removeExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from("crm_expenses").delete().eq("id", id)
    if (error) throw error
    setExpenses((prev) => prev.filter((x) => x.id !== id))
  }, [])

  return { days, expenses, loading, error, saveDay, addExpense, removeExpense }
}
