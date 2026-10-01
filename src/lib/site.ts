/**
 * The site's public address for links that leave the dashboard (portal links, QR codes, auth
 * emails). Set NEXT_PUBLIC_SITE_URL to the production domain: otherwise a link copied while
 * the dashboard is open on a preview or branch address would point there, and Vercel puts
 * those behind its own login.
 */
export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "")
  if (configured) return configured
  return typeof window === "undefined" ? "" : window.location.origin
}
