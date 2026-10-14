"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getOrCreateShop } from "@/lib/shop"
import { isCrmNiche } from "@/lib/niches"
import { NichePicker } from "@/components/crm/NichePicker"

/**
 * "What's your business?" on its own, without the dashboard around it: where switching the
 * business lands, so the old menu doesn't flash before the picker. A chosen niche opens the dashboard.
 */
export default function WelcomePage() {
  const router = useRouter()
  const [shopId, setShopId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace("/login"); return }
      const { data } = await getOrCreateShop(session.user)
      if (!data) return
      // already set up: nothing to pick
      if (isCrmNiche(data.niche)) { router.replace("/dashboard"); return }
      setShopId(data.id)
    })
  }, [router])

  return (
    <div className="flex min-h-screen bg-background">
      {shopId && <NichePicker shopId={shopId} onChosen={() => window.location.replace("/dashboard")} />}
    </div>
  )
}
