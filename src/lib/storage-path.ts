/** Bucket with order files (private once supabase/security.sql has run). */
export const FILES_BUCKET = "order-files"
/** Public bucket for avatars and portal logos. */
export const ASSETS_BUCKET = "public-assets"

/** Bucket and path of a stored file from its URL (".../object/public/<bucket>/<path>"), or null. */
export function storageObject(url: string | null | undefined) {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/)
  if (!match) return null
  return { bucket: match[1], path: decodeURIComponent(match[2]) }
}

/** The same stored file whatever signed-link token it comes with (for React keys and caching). */
export function fileKey(url: string | null | undefined) {
  if (!url) return ""
  const obj = storageObject(url)
  return obj ? `${obj.bucket}/${obj.path}` : url.split("?")[0]
}

/** Files in the private bucket need a signed URL to be opened. */
export function needsSignedUrl(url: string | null | undefined) {
  return storageObject(url)?.bucket === FILES_BUCKET
}
