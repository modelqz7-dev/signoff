"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import { ThemeToggle } from "@/components/ThemeToggle"

/** Shared frame for sign-in, sign-up and password screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-3 flex items-center justify-between">
            <Link href="/" aria-label="Nodly">
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
}

export function AuthField({
  id,
  label,
  aside,
  ...props
}: { id: string; label: string; aside?: React.ReactNode } & React.ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      <Input id={id} {...props} />
    </div>
  )
}

/** Error or success line under a form. */
export function AuthMessage({ kind, children }: { kind: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p className={kind === "error" ? "text-sm text-destructive" : "rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground"}>
      {children}
    </p>
  )
}
