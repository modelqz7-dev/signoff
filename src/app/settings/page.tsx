"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Shop } from "@/components/dashboard/types"

type Status = { kind: "ok" | "error"; text: string } | null

function StatusText({ status }: { status: Status }) {
  if (!status) return null
  return (
    <p className={`text-xs ${status.kind === "ok" ? "text-muted-foreground" : "text-destructive"}`}>
      {status.text}
    </p>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [email, setEmail] = useState("")

  const [shopName, setShopName] = useState("")
  const [savingShop, setSavingShop] = useState(false)
  const [shopStatus, setShopStatus] = useState<Status>(null)

  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<Status>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace("/login"); return }
      setEmail(session.user.email || "")

      const { data: shopData } = await supabase
        .from("shops").select("*").eq("user_id", session.user.id).maybeSingle()
      if (shopData) {
        setShop(shopData as Shop)
        setShopName((shopData as Shop).name || "")
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function handleSaveShop(e: React.FormEvent) {
    e.preventDefault()
    if (!shop || !shopName.trim()) return
    setSavingShop(true)
    setShopStatus(null)
    const { data, error } = await supabase
      .from("shops").update({ name: shopName.trim() }).eq("id", shop.id).select().maybeSingle()
    if (error || !data) {
      setShopStatus({ kind: "error", text: error?.message || "Couldn't save the name" })
    } else {
      setShop(data as Shop)
      setShopStatus({ kind: "ok", text: "Saved" })
    }
    setSavingShop(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordStatus(null)
    if (password.length < 8) {
      setPasswordStatus({ kind: "error", text: "Use at least 8 characters" })
      return
    }
    if (password !== passwordConfirm) {
      setPasswordStatus({ kind: "error", text: "Passwords don't match" })
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setPasswordStatus({ kind: "error", text: error.message })
    } else {
      setPassword("")
      setPasswordConfirm("")
      setPasswordStatus({ kind: "ok", text: "Password updated" })
    }
    setSavingPassword(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} activePage="settings" />

      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          shopName={shop?.name || ""}
          avatarUrl=""
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
            <h2 className="text-base font-medium text-foreground">Settings</h2>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Workshop</CardTitle>
                <CardDescription>Shown to you in the dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveShop} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="shop-name">Name</Label>
                    <Input
                      id="shop-name"
                      value={shopName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShopName(e.target.value)}
                      disabled={!shop}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <StatusText status={shopStatus} />
                    <Button
                      type="submit"
                      size="sm"
                      className="ml-auto"
                      isDisabled={!shop || savingShop || !shopName.trim() || shopName.trim() === shop.name}
                    >
                      {savingShop ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Account</CardTitle>
                <CardDescription>Signed in as {email}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="new-password">New password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordConfirm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <StatusText status={passwordStatus} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      isDisabled={savingPassword || !password || !passwordConfirm}
                    >
                      {savingPassword ? "Updating..." : "Change password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
