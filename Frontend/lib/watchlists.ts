export type Watchlist = {
  id: string
  name: string
  symbols: string[]
}

export const DEFAULT_WATCHLISTS: Watchlist[] = [
  {
    id: "aditya",
    name: "DEFAULT WATCHLIST",
    symbols: ["TATASTEEL.NS", "JIOFIN.NS", "PNB.NS", "BEL.NS", "SAIL.NS", "IDEA.NS"],
  },
  {
    id: "best",
    name: "BEST",
    symbols: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"],
  },
  {
    id: "penny",
    name: "PENNY STOCKS",
    symbols: ["IDEA.NS", "YESBANK.NS", "SUZLON.NS"],
  },
]

// A short curated list surfaced in the "Add stocks" dialog before searching.
export const SUGGESTED_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  { symbol: "ITC.NS", name: "ITC" },
]

export function deriveTicker(symbol: string): string {
  return symbol.split(".")[0]
}

export function shortLabel(symbol: string): string {
  const ticker = deriveTicker(symbol)
  return ticker.slice(0, 4)
}

const BADGE_COLORS = [
  "oklch(0.34 0.035 250)",
  "oklch(0.38 0.03 220)",
  "oklch(0.32 0.025 190)",
  "oklch(0.4 0.028 75)",
  "oklch(0.36 0.03 285)",
  "oklch(0.35 0.025 145)",
]

export function badgeColor(symbol: string): string {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0
  }
  return BADGE_COLORS[hash % BADGE_COLORS.length]
}
