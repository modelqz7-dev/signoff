"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

/** Personal profile data, kept in the Supabase auth user's metadata (no extra table needed). */
export type Profile = {
  email: string
  avatarUrl: string
  activity: string
}

export const ACTIVITIES = ["Designer", "Freelancer", "Print shop", "Studio", "Manufacturer", "Other"] as const

const AVATAR_BUCKET = "order-files"
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function fromMetadata(user: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined): Profile {
  const meta = user?.user_metadata || {}
  return {
    email: user?.email || "",
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : "",
    activity: typeof meta.activity === "string" ? meta.activity : "",
  }
}

/** Current user's profile; updates everywhere as soon as it is saved. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setProfile(fromMetadata(data.session?.user)))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setProfile(fromMetadata(session?.user))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return profile
}

export async function updateProfile(data: { avatar_url?: string; activity?: string }) {
  const { error } = await supabase.auth.updateUser({ data })
  if (error) throw error
}

/** Uploads a new avatar image and saves its URL to the profile. */
export async function uploadAvatar(file: File, shopId: string) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file")
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Image must be under 2 MB")
  const ext = file.name.split(".").pop() || "png"
  const path = `${shopId}/avatar-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  await updateProfile({ avatar_url: data.publicUrl })
}
