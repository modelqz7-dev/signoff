"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Shop } from "@/components/dashboard/types"
import { effectivePlan, planById, trialDaysLeft, type Plan } from "@/lib/plans"

/** Fire after changing the plan or creating / finishing orders so usage widgets refresh. */
export const PLAN_CHANGED_EVENT = "signoff:plan-changed"

export function notifyPlanChanged() {
  window.dispatchEvent(new Event(PLAN_CHANGED_EVENT))
}

export type PlanUsage = {
  shop: Shop
  /** The plan the user picked. */
  chosen: Plan
  /** The plan whose limits apply now (Pro during a trial). */
  plan: Plan
  trialDays: number
  activeOrders: number
  atLimit: boolean
}

/** Plan and active-order count of a shop (or of the signed-in user's shop when shopId is omitted). */
export async function loadPlanUsage(shopId?: string): Promise<PlanUsage | null> {
  let query = supabase.from("shops").select("*")
  if (shopId) query = query.eq("id", shopId)
  else {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null
    query = query.eq("user_id", session.user.id)
  }
  const { data: shop } = await query.maybeSingle()
  if (!shop) return null

  const { count } = await supabase
    .from("orders").select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id).neq("kind", "post").in("status", ["await", "changes"])

  const plan = effectivePlan(shop as Shop)
  const activeOrders = count ?? 0
  return {
    shop: shop as Shop,
    chosen: planById((shop as Shop).plan),
    plan,
    trialDays: trialDaysLeft(shop as Shop),
    activeOrders,
    atLimit: plan.activeOrders !== null && activeOrders >= plan.activeOrders,
  }
}

/** Live plan usage of the signed-in user's shop. */
export function usePlanUsage() {
  const [usage, setUsage] = useState<PlanUsage | null>(null)

  useEffect(() => {
    let cancelled = false
    const refresh = () => loadPlanUsage().then((u) => { if (!cancelled) setUsage(u) })
    refresh()
    window.addEventListener(PLAN_CHANGED_EVENT, refresh)
    window.addEventListener("focus", refresh)
    return () => {
      cancelled = true
      window.removeEventListener(PLAN_CHANGED_EVENT, refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [])

  return usage
}
