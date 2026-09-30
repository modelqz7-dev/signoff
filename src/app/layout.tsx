import type { Metadata } from "next"
import { Inter } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"
import { THEME_INIT_SCRIPT } from "@/lib/theme-script"
import { Analytics } from "@/components/Analytics"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
})

// The "Nodly" wordmark next to the logo key (Manrope Bold, SIL Open Font License).
const brand = localFont({
  src: "./fonts/manrope-700.woff2",
  variable: "--font-brand",
  weight: "700",
})

export const metadata: Metadata = {
  title: "Nodly — client approvals for designs",
  description: "Share a design, collect pinned comments and get your client's approval in one link.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${brand.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
