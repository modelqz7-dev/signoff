"use client"

import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { Shop } from "@/components/dashboard/types"

/**
 * The signed-in user's workshop. New accounts normally get one from the sign-up database
 * trigger; if it is missing (trigger not installed yet), create it here from the name
 * given at sign-up, so a fresh account never lands on an empty dashboard.
 */
export async function getOrCreateShop(user: User) {
  const found = await supabase.from("shops").select("*").eq("user_id", user.id).maybeSingle()
  if (found.error || found.data) return found as { data: Shop | null; error: typeof found.error }

  const meta = user.user_metadata || {}
  const name = (typeof meta.shop_name === "string" && meta.shop_name.trim()) || user.email?.split("@")[0] || "My workshop"
  const created = await supabase.from("shops").insert({ user_id: user.id, name, plan: "free" }).select().single()
  return created as { data: Shop | null; error: typeof created.error }
}
