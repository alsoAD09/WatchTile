"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Search, Plus, ListPlus, Trash2 } from "lucide-react"
import type { Quote } from "@/lib/yahoo"
import { DEFAULT_WATCHLISTS, type Watchlist } from "@/lib/watchlists"
import { sentimentOf, type Sentiment } from "@/lib/format"
import { Header } from "./header"
import { StockTable } from "./stock-table"
import { StockDetailPanel } from "./stock-detail-panel"
import { AddStockDialog } from "./add-stock-dialog"
import { CreateWatchlistDialog } from "./create-watchlist-dialog"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const patternsFetcher = async ([url, syms]: readonly [string, string]) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: syms.split(",") }),
  })
  if (!res.ok) throw new Error("pattern detection failed")
  return (await res.json()) as { patterns: Record<string, { pattern: string; sentiment: string }> }
}

type Filter = "all" | Sentiment

export function Dashboard() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(DEFAULT_WATCHLISTS)
  const [activeId, setActiveId] = useState(DEFAULT_WATCHLISTS[0].id)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string | null>("TATASTEEL.NS")
  const [visitId, setVisitId] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const active = watchlists.find((w) => w.id === activeId) ?? watchlists[0]
  const symbols = active?.symbols ?? []

  // Poll every second with the live quotes for the active watchlist.
  const { data } = useSWR<{ quotes: Quote[] }>(
    symbols.length ? `/api/quote?symbols=${symbols.join(",")}` : null,
    fetcher,
    { refreshInterval: 1000, keepPreviousData: true },
  )

  const quoteMap = useMemo(
    () => new Map((data?.quotes ?? []).map((q) => [q.symbol, q])),
    [data],
  )

  // Re-detect candlestick patterns on the same one-second cadence as the
  // price ticker, so the trend badge above each sparkline always reflects
  // the latest dashboard update.
  const { data: patternData } = useSWR(
    symbols.length ? (["/api/detect-patterns", symbols.join(",")] as const) : null,
    patternsFetcher,
    { refreshInterval: 1000, keepPreviousData: true, revalidateOnFocus: false },
  )

  const patternMap = useMemo(
    () => new Map(Object.entries(patternData?.patterns ?? {})),
    [patternData],
  )

  const counts = useMemo(() => {
    let bull = 0
    let bear = 0
    let neutral = 0
    for (const s of symbols) {
      const q = quoteMap.get(s)
      if (!q) continue
      const sent = sentimentOf(q.changePercent)
      if (sent === "bull") bull++
      else if (sent === "bear") bear++
      else neutral++
    }
    return { bull, bear, neutral }
  }, [symbols, quoteMap])

  const visibleSymbols = useMemo(() => {
    return symbols.filter((s) => {
      const q = quoteMap.get(s)
      if (search.trim()) {
        const needle = search.trim().toLowerCase()
        const hay = `${s} ${q?.name ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (filter === "all") return true
      if (!q) return false
      return sentimentOf(q.changePercent) === filter
    })
  }, [symbols, quoteMap, filter, search])

  // Selecting a stock counts as a "visit" — bumping this id forces a fresh
  // analyze-shift call even when re-selecting the same stock, while the
  // panel otherwise stays on whatever it last fetched.
  const handleSelect = (symbol: string) => {
    setSelected(symbol)
    setVisitId((id) => id + 1)
  }

  const updateActive = (updater: (w: Watchlist) => Watchlist) => {
    setWatchlists((prev) => prev.map((w) => (w.id === activeId ? updater(w) : w)))
  }

  const handleAdd = (newSymbols: string[]) => {
    updateActive((w) => ({
      ...w,
      symbols: [...w.symbols, ...newSymbols.filter((s) => !w.symbols.includes(s))],
    }))
  }

  const handleDelete = (symbol: string) => {
    updateActive((w) => ({ ...w, symbols: w.symbols.filter((s) => s !== symbol) }))
    if (selected === symbol) setSelected(null)
  }

  const handleCreate = (name: string) => {
    const id = `wl-${Date.now()}`
    setWatchlists((prev) => [...prev, { id, name: name.toUpperCase(), symbols: [] }])
    setActiveId(id)
    setSelected(null)
  }

  const handleDeleteWatchlist = (watchlist: Watchlist) => {
    if (watchlists.length === 1) {
      window.alert("Keep at least one watchlist in your workspace.")
      return
    }

    const confirmed = window.confirm(`Delete the ${watchlist.name} watchlist? This cannot be undone.`)
    if (!confirmed) return

    setWatchlists((prev) => prev.filter((item) => item.id !== watchlist.id))
    if (watchlist.id === activeId) {
      const nextWatchlist = watchlists.find((item) => item.id !== watchlist.id)
      setActiveId(nextWatchlist?.id ?? "")
      setSelected(null)
      setFilter("all")
      setSearch("")
    }
  }

  const chips: { key: Filter; label: string; count: number; dot: string }[] = [
    { key: "all", label: "ALL", count: symbols.length, dot: "var(--muted-foreground)" },
    { key: "bull", label: "BULLISH", count: counts.bull, dot: "var(--bull)" },
    { key: "bear", label: "BEARISH", count: counts.bear, dot: "var(--bear)" },
    { key: "neutral", label: "NEUTRAL", count: counts.neutral, dot: "var(--neutral)" },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
          {/* Watchlist tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            {watchlists.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setActiveId(w.id)
                  setFilter("all")
                }}
                className={`relative flex items-center gap-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wider transition ${
                  w.id === activeId ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.id === activeId && <span className="h-2 w-2 rounded-[2px] bg-primary" />}
                {w.name}
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular">
                  {String(w.symbols.length).padStart(2, "0")}
                </span>
                <span className="flex items-center gap-1.5">
                  {w.id === activeId && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" aria-hidden />
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${w.name} watchlist`}
                    title={`Delete ${w.name} watchlist`}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDeleteWatchlist(w)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        event.stopPropagation()
                        handleDeleteWatchlist(w)
                      }
                    }}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 data-icon="inline-start" />
                  </span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="ml-2 flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground transition hover:bg-muted"
            >
              <ListPlus className="h-3.5 w-3.5" />
              Watchlist
            </button>
          </div>

          {/* Search watchlist */}
          <div className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search watchlist..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Filters + add */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilter(c.key)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition ${
                    filter === c.key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: c.dot }} />
                  {c.label} ({c.count})
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wider text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Stocks
            </button>
          </div>

          <StockTable
            symbols={visibleSymbols}
            quotes={quoteMap}
            patterns={patternMap}
            selected={selected}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </main>

        <StockDetailPanel
          symbol={selected}
          visitId={visitId}
          quote={selected ? quoteMap.get(selected) : undefined}
          onClose={() => setSelected(null)}
        />
      </div>

      <AddStockDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existing={symbols}
        onAdd={handleAdd}
      />
      <CreateWatchlistDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
