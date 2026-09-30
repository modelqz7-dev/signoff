import { cn } from "@/lib/utils"

/**
 * Nodly mark: a white 3D keycap with an N. On dark pages it stands as is; on light pages
 * (and printed paper) the same key gets a dark contour so it doesn't fade into the page.
 * `surface` forces one version, e.g. "light" on the white approval certificate.
 */
export function LogoMark({ className, surface = "auto" }: { className?: string; surface?: "auto" | "light" | "dark" }) {
  const img = (src: string, extra?: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static PNG, no optimisation needed
    <img src={src} alt="" aria-hidden="true" draggable={false} className={cn("size-7 shrink-0 select-none object-contain", extra, className)} />
  )
  if (surface === "light") return img("/brand/nodly-key-light.png")
  if (surface === "dark") return img("/brand/nodly-key-dark.png")
  return (
    <>
      {img("/brand/nodly-key-light.png", "dark:hidden")}
      {img("/brand/nodly-key-dark.png", "hidden dark:block")}
    </>
  )
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark className={markClassName} />
      <span className="font-[family-name:var(--font-brand)] text-[17px] font-bold tracking-tight">Nodly</span>
    </span>
  )
}
