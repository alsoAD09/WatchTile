// Lightweight EMA / RSI implementations so the app can supply the
// `ema_20` and `rsi` fields the /api/v1/analyze-shift endpoint expects,
// computed straight from Yahoo Finance's daily close series.

export function computeEMA(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const k = 2 / (period + 1)
  const ema: number[] = new Array(values.length)
  const seedLen = Math.min(period, values.length)
  const seed = values.slice(0, seedLen).reduce((sum, v) => sum + v, 0) / seedLen

  for (let i = 0; i < seedLen; i++) ema[i] = seed
  for (let i = seedLen; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k)
  }
  return ema
}

// Wilder's RSI, padded at the start with the first computed value so the
// returned array always aligns 1:1 with the input series.
export function computeRSI(values: number[], period = 14): number[] {
  const rsi: number[] = new Array(values.length).fill(50)
  if (values.length < period + 1) return rsi

  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }

  for (let i = 0; i < period; i++) rsi[i] = rsi[period]
  return rsi
}
