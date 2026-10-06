"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { getOrCreateShop } from "@/lib/shop"
import { useT } from "@/lib/i18n"
import { cleanPage, type PageData } from "@/lib/page"
import type { Shop } from "@/components/dashboard/types"

export type PageRow = { slug: string; published: boolean; data: PageData }

/** The signed-in workshop and its page (null when it has none yet). */
export function usePageContext() {
  const router = useRouter()
  const [shop, setShop] = useState<Shop | null>(null)
  const [page, setPage] = useState<PageRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [missingTable, setMissingTable] = useState(false)
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data: shopData } = await getOrCreateShop(session.user)
      if (!shopData) { setLoading(false); return }
      setShop(shopData)
      const { data: row, error } = await supabase.from("shop_pages").select("slug, published, data").eq("shop_id", shopData.id).maybeSingle()
      if (error && /shop_pages|relation|schema cache/i.test(error.message)) setMissingTable(true)
      if (row) setPage({ slug: row.slug, published: row.published, data: cleanPage(row.data, shopData.name) })
      setLoading(false)
    }
    init()
  }, [router])
  return { shop, page, loading, missingTable }
}

/** Sidebar + pinned title, the frame of every "My page" screen. */
export function PageShell({ activePage, title, subtitle, shopName, actions, children }: {
  activePage: string
  title: string
  subtitle?: string
  shopName: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage={activePage} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden">
          <DashboardHeader shopName={shopName} avatarUrl="" sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <div className="flex-1 px-4 pb-10 sm:px-8">
          <div className="mx-auto flex w-full max-w-[1216px] flex-col">
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background pt-8 pb-4">
              <h1 className="min-w-0 truncate text-2xl leading-7 font-bold tracking-tight">{title}</h1>
              {actions}
            </div>
            {subtitle && <p className="mt-6 max-w-2xl text-[15px] text-muted-foreground">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Shown in place of a screen's content when the page tables or the page itself are missing. */
export function PageNotice({ missingTable, hasPage }: { missingTable: boolean; hasPage: boolean }) {
  const { t } = useT()
  if (missingTable) return <p className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("Run supabase/pages.sql in Supabase first, then try again.")}</p>
  if (hasPage) return null
  return (
    <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl bg-card p-6 ring-1 ring-foreground/10">
      <p className="text-[15px]">{t("Create your page first, then share its link anywhere.")}</p>
      <a href="/link/edit" className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">{t("Create page")}</a>
    </div>
  )
}

/** A copy-to-clipboard button that says "Copied" for a moment. */
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" onClick={async () => {
      await navigator.clipboard.writeText(text).catch(() => {})
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }} className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm font-medium ring-1 ring-foreground/15 hover:bg-hover">
      {copied ? t("Copied") : label ?? t("Copy")}
    </button>
  )
}
