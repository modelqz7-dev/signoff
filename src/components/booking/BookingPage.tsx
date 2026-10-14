"use client"

import { SalonPage } from "@/components/booking/SalonPage"
import type { PageEditTarget } from "@/components/page/PageView"
import type { PageData, PageReview } from "@/lib/page"
import { useT } from "@/lib/i18n"
import type { CrmNiche } from "@/lib/niches"

/** Each trade's soft cover colours, shared with the catalog's cards. */
export const NICHE_COVER: Record<CrmNiche, string> = {
  nails: "linear-gradient(135deg,#f6e7e4,#ece6f3)",
  barber: "linear-gradient(135deg,#e6e9ee,#e9e4dc)",
  tattoo: "linear-gradient(135deg,#e4e4e7,#ebe6e1)",
  cakes: "linear-gradient(135deg,#f7eadb,#f3e3ea)",
}

/** A beauty or cake business's page: the Link page in its own design, in the app's Apple look, its booking in a sheet. */
export function BookingPage({ data, slug, reviews, isOrder, niche, booking, preview, onEdit }: {
  data: PageData
  niche: CrmNiche
  slug: string
  reviews?: PageReview[]
  isOrder: boolean
  booking: React.ReactNode
  preview?: boolean
  onEdit?: (target: PageEditTarget) => void
}) {
  const { t } = useT()
  return (
    <SalonPage data={data} slug={slug} reviews={reviews} preview={preview} onEdit={onEdit}
      booking={{ label: isOrder ? t("Order") : t("Booking"), button: isOrder ? t("Place the order") : t("Book now"), node: booking, face: `/niches/${niche}.svg`, cover: NICHE_COVER[niche] }} />
  )
}
