import { NextResponse } from "next/server"
import { fetchQuote } from "@/lib/yahoo"
import { computeEMA, computeRSI } from "@/lib/technicals"
import { analyzeShift, type AnalyzeShiftPayload } from "@/lib/watchlist-api"
import { deriveTicker } from "@/lib/watchlists"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Builds the last-visit / current quantitative snapshots the shift-analysis
// backend needs (price, volume, EMA-20, RSI-14) straight from fresh Yahoo
// Finance candles, then asks it to summarize what meaningfully changed.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { symbol?: string; unitsHeld?: number } | null
  const symbol = body?.symbol?.trim()

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 })
  }

  const quote = await fetchQuote(symbol)
  if (!quote || quote.candles.length < 3) {
    return NextResponse.json({ error: "insufficient historical data" }, { status: 404 })
  }

  const closes = quote.candles.map((c) => c.close)
  const ema20 = computeEMA(closes, 20)
  const rsi14 = computeRSI(closes, 14)

  const lastIdx = quote.candles.length - 1
  // Approximate "last visit" as two trading sessions back (~48h), matching
  // the delta shown in the UI, since we don't persist a real per-user visit.
  const visitIdx = Math.max(0, lastIdx - 2)

  const toState = (i: number) => ({
    timestamp: new Date(quote.candles[i].time * 1000).toISOString(),
    price: Number(quote.candles[i].close.toFixed(2)),
    volume: quote.candles[i].volume,
    ema_20: Number(ema20[i].toFixed(2)),
    rsi: Number(rsi14[i].toFixed(2)),
  })

  const payload: AnalyzeShiftPayload = {
    ticker: deriveTicker(symbol),
    units_held: body?.unitsHeld ?? 5,
    currency_symbol: "₹",
    last_visit_state: toState(visitIdx),
    current_state: toState(lastIdx),
  }

  const result = await analyzeShift(payload)
  if (!result) {
    return NextResponse.json({ error: "shift analysis failed" }, { status: 502 })
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
}
