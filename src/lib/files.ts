"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { ASSETS_BUCKET, FILES_BUCKET, needsSignedUrl, storageObject } from "@/lib/storage-path"

const LINK_SECONDS = 60 * 60
const cache = new Map<string, { url: string; expires: number }>()

/** A signed link (1 hour) for a file in the private bucket; any other URL is returned as is. */
async function fileLink(url: string) {
  if (!needsSignedUrl(url)) return url
  const hit = cache.get(url)
  if (hit && hit.expires > Date.now() + 60_000) return hit.url
  const { data, error } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(storageObject(url)!.path, LINK_SECONDS)
  if (error || !data) {
    console.error("Signed URL error:", error)
    return url
  }
  cache.set(url, { url: data.signedUrl, expires: Date.now() + LINK_SECONDS * 1000 })
  return data.signedUrl
}

/** Displayable URL of a stored file: signed for private files, null while it is being prepared. */
export function useFileUrl(url: string | null | undefined) {
  const [signed, setSigned] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    if (!url || !needsSignedUrl(url)) return
    let cancelled = false
    fileLink(url).then((to) => { if (!cancelled) setSigned({ from: url, to }) })
    return () => { cancelled = true }
  }, [url])

  if (!url) return null
  if (!needsSignedUrl(url)) return url
  return signed?.from === url ? signed.to : null
}

/**
 * Uploads an avatar or logo to the public assets bucket (in the shop's folder) and returns its
 * public URL. Falls back to the files bucket until supabase/security.sql has created it.
 */
export async function uploadPublicAsset(shopId: string, file: File, prefix: string) {
  const ext = (file.name.split(".").pop() || "png").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png"
  const path = `${shopId}/${prefix}-${Date.now()}.${ext}`
  for (const bucket of [ASSETS_BUCKET, FILES_BUCKET]) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
    if (!error) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    if (bucket === FILES_BUCKET || !/bucket not found/i.test(error.message)) throw error
  }
  throw new Error("Upload failed")
}
