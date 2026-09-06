"use client"

import useSWR from "swr"
import { X, ArrowUpRight, ArrowDownRight } from "lucide-react"
import type { Quote } from "@/lib/yahoo"
import { deriveTicker } from "@/lib/watchlists"
import { formatPrice, formatSigned } from "@/lib/format"
import { StockLogo } from "./stock-logo"

type StockDetailPanelProps = {
  symbol: string | null
  visitId: number
  quote?: Quote
  onClose: () => void
}

type ShiftMetric = { label: string; value: string; sub_value: string }
type ShiftEvent = { title: string; timestamp_label: string; description: string }
type ShiftResponse = {
  events_section_header: string
  numerical_changes: ShiftMetric[]
  events: ShiftEvent[]
}

function toneFromValue(value: string): "bull" | "bear" | "default" {
  const trimmed = value.trim()
  if (trimmed.startsWith("+")) return "bull"
  if (trimmed.startsWith("-")) return "bear"
  return "default"
}

const shiftFetcher = async ([url, sym]: readonly [string, string]) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: sym, unitsHeld: 5 }),
  })
  if (!res.ok) throw new Error("shift analysis failed")
  return (await res.json()) as ShiftResponse
}

export function StockDetailPanel({ symbol, visitId, quote, onClose }: StockDetailPanelProps) {
  // Fetches the "meaningful shift" summary from the analyze-shift API
  // exactly once per visit: the visitId in the key changes every time the
  // user clicks a stock (including re-clicking the same one), which forces
  // SWR to treat it as a fresh cache entry and refetch. There is no
  // refreshInterval, so it does not poll while the panel stays open.
  const { data: shift, isLoading: shiftLoading } = useSWR(
    symbol ? (["/api/analyze-shift", symbol, visitId] as const) : null,
    shiftFetcher,
    { revalidateOnFocus: false, revalidateIfStale: false, revalidateOnReconnect: false },
  )

  if (!symbol) {
    return (
      <aside className="hidden w-[360px] shrink-0 flex-col items-center justify-center border-l border-border p-8 text-center lg:flex">
        <p className="text-sm text-muted-foreground text-pretty">
          Select a stock from your watchlist to see live meaningful changes.
        </p>
      </aside>
    )
  }

  const positive = (quote?.changePercent ?? 0) >= 0

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-border">
      <div className="flex items-start justify-between border-b border-border p-5">
        <div className="flex items-center gap-3">
          <StockLogo symbol={symbol} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">{quote?.name ?? deriveTicker(symbol)}</h2>
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {quote?.exchange || "NSE"}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">TICKER: {deriveTicker(symbol)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-baseline justify-between border-b border-border p-5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current price</p>
          <p className="mt-1 tabular text-2xl font-semibold text-foreground">
            {quote ? formatPrice(quote.price, quote.currency) : "—"}
          </p>
        </div>
        {quote && (
          <span
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm tabular"
            style={{
              color: positive ? "var(--bull)" : "var(--bear)",
              backgroundColor: positive ? "oklch(0.75 0.17 158 / 0.12)" : "oklch(0.66 0.19 28 / 0.12)",
            }}
          >
            {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {formatSigned(quote.change)} ({formatSigned(quote.changePercent)}%)
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-[2px] bg-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Meaningful Shift Since Visit
            </h3>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Delta: 48H</span>
        </div>

        {!quote || shiftLoading ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 animate-pulse rounded-lg bg-muted/30" />
            <div className="h-16 animate-pulse rounded-lg bg-muted/30" />
          </div>
        ) : shift?.numerical_changes?.length ? (
          <div className="grid grid-cols-2 gap-2">
            {shift.numerical_changes.map((metric) => {
              const tone = toneFromValue(metric.value)
              const color =
                tone === "bull" ? "var(--bull)" : tone === "bear" ? "var(--bear)" : "var(--foreground)"
              return (
                <div key={metric.label} className="rounded-lg border border-border bg-card/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                  <p className="mt-1.5 tabular text-base font-semibold" style={{ color }}>
                    {metric.value} <span className="text-xs font-normal">{metric.sub_value}</span>
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">Shift analysis unavailable right now.</p>
        )}

        {shift?.events?.length ? (
          <div className="mt-6">
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground">
              {shift.events_section_header}
            </h4>
            <div className="flex flex-col gap-2">
              {shift.events.map((event, index) => (
                <div key={`${event.title}-${index}`} className="rounded-md border border-border bg-card/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-foreground">{event.title}</p>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {event.timestamp_label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground text-pretty">
                    {event.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
