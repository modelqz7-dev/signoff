"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AuthField, AuthMessage, AuthShell } from "@/components/auth/AuthShell"
import { useT } from "@/lib/i18n"
import { siteOrigin } from "@/lib/site"

export default function SignupPage() {
  const router = useRouter()
  const { t } = useT()
  const [shopName, setShopName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError(t("Use at least 8 characters")); return }
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The workshop name is picked up by the sign-up trigger (or getOrCreateShop).
        data: { shop_name: shopName.trim() },
        emailRedirectTo: `${siteOrigin()}/dashboard`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    // With email confirmation on, there is no session until the link in the email is opened.
    if (data.session) router.replace("/dashboard")
    else { setCheckEmail(true); setLoading(false) }
  }

  if (checkEmail) {
    return (
      <AuthShell title={t("Check your email")} description={t("We sent a confirmation link to {email}.", { email })}>
        <div className="flex flex-col gap-4">
          <AuthMessage kind="ok">{t("Open the link in the email to activate your account, then sign in.")}</AuthMessage>
          <Link href="/login" className="text-center text-sm text-accent hover:underline">{t("Back to sign in")}</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t("Create your account")}
      description={t("Free during early access · No card required")}
      footer={
        <>
          {t("Already have an account?")}{" "}
          <Link href="/login" className="text-accent hover:underline">{t("Sign in")}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField
          id="shop-name"
          label={t("Workshop name")}
          placeholder={t("e.g. Print Lab")}
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          required
        />
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
          autoComplete="new-password"
          placeholder={t("At least 8 characters")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <AuthMessage kind="error">{error}</AuthMessage>}
        <Button type="submit" isDisabled={loading} className="w-full">
          {loading ? t("Creating account...") : t("Create account")}
        </Button>
      </form>
    </AuthShell>
  )
}
