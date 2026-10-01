"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AuthField, AuthMessage, AuthShell } from "@/components/auth/AuthShell"
import { useT } from "@/lib/i18n"
import { siteOrigin } from "@/lib/site"

export default function ForgotPasswordPage() {
  const { t } = useT()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteOrigin()}/reset-password`,
    })
    setLoading(false)
    if (resetError) setError(resetError.message)
    else setSent(true)
  }

  return (
    <AuthShell
      title={t("Reset your password")}
      description={t("Enter your email and we'll send you a link to set a new password.")}
      footer={<Link href="/login" className="text-accent hover:underline">{t("Back to sign in")}</Link>}
    >
      {sent ? (
        <AuthMessage kind="ok">{t("If an account exists for {email}, a reset link is on its way. Check your inbox.", { email })}</AuthMessage>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthField
            id="email"
            label={t("Email")}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <AuthMessage kind="error">{error}</AuthMessage>}
          <Button type="submit" isDisabled={loading} className="w-full">
            {loading ? t("Sending...") : t("Send reset link")}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
