"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { openPanel } from "@/components/dashboard/SidebarPanels"

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
  const initials = shopName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-light tracking-wide text-foreground">
          Welcome back, <span className="font-medium">{shopName}</span>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={onToggleSidebar}
          aria-label="Toggle sidebar"
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
          aria-label="Profile"
          onClick={() => openPanel("profile")}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={shopName} />
            <AvatarFallback>{initials || "S"}</AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  )
}
