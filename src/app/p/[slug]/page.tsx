import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageView } from "@/components/page/PageView"
import { loadPublicPage } from "@/lib/server/page"

type Props = { params: Promise<{ slug: string }> }

// Always the latest version: the workshop edits it and expects to see changes at once.
export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await loadPublicPage((await params).slug)
  if (!page) return { title: "Nodly" }
  const { data } = page
  const description = data.tagline || data.bio.slice(0, 160) || undefined
  const image = data.banner_url || data.avatar_url
  return {
    title: data.title,
    description,
    openGraph: { title: data.title, description, images: image ? [image] : undefined },
  }
}

/** A workshop's public page, served at /@name. */
export default async function PublicPage({ params }: Props) {
  const page = await loadPublicPage((await params).slug)
  if (!page) notFound()
  return (
    <main className="min-h-dvh">
      <PageView data={page.data} slug={page.slug} />
    </main>
  )
}
