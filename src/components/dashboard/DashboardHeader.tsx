"use client"

import { Button } from "@/components/ui/button"
import { openNav } from "@/lib/panels"
import { MenuIcon } from "lucide-react"
import { useT } from "@/lib/i18n"

type DashboardHeaderProps = {
  shopName: string
  /** Replaces "Welcome back, {shop}" (the dashboard greets you in the page itself). */
  title?: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function DashboardHeader({
  shopName,
  title,
  sidebarOpen,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const { t } = useT()

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b px-4 sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onPress={openNav} aria-label={t("Menu")}>
          <MenuIcon className="text-muted-foreground" />
        </Button>
        <h1 className="truncate text-sm font-light tracking-wide text-foreground sm:text-base">
          {title ? (
            <span className="font-medium">{title}</span>
          ) : (
            <>
              <span className="hidden sm:inline">{t("Welcome back,")} </span>
              <span className="font-medium">{shopName}</span>
            </>
          )}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onPress={onToggleSidebar}
          aria-label={t("Toggle sidebar")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-muted-foreground"
          >
            {sidebarOpen ? (
              <>
                <rect
                  x="1"
                  y="2"
                  width="14"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <line
                  x1="10"
                  y1="2"
                  x2="10"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </>
            ) : (
              <>
                <rect
                  x="1"
                  y="2"
                  width="14"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <line
                  x1="10"
                  y1="2"
                  x2="10"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
              </>
            )}
          </svg>
        </Button>

      </div>
    </header>
  )
}
