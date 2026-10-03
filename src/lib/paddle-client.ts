"use client"

// Paddle.js in the browser: loaded once on demand, then used to open the checkout overlay.
import { notifyPlanChanged } from "@/lib/use-plan"

type PaddleGlobal = {
  Environment: { set: (env: string) => void }
  Initialize: (options: { token: string; eventCallback?: (e: { name?: string }) => void }) => void
  Checkout: {
    open: (options: {
      items: { priceId: string; quantity: number }[]
      customer?: { email: string }
      customData?: Record<string, string>
      settings?: { displayMode?: string; theme?: string; locale?: string; successUrl?: string }
    }) => void
  }
}

declare global {
  interface Window { Paddle?: PaddleGlobal }
}

let loading: Promise<PaddleGlobal> | null = null

function loadPaddle(): Promise<PaddleGlobal> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const ready = () => {
      const paddle = window.Paddle
      if (!paddle) return reject(new Error("Paddle didn't load"))
      if (process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox") paddle.Environment.set("sandbox")
      paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        // The webhook changes the plan a moment after payment: refresh the plan a few times.
        eventCallback: (e) => {
          if (e.name !== "checkout.completed") return
          for (const ms of [2000, 5000, 10000]) window.setTimeout(notifyPlanChanged, ms)
        },
      })
      resolve(paddle)
    }
    if (window.Paddle) return ready()
    const script = document.createElement("script")
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js"
    script.async = true
    script.onload = ready
    script.onerror = () => { loading = null; reject(new Error("Couldn't load the payment form")) }
    document.head.appendChild(script)
  })
  return loading
}

/** Opens Paddle's checkout for a price; the shop id comes back to the webhook as custom data. */
export async function openCheckout({ priceId, email, shopId, lang }: { priceId: string; email?: string; shopId: string; lang: "en" | "ru" }) {
  const paddle = await loadPaddle()
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { shop_id: shopId },
    settings: { displayMode: "overlay", theme: "dark", locale: lang },
  })
}
