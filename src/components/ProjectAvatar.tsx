"use client"

import { createAvatar } from "@dicebear/core"
import * as notionists from "@dicebear/notionists"
import { cn } from "@/lib/utils"

// Every project gets its own Notion-style face, drawn from its id, so it never changes and needs no
// upload. Black line art on a white disc, which reads the same in both themes.
const cache = new Map<string, string>()

function faceUri(seed: string) {
  let uri = cache.get(seed)
  if (!uri) {
    uri = createAvatar(notionists, { seed, scale: 110, translateY: 4 }).toDataUri()
    cache.set(seed, uri)
  }
  return uri
}

export function ProjectAvatar({ id, className }: { id: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={faceUri(id)} alt="" draggable={false} className={cn("shrink-0 rounded-full bg-white ring-1 ring-black/[0.06]", className)} />
  )
}
