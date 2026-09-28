"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { openNav, openPanel } from "@/lib/panels"
import { MenuIcon } from "lucide-react"
import { useProfile } from "@/lib/profile"
import { useT } from "@/lib/i18n"
import { useFileUrl } from "@/lib/files"

type DashboardHeaderProps = {
  shopName: string
  avatarUrl: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function DashboardHeader({
  shopName,
  avatarUrl,
  sidebarOpen,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const profile = useProfile()
  const { t } = useT()
  // Older photos live in the private files bucket and need a signed link.
  const photo = useFileUrl(avatarUrl || profile?.avatarUrl) || ""
  const initials = shopName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b px-4 sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onPress={openNav} aria-label={t("Menu")}>
          <MenuIcon className="text-muted-foreground" />
        </Button>
        <h1 className="truncate text-sm font-light tracking-wide text-foreground sm:text-base">
          <span className="hidden sm:inline">{t("Welcome back,")} </span>
          <span className="font-medium">{shopName}</span>
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

        <button
          type="button"
          aria-label={t("Profile")}
          onClick={() => openPanel("profile")}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage key={photo} src={photo} alt={shopName} />
            <AvatarFallback>{initials || "S"}</AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  )
}
