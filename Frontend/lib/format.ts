export function formatPrice(value: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : ""
  return `${symbol}${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${formatNumber(value, digits)}`
}

export function formatCompact(value: number): string {
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)}Cr`
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(2)}L`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toString()
}

export type Sentiment = "bull" | "bear" | "neutral"

export function sentimentOf(changePercent: number): Sentiment {
  if (changePercent > 0.25) return "bull"
  if (changePercent < -0.25) return "bear"
  return "neutral"
}

// Maps the external pattern/shift APIs' "BULLISH" / "BEARISH" / "NEUTRAL"
// labels onto the same Sentiment type used throughout the UI.
export function sentimentFromLabel(label?: string): Sentiment {
  const normalized = (label || "").toUpperCase()
  if (normalized === "BULLISH") return "bull"
  if (normalized === "BEARISH") return "bear"
  return "neutral"
}
