import { cn } from "@/lib/utils"

/**
 * The niche's character in the Notion style (public/niches: a "Notionists" remix with the
 * trade's tool in a badge). White in both themes, like a sticker.
 */
export function NicheIcon({ niche, className }: { niche: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/niches/${niche}.svg`} alt="" draggable={false} className={cn("shrink-0 rounded-xl bg-white object-cover ring-1 ring-black/[0.06]", className)} />
  )
}
