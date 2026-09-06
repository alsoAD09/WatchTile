"use client"

import { X, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { Quote } from "@/lib/yahoo"
import { deriveTicker } from "@/lib/watchlists"
import { formatPrice, formatSigned, sentimentFromLabel, type Sentiment } from "@/lib/format"
import { Sparkline } from "./sparkline"
import { RangeBar } from "./range-bar"
import { StockLogo } from "./stock-logo"

type PatternInfo = { pattern: string; sentiment: string }

type StockTableProps = {
  symbols: string[]
  quotes: Map<string, Quote>
  patterns?: Map<string, PatternInfo>
  selected: string | null
  onSelect: (symbol: string) => void
  onDelete: (symbol: string) => void
}

function PatternBadge({ info }: { info: PatternInfo }) {
  const sentiment: Sentiment = sentimentFromLabel(info.sentiment)
  const color = sentiment === "bull" ? "var(--bull)" : sentiment === "bear" ? "var(--bear)" : "var(--neutral)"
  const Icon = sentiment === "bull" ? TrendingUp : sentiment === "bear" ? TrendingDown : Minus

  return (
    <span
      className="inline-flex w-fit items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
      style={{ borderColor: color, color }}
    >
      <Icon className="h-2.5 w-2.5" />
      {info.pattern}
    </span>
  )
}

export function StockTable({ symbols, quotes, patterns, selected, onSelect, onDelete }: StockTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-[minmax(150px,1.6fr)_minmax(120px,1.4fr)_100px_110px_minmax(120px,1.4fr)] items-center gap-3 border-b border-border bg-card/40 px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Company ({symbols.length})</span>
        <span>Trend &amp; Pattern Signal</span>
        <span className="text-right">Mkt Price</span>
        <span className="text-right">1D Change</span>
        <span>52W Performance</span>
      </div>

      {symbols.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No stocks yet. Use ADD STOCKS to build this watchlist.
        </div>
      )}

      {symbols.map((symbol) => {
        const q = quotes.get(symbol)
        const pattern = patterns?.get(symbol)
        const positive = (q?.changePercent ?? 0) >= 0
        const isSelected = selected === symbol
        const color = positive ? "var(--bull)" : "var(--bear)"

        return (
          <div
            key={symbol}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(symbol)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelect(symbol)
              }
            }}
            className={`group relative grid cursor-pointer grid-cols-[minmax(150px,1.6fr)_minmax(120px,1.4fr)_100px_110px_minmax(120px,1.4fr)] items-center gap-3 border-b border-border/60 px-4 py-4 transition-colors last:border-b-0 hover:bg-card/50 ${
              isSelected ? "bg-card/70" : ""
            }`}
          >
            {isSelected && <span className="absolute left-0 top-0 h-full w-0.5 bg-primary" aria-hidden />}

            <div className="flex items-center gap-3">
              <StockLogo symbol={symbol} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {q?.name ?? deriveTicker(symbol)}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{symbol}</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-1">
              {pattern && <PatternBadge info={pattern} />}
              {q ? (
                <Sparkline data={q.spark} positive={positive} />
              ) : (
                <div className="h-14 w-[150px] animate-pulse rounded bg-muted/40" />
              )}
            </div>

            <div className="text-right tabular text-sm text-foreground">
              {q ? formatPrice(q.price, q.currency) : "—"}
            </div>

            <div className="text-right tabular text-sm" style={{ color }}>
              {q ? (
                <>
                  <div>{formatSigned(q.change)}</div>
                  <div className="text-[11px]">({formatSigned(q.changePercent)}%)</div>
                </>
              ) : (
                "—"
              )}
            </div>

            <div className="flex items-center gap-2">
              {q ? (
                <div className="flex-1">
                  <RangeBar low={q.fiftyTwoWeekLow} high={q.fiftyTwoWeekHigh} current={q.price} />
                </div>
              ) : (
                <div className="h-1 flex-1 rounded bg-muted/40" />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(symbol)
                }}
                aria-label={`Remove ${deriveTicker(symbol)} from watchlist`}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-[var(--bear)]/15 hover:text-[var(--bear)] group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
