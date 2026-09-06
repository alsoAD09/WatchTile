import { NextResponse } from "next/server"
import { fetchQuote } from "@/lib/yahoo"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get("symbols")

  if (!symbolsParam) {
    return NextResponse.json({ quotes: [] })
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50)

  const results = await Promise.all(symbols.map((s) => fetchQuote(s)))
  const quotes = results.filter((q) => q !== null)

  return NextResponse.json(
    { quotes },
    { headers: { "Cache-Control": "no-store" } },
  )
}
