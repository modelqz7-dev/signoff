import type { Metadata } from "next"
import { ClientProfile } from "@/components/booking/ClientProfile"

export const metadata: Metadata = { title: "Мої записи — Nodly" }

/** A client's own page: their bookings everywhere on Nodly, signed in with Telegram. */
export default function MePage() {
  return <ClientProfile />
}
