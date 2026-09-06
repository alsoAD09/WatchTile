// Server-side client for the Smart Market Watchlist backend
// (candlestick pattern detection + AI-driven shift analysis).

const BASE_URL = "https://watchlist-api-server.onrender.com"

// The backend runs on Render's free tier, which can cold-start slowly.
// Bail out rather than hanging the request indefinitely.
const REQUEST_TIMEOUT_MS = 20_000

export type PatternCandle = { open: number; high: number; low: number; close: number }
export type PatternStockInput = { ticker: string; candles: PatternCandle[] }

export type PatternResult = {
  ticker: string
  pattern: string
  market_sentiment: "BULLISH" | "BEARISH" | "NEUTRAL"
}

export async function detectPatterns(stocks: PatternStockInput[]): Promise<PatternResult[]> {
  if (!stocks.length) return []
  try {
    const res = await fetch(`${BASE_URL}/api/v1/detect-patterns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stocks }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) return []
    const json = (await res.json()) as { results?: PatternResult[] }
    return json.results ?? []
  } catch {
    return []
  }
}

export type ShiftState = {
  timestamp: string
  price: number
  volume: number
  ema_20: number
  rsi: number
}

export type AnalyzeShiftPayload = {
  ticker: string
  units_held: number
  currency_symbol: string
  last_visit_state: ShiftState
  current_state: ShiftState
}

export type ShiftMetric = { label: string; value: string; sub_value: string }
export type ShiftEvent = { title: string; timestamp_label: string; description: string }
export type ShiftResponse = {
  events_section_header: string
  numerical_changes: ShiftMetric[]
  events: ShiftEvent[]
}

export async function analyzeShift(payload: AnalyzeShiftPayload): Promise<ShiftResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/analyze-shift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) return null
    return (await res.json()) as ShiftResponse
  } catch {
    return null
  }
}
