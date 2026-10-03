// Who sells Nodly and how to reach them, shown on the legal pages. Set these in Vercel when the
// seller's legal name is known (Paddle checks it matches the account).
export const LEGAL = {
  /** The legal name of the seller (a person or a company). */
  seller: process.env.NEXT_PUBLIC_LEGAL_NAME || "Nodly",
  /** Where customers write about billing, refunds and their data. */
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@princeeio.com",
  site: "nodly.princeeio.com",
  /** Date the documents were last changed (YYYY-MM-DD). */
  updated: "2026-10-03",
}
