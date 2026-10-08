"use client"

import { FileTextIcon, ImagePlusIcon } from "lucide-react"
import { STATUS_MAP, type Order } from "@/components/dashboard/types"
import { useFileUrl } from "@/lib/files"
import { cn, isPdfUrl } from "@/lib/utils"
import type { T } from "@/lib/i18n"

// Small pieces a post shows wherever it appears: on the project's table, gallery and canvas.

export function StatusChip({ t, order }: { t: T; order: Order }) {
  const s = STATUS_MAP[order.status]
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {t(s.label)}
    </span>
  )
}

/** The post's file in small: the image itself, a PDF mark, or an empty "add" tile. */
export function Thumb({ url, className }: { url: string | null; className?: string }) {
  const src = useFileUrl(url)
  if (!url) {
    return (
      <span className={cn("flex items-center justify-center bg-foreground/[0.04] text-muted-foreground ring-1 ring-border ring-inset", className)}>
        <ImagePlusIcon className="size-4" />
      </span>
    )
  }
  if (isPdfUrl(url)) {
    return (
      <span className={cn("flex items-center justify-center bg-foreground/[0.04] text-muted-foreground", className)}>
        <FileTextIcon className="size-4" />
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private files come through short-lived signed links
    <img src={src ?? undefined} alt="" className={cn("bg-foreground/[0.04] object-cover", className)} />
  )
}
