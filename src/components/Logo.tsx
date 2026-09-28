import { cn } from "@/lib/utils"

/** Nodly mark: a rounded square with a check — the client's "nod" of approval. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true" className={cn("size-5", className)}>
      <rect x="2" y="2" width="24" height="24" rx="7" stroke="var(--accent)" strokeWidth="2.5" />
      <path d="M9 14.5l3 3 7-7" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark className={markClassName} />
      <span className="text-[15px] font-medium tracking-tight">Nodly</span>
    </span>
  )
}
