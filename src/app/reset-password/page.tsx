"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AuthField, AuthMessage, AuthShell } from "@/components/auth/AuthShell"
import { useT } from "@/lib/i18n"

/**
 * Landing page of the password-reset email. Supabase signs the user in from the link
 * (PASSWORD_RECOVERY), then they choose a new password here.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useT()
  const [ready, setReady] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true)
    })
    // The link may already have been processed before this listener was attached.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    const timeout = setTimeout(() => setReady((r) => r ?? false), 3000)
    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError(t("Use at least 8 characters")); return }
    if (password !== confirm) { setError(t("Passwords don't match")); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) setError(updateError.message)
    else router.replace("/dashboard")
  }

  if (ready === false) {
    return (
      <AuthShell title={t("Link expired")} description={t("This reset link is invalid or has already been used.")}>
        <Link href="/forgot-password" className="block text-center text-sm text-accent hover:underline">
          {t("Send a new link")}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t("Set a new password")} description={t("Choose a new password for your account.")}>
      {ready === null ? (
        <p className="text-center text-sm text-muted-foreground">{t("Loading...")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthField
            id="new-password"
            label={t("New password")}
            type="password"
            autoComplete="new-password"
            placeholder={t("At least 8 characters")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <AuthField
            id="confirm-password"
            label={t("Confirm password")}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error && <AuthMessage kind="error">{error}</AuthMessage>}
          <Button type="submit" isDisabled={loading} className="w-full">
            {loading ? t("Saving...") : t("Save password")}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
