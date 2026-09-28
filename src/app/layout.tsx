import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { THEME_INIT_SCRIPT } from "@/lib/theme-script"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  title: "Signoff",
  description: "Client approval portal",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
