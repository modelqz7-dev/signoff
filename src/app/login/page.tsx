"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AuthField, AuthMessage, AuthShell } from "@/components/auth/AuthShell"
import { useT } from "@/lib/i18n"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { t } = useT()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.session) {
      setError(authError?.message || t("Sign in failed"))
      setLoading(false)
      return
    }

    router.replace("/dashboard")
  }

  return (
    <AuthShell
      title={t("Sign in")}
      description={t("Enter your credentials to continue")}
      footer={
        <>
          {t("No account yet?")}{" "}
          <Link href="/signup" className="text-accent hover:underline">{t("Create one")}</Link>
        </>
      }
    >
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
        <AuthField
          id="password"
          label={t("Password")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aside={
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              {t("Forgot password?")}
            </Link>
          }
        />
        {error && <AuthMessage kind="error">{error}</AuthMessage>}
        <Button type="submit" isDisabled={loading} className="w-full">
          {loading ? t("Signing in...") : t("Sign in")}
        </Button>
      </form>
    </AuthShell>
  )
}
