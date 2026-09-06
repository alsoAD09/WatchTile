"use client"

import useSWR from "swr"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { Quote } from "@/lib/yahoo"
import { formatNumber, formatSigned } from "@/lib/format"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const INDICES = [
  { label: "NIFTY 50", symbol: "^NSEI" },
  { label: "BANK NIFTY", symbol: "^NSEBANK" },
]

function IndexPill({ label, quote }: { label: string; quote?: Quote }) {
  const positive = (quote?.changePercent ?? 0) >= 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] tracking-wider text-muted-foreground">{label}</span>
      <span className="tabular text-sm text-foreground">
        {quote ? formatNumber(quote.price) : "—"}
      </span>
      {quote && (
        <span
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] tabular"
          style={{
            color: positive ? "var(--bull)" : "var(--bear)",
            backgroundColor: positive ? "oklch(0.75 0.17 158 / 0.12)" : "oklch(0.66 0.19 28 / 0.12)",
          }}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatSigned(quote.changePercent)}%
        </span>
      )}
    </div>
  )
}

export function Header() {
  const { data } = useSWR<{ quotes: Quote[] }>(
    `/api/quote?symbols=${INDICES.map((i) => i.symbol).join(",")}`,
    fetcher,
    { refreshInterval: 500 },
  )

  const bySymbol = new Map((data?.quotes ?? []).map((q) => [q.symbol, q]))

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary p-2">
          <img src="/watchlist.svg" alt="" aria-hidden="true" className="h-full w-full invert" />
        </div>
        <span className="font-sans text-xl font-black tracking-[-0.04em] text-foreground">WatchTile</span>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        {INDICES.map((idx) => (
          <IndexPill key={idx.symbol} label={idx.label} quote={bySymbol.get(idx.symbol)} />
        ))}
        <div className="h-6 w-px bg-border" />
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--neutral)] text-sm font-bold text-black">
          AK
        </div>
      </div>
    </header>
  )
}
