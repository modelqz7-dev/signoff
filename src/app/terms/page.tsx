import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/LegalDoc"

export const metadata: Metadata = { title: "Terms of service · Nodly" }

export default function Page() {
  return <LegalDoc id="terms" />
}
