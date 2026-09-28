"use client"

import { supabase } from "@/lib/supabase"
import type { Order } from "@/components/dashboard/types"

const FILES_BUCKET = "order-files"

/** Storage path of a file from its public URL (".../object/public/order-files/<path>"). */
function storagePath(fileUrl: string | null) {
  if (!fileUrl) return null
  const marker = `/${FILES_BUCKET}/`
  const i = fileUrl.indexOf(marker)
  return i === -1 ? null : decodeURIComponent(fileUrl.slice(i + marker.length).split("?")[0])
}

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
  const path = storagePath(order.file_url)
  if (path) {
    const { error: fileError } = await supabase.storage.from(FILES_BUCKET).remove([path])
    if (fileError) console.error("Order file cleanup error:", fileError)
  }
}
