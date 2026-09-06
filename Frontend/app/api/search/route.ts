import { NextResponse } from "next/server"
import { searchSymbols } from "@/lib/yahoo"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const results = await searchSymbols(query)

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store" } },
  )
}
