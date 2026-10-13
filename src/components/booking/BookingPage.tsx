"use client"

import { PageView } from "@/components/page/PageView"
import type { PageData, PageReview } from "@/lib/page"
import { useT } from "@/lib/i18n"

/** A beauty or cake business's page: the Link page in its own design, with booking as its first section. */
export function BookingPage({ data, slug, reviews, isOrder, booking, preview, onEdit }: {
  data: PageData
  slug: string
  reviews?: PageReview[]
  isOrder: boolean
  booking: React.ReactNode
  preview?: boolean
  onEdit?: React.ComponentProps<typeof PageView>["onEdit"]
}) {
  const { t } = useT()
  return (
    <PageView data={data} slug={slug} reviews={reviews} preview={preview} onEdit={onEdit}
      booking={{ label: isOrder ? t("Order") : t("Booking"), button: isOrder ? t("Place the order") : t("Book now"), node: booking }} />
  )
}
