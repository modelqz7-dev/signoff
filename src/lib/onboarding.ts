"use client"

const SHARED_KEY = "nodly-link-shared"
const DISMISSED_KEY = "nodly-onboarding-dismissed"

/** Remember that the shop copied a portal link (a "Share the link" onboarding step). */
export function markLinkShared() {
  try { localStorage.setItem(SHARED_KEY, "1") } catch {}
}

export function wasLinkShared() {
  try { return localStorage.getItem(SHARED_KEY) === "1" } catch { return false }
}

export function isOnboardingDismissed() {
  try { return localStorage.getItem(DISMISSED_KEY) === "1" } catch { return false }
}

export function dismissOnboarding() {
  try { localStorage.setItem(DISMISSED_KEY, "1") } catch {}
}
