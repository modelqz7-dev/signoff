"use client"

import { CrmApp, useCrmShop } from "@/components/crm/CrmApp"
import { useT } from "@/lib/i18n"

export default function ClientsPage() {
  const shop = useCrmShop()
  const { t } = useT()
  if (!shop) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">{t("Loading...")}</div>
  return <CrmApp shop={shop} page="clients" />
}
