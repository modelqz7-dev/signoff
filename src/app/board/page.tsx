"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MenuIcon, PanelLeftIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { ProjectCanvas, type Board } from "@/components/projects/ProjectCanvas"
import { getOrCreateShop } from "@/lib/shop"
import { openNav } from "@/lib/panels"
import { useT } from "@/lib/i18n"

/** The workshop's own canvas (the sidebar's "Canvas"): notes and schemes not tied to a project. */
export default function BoardPage() {
  const router = useRouter()
  const { t } = useT()
  const [shop, setShop] = useState<{ id: string; board: Board | null } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      const { data } = await getOrCreateShop(session.user)
      if (data) setShop({ id: data.id, board: ((data as { board?: Board | null }).board) ?? null })
    }
    init()
  }, [router])

  const save = useCallback(async (board: Board) => {
    if (!shop) return false
    const { error } = await supabase.from("shops").update({ board }).eq("id", shop.id)
    return !error
  }, [shop])

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} activePage="board" />
      <div className="flex h-dvh min-w-0 flex-1 flex-col bg-background text-foreground">
        <div className="flex h-12 shrink-0 items-center gap-2 px-3">
          <button type="button" onClick={openNav} aria-label={t("Menu")} className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground lg:hidden">
            <MenuIcon className="size-4" />
          </button>
          <button type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label={t("Toggle sidebar")} className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground lg:block">
            <PanelLeftIcon className="size-4" />
          </button>
          <span className="px-1.5 text-sm font-medium">{t("Canvas")}</span>
        </div>
        <main className="relative min-h-0 flex-1">
          {shop && <ProjectCanvas initial={shop.board} save={save} />}
        </main>
      </div>
    </div>
  )
}
