export const YF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*",
}

export type OhlcBar = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Quote = {
  symbol: string
  name: string
  exchange: string
  currency: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  dayHigh: number
  dayLow: number
  open: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  volume: number
  marketTime: number
  spark: number[]
  // Recent daily OHLCV bars (oldest -> newest), used for external pattern
  // detection and technical-indicator calculations.
  candles: OhlcBar[]
}

type YahooChartResult = {
  meta: {
    symbol: string
    shortName?: string
    longName?: string
    fullExchangeName?: string
    exchangeName?: string
    currency?: string
    regularMarketPrice?: number
    chartPreviousClose?: number
    previousClose?: number
    regularMarketDayHigh?: number
    regularMarketDayLow?: number
    regularMarketVolume?: number
    regularMarketTime?: number
    regularMarketOpen?: number
    fiftyTwoWeekHigh?: number
    fiftyTwoWeekLow?: number
  }
  timestamp?: number[]
  indicators?: {
    quote?: Array<{
      close?: (number | null)[]
      open?: (number | null)[]
      high?: (number | null)[]
      low?: (number | null)[]
      volume?: (number | null)[]
    }>
  }
}

// Live USD -> INR rate, refreshed at most once a minute so the 500ms polling
// loop never hammers the FX endpoint.
let usdInrCache: { rate: number; at: number } | null = null

async function getUsdInrRate(): Promise<number> {
  const now = Date.now()
  if (usdInrCache && now - usdInrCache.at < 60_000) return usdInrCache.rate
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?range=1d&interval=1d",
      { headers: YF_HEADERS, cache: "no-store" },
    )
    if (!res.ok) throw new Error("fx")
    const json = (await res.json()) as { chart?: { result?: YahooChartResult[] } }
    const rate = json.chart?.result?.[0]?.meta?.regularMarketPrice
    if (typeof rate === "number" && rate > 0) {
      usdInrCache = { rate, at: now }
      return rate
    }
  } catch {
    /* fall through to any cached value */
  }
  return usdInrCache?.rate ?? 1
}

function chartUrl(symbol: string): string {
  // range=1mo&interval=1d gives native day/52-week fields in `meta` plus a
  // clean daily close series whose last two points are today and the true
  // previous close — exactly what the Yahoo Finance website uses.
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=1mo&interval=1d&includePrePost=false`
}

async function fetchChart(symbol: string): Promise<YahooChartResult | null> {
  try {
    const res = await fetch(chartUrl(symbol), { headers: YF_HEADERS, cache: "no-store" })
    if (!res.ok) return null
    const json = (await res.json()) as {
      chart?: { result?: YahooChartResult[]; error?: unknown }
    }
    return json.chart?.result?.[0] ?? null
  } catch {
    return null
  }
}

export async function fetchQuote(rawSymbol: string): Promise<Quote | null> {
  const symbol = rawSymbol.trim()

  let result = await fetchChart(symbol)
  // Enforce Indian ticker formatting: a bare ticker (no exchange suffix / not
  // FX) that Yahoo can't resolve is retried on the NSE with the `.NS` suffix.
  if (!result && symbol && !symbol.includes(".") && !symbol.includes("=")) {
    result = await fetchChart(`${symbol}.NS`)
  }
  if (!result) return null

  const meta = result.meta
  const q = result.indicators?.quote?.[0]
  const closes = (q?.close ?? []).filter((v): v is number => typeof v === "number")
  const opens = (q?.open ?? []).filter((v): v is number => typeof v === "number")

  const rawPrice = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0

  // True previous close = the daily close of the bar before today. This matches
  // Yahoo's 1D change exactly (chartPreviousClose is range-relative and wrong
  // for multi-day ranges).
  const rawPrevClose =
    closes.length >= 2
      ? closes[closes.length - 2]
      : meta.chartPreviousClose ?? meta.previousClose ?? rawPrice

  const rawOpen = meta.regularMarketOpen ?? opens[opens.length - 1] ?? rawPrevClose

  let rawDayHigh = meta.regularMarketDayHigh
  let rawDayLow = meta.regularMarketDayLow
  if (typeof rawDayHigh !== "number" || typeof rawDayLow !== "number") {
    const todayHigh = q?.high?.[q.high.length - 1]
    const todayLow = q?.low?.[q.low.length - 1]
    rawDayHigh = typeof rawDayHigh === "number" ? rawDayHigh : (todayHigh ?? Math.max(rawOpen, rawPrice))
    rawDayLow = typeof rawDayLow === "number" ? rawDayLow : (todayLow ?? Math.min(rawOpen, rawPrice))
  }

  const raw52High = meta.fiftyTwoWeekHigh ?? (closes.length ? Math.max(...closes) : rawPrice)
  const raw52Low = meta.fiftyTwoWeekLow ?? (closes.length ? Math.min(...closes) : rawPrice)

  // Daily close chart series with the final point pinned to the live price so
  // the latest chart point always equals regularMarketPrice.
  const rawSpark = closes.length > 1 ? [...closes] : [rawPrevClose, rawPrice]
  rawSpark[rawSpark.length - 1] = rawPrice

  // Build a short daily OHLCV candle series (oldest -> newest) for external
  // pattern detection, reusing the same chart response fetched above.
  const rawCloseArr = q?.close ?? []
  const rawOpenArr = q?.open ?? []
  const rawHighArr = q?.high ?? []
  const rawLowArr = q?.low ?? []
  const rawVolumeArr = q?.volume ?? []
  const timestamps = result.timestamp ?? []
  const rawBars: OhlcBar[] = []
  for (let i = 0; i < rawCloseArr.length; i++) {
    const c = rawCloseArr[i]
    if (typeof c !== "number") continue
    const o = rawOpenArr[i]
    const h = rawHighArr[i]
    const l = rawLowArr[i]
    const v = rawVolumeArr[i]
    rawBars.push({
      time: timestamps[i] ?? Math.floor(Date.now() / 1000),
      open: typeof o === "number" ? o : c,
      high: typeof h === "number" ? h : c,
      low: typeof l === "number" ? l : c,
      close: c,
      volume: typeof v === "number" ? v : 0,
    })
  }
  if (rawBars.length) {
    const lastBar = rawBars[rawBars.length - 1]
    lastBar.close = rawPrice
    lastBar.high = Math.max(lastBar.high, rawPrice)
    lastBar.low = Math.min(lastBar.low, rawPrice)
  }
  const recentBars = rawBars.slice(-20)

  const nativeCurrency = meta.currency || "INR"

  // If Yahoo already returns INR, use the figures verbatim. Otherwise convert
  // price-like fields with the live USD/INR rate so everything displays in ₹.
  let fx = 1
  if (nativeCurrency !== "INR") {
    fx = await getUsdInrRate()
  }

  const conv = (v: number) => v * fx

  const candles: OhlcBar[] = recentBars.map((b) => ({
    time: b.time,
    open: conv(b.open),
    high: conv(b.high),
    low: conv(b.low),
    close: conv(b.close),
    volume: b.volume,
  }))

  return {
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    currency: "INR",
    price: conv(rawPrice),
    previousClose: conv(rawPrevClose),
    change: conv(rawPrice - rawPrevClose),
    changePercent: rawPrevClose ? ((rawPrice - rawPrevClose) / rawPrevClose) * 100 : 0,
    dayHigh: conv(rawDayHigh as number),
    dayLow: conv(rawDayLow as number),
    open: conv(rawOpen),
    fiftyTwoWeekHigh: conv(raw52High),
    fiftyTwoWeekLow: conv(raw52Low),
    volume: meta.regularMarketVolume ?? 0,
    marketTime: meta.regularMarketTime ?? Date.now() / 1000,
    spark: rawSpark.map(conv),
    candles,
  }
}

export type SearchResult = {
  symbol: string
  name: string
  exchange: string
  type: string
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query,
  )}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`

  try {
    const res = await fetch(url, { headers: YF_HEADERS, cache: "no-store" })
    if (!res.ok) return []
    const json = (await res.json()) as {
      quotes?: Array<{
        symbol?: string
        shortname?: string
        longname?: string
        exchDisp?: string
        quoteType?: string
        isYahooFinance?: boolean
      }>
    }
    return (json.quotes ?? [])
      .filter((q) => q.symbol && q.isYahooFinance !== false && q.quoteType === "EQUITY")
      .map((q) => ({
        symbol: q.symbol as string,
        name: q.longname || q.shortname || (q.symbol as string),
        exchange: q.exchDisp || "",
        type: q.quoteType || "EQUITY",
      }))
  } catch {
    return []
  }
}
