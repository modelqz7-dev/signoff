import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"
import { THEME_INIT_SCRIPT } from "@/lib/theme-script"
import { Analytics } from "@/components/Analytics"
import { VisualViewport } from "@/components/VisualViewport"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
})

// Brand headlines, the "Nodly" wordmark and the home page's big numbers: Manrope, latin + cyrillic
// (SIL Open Font License). 800 for the heaviest figures, like the reference design's day numbers.
const brand = Manrope({
  variable: "--font-brand",
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800"],
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
        <VisualViewport />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
