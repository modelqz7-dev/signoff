"use client"

import { supabase } from "@/lib/supabase"
import type { Order } from "@/components/dashboard/types"

import { FILES_BUCKET, storageObject } from "@/lib/storage-path"

/** Deletes an order with its comments and uploaded file. Throws if nothing was deleted. */
export async function deleteOrder(order: Order) {
  const removeOrder = () => supabase.from("orders").delete().eq("id", order.id).select("id")

  // Delete the order first, so a forbidden delete never strips its comments.
  let { data, error } = await removeOrder()
  if (error?.code === "23503") {
    // Comments still reference the order (no ON DELETE CASCADE): clear them, then retry.
    const { error: pinsError } = await supabase.from("order_pins").delete().eq("order_id", order.id)
    if (pinsError) throw pinsError
    ;({ data, error } = await removeOrder())
  }
  if (error) throw error
  // With RLS, a forbidden delete returns no error but also no rows.
  if (!data?.length) throw new Error("You don't have permission to delete this order")

  // The order is gone; leftover comments or a stored file are not worth failing over.
  const { error: pinsError } = await supabase.from("order_pins").delete().eq("order_id", order.id)
  if (pinsError) console.error("Order comments cleanup error:", pinsError)
  const file = storageObject(order.file_url)
  if (file?.bucket === FILES_BUCKET) {
    const { error: fileError } = await supabase.storage.from(FILES_BUCKET).remove([file.path])
    if (fileError) console.error("Order file cleanup error:", fileError)
  }
}

/** Deletes a project: every post in it (with comments and files) first, then the project itself. */
export async function deleteProject(project: Order) {
  const { data: posts, error } = await supabase.from("orders").select("*").eq("project_id", project.id)
  if (error) throw error
  for (const post of (posts as Order[] | null) ?? []) await deleteOrder(post)
  await deleteOrder(project)
}
