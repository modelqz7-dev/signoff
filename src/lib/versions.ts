"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Order, OrderVersion } from "@/components/dashboard/types"

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", ё: "e", є: "ye", ж: "zh", з: "z", и: "i", і: "i", ї: "yi",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
}

/** A storage-safe version of a file name: Latin letters, digits, dots, dashes. */
function storageName(name: string) {
  const latin = [...name].map((ch) => {
    const lower = ch.toLowerCase()
    const out = CYRILLIC[lower]
    if (out === undefined) return ch
    return ch === lower ? out : out.charAt(0).toUpperCase() + out.slice(1)
  }).join("")
  return latin.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^[-.]+|-+$/g, "") || "file"
}

/** Uploads a file to the shop's folder and returns its public URL. */
export async function uploadOrderFile(shopId: string, file: File) {
  // Keep the original name (as far as storage keys allow) so it can be shown later.
  const path = `${shopId}/${Date.now()}-${storageName(file.name)}`
  const { error } = await supabase.storage.from("order-files").upload(path, file)
  if (error) throw error
  return supabase.storage.from("order-files").getPublicUrl(path).data.publicUrl
}

/**
 * Puts a new file on an order. When versions are set up (supabase/retention.sql) and the
 * order already has a file, the old file is kept as the previous version, the version number
 * goes up and the order goes back to "awaiting review" for the client.
 */
export async function uploadNewVersion(order: Order, file: File) {
  const fileUrl = await uploadOrderFile(order.shop_id, file)
  const versioned = order.version !== undefined && !!order.file_url

  if (versioned) {
    const { error } = await supabase
      .from("order_versions")
      .upsert(
        { order_id: order.id, version: order.version, file_url: order.file_url },
        { onConflict: "order_id,version", ignoreDuplicates: true }
      )
    if (error) throw error
  }

  const patch = versioned
    ? { file_url: fileUrl, version: (order.version ?? 1) + 1, status: "await" }
    : { file_url: fileUrl }
  const { data, error } = await supabase.from("orders").update(patch).eq("id", order.id).select().single()
  if (error) throw error
  return data as Order
}

/** Earlier versions of an order, oldest first (empty until versions are set up). */
export function useOrderVersions(orderId: string | null, currentVersion: number | undefined) {
  const [versions, setVersions] = useState<OrderVersion[]>([])

  useEffect(() => {
    if (!orderId || !currentVersion || currentVersion < 2) return
    let cancelled = false
    supabase
      .from("order_versions").select("*")
      .eq("order_id", orderId)
      .order("version", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Versions load error:", error)
        else if (!cancelled) setVersions((data as OrderVersion[]).filter((v) => v.version < currentVersion))
      })
    return () => { cancelled = true }
  }, [orderId, currentVersion])

  return currentVersion && currentVersion > 1 ? versions : []
}

/** File name from a storage URL (without the upload timestamp), for labels and the certificate. */
export function fileNameFromUrl(url: string | null | undefined) {
  if (!url) return ""
  let name = url.split("?")[0].split("/").pop() || ""
  try { name = decodeURIComponent(name) } catch {}
  return name.replace(/^\d{10,}-/, "")
}
