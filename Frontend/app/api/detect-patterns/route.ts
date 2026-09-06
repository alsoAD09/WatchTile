import { NextResponse } from "next/server"
import { fetchQuote } from "@/lib/yahoo"
import { detectPatterns, type PatternStockInput } from "@/lib/watchlist-api"
import { deriveTicker } from "@/lib/watchlists"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Pulls fresh candles from Yahoo Finance for each watchlist symbol, then
// forwards them to the pattern-detection backend so the trend badge shown
// above each sparkline always reflects the latest market data.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { symbols?: string[] } | null
  const symbols = (body?.symbols ?? []).filter(Boolean).slice(0, 50)

  if (!symbols.length) {
    return NextResponse.json({ patterns: {} })
  }

  const quotes = await Promise.all(symbols.map((s) => fetchQuote(s)))

  const stocks: PatternStockInput[] = []
  const tickerToSymbol = new Map<string, string>()

  symbols.forEach((symbol, i) => {
    const quote = quotes[i]
    if (!quote || quote.candles.length < 2) return
    const ticker = deriveTicker(symbol).toUpperCase()
    tickerToSymbol.set(ticker, symbol)
    stocks.push({
      ticker,
      candles: quote.candles.map((c) => ({ open: c.open, high: c.high, low: c.low, close: c.close })),
    })
  })

  if (!stocks.length) {
    return NextResponse.json({ patterns: {} })
  }

  const results = await detectPatterns(stocks)

  const patterns: Record<string, { pattern: string; sentiment: string }> = {}
  for (const r of results) {
    const symbol = tickerToSymbol.get(r.ticker.toUpperCase())
    if (symbol) {
      patterns[symbol] = { pattern: r.pattern, sentiment: r.market_sentiment }
    }
  }

  return NextResponse.json({ patterns }, { headers: { "Cache-Control": "no-store" } })
}
