import { redirect } from "next/navigation"

// Orders live in projects now, and Home is the dashboard: the old list sends you there.
export default function OrdersPage() {
  redirect("/dashboard")
}
