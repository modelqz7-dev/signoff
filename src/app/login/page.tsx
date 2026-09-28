"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { useT } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Logo } from "@/components/Logo"
import Link from "next/link"

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

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data.session) {
      setError(authError?.message || t("Sign in failed"))
      setLoading(false)
      return
    }

    router.replace("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <LanguageSwitcher className="mx-auto mb-3" />
          <Link href="/" className="mx-auto mb-2">
            <Logo markClassName="size-7" className="[&>span:last-child]:text-lg" />
          </Link>
          <CardTitle className="text-base">{t("Sign in")}</CardTitle>
          <CardDescription>
            {t("Enter your credentials to continue")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm text-muted-foreground"
              >
                {t("Email")}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm text-muted-foreground"
              >
                {t("Password")}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={t("Password")}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              isDisabled={loading}
              className="w-full"
            >
              {loading ? t("Signing in...") : t("Sign in")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
