import { redirect } from "next/navigation"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/** The catalog moved to the home page; old links (with their filters) land there. */
export default async function CatalogPage({ searchParams }: Props) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") params.set(k, v)
  const q = params.toString()
  redirect(q ? `/?${q}` : "/")
}
