"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Search, Plus, Check } from "lucide-react"
import type { SearchResult } from "@/lib/yahoo"
import { SUGGESTED_SYMBOLS } from "@/lib/watchlists"
import { StockLogo } from "./stock-logo"
import { Modal } from "./modal"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type AddStockDialogProps = {
  open: boolean
  onClose: () => void
  existing: string[]
  onAdd: (symbols: string[]) => void
}

export function AddStockDialog({ open, onClose, existing, onAdd }: AddStockDialogProps) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setDebounced("")
      setPicked(new Set())
    }
  }, [open])

  const { data, isLoading } = useSWR<{ results: SearchResult[] }>(
    debounced.length >= 1 ? `/api/search?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
  )

  const results: SearchResult[] =
    debounced.length >= 1
      ? (data?.results ?? [])
      : SUGGESTED_SYMBOLS.map((s) => ({ symbol: s.symbol, name: s.name, exchange: "NSE", type: "EQUITY" }))

  const toggle = (symbol: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  const handleAdd = () => {
    if (picked.size === 0) return
    onAdd([...picked])
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add stocks">
      <div className="flex items-center gap-2 rounded-md border border-border bg-input/40 px-3 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks e.g. TATA, INFY, HDFC..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <p className="mt-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {debounced.length >= 1 ? "Search results" : "Popular stocks"}
      </p>

      <div className="max-h-72 space-y-1 overflow-y-auto">
        {isLoading && debounced.length >= 1 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>
        )}
        {!isLoading && results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No matches found.</p>
        )}
        {results.map((r) => {
          const alreadyIn = existing.includes(r.symbol)
          const isPicked = picked.has(r.symbol)
          return (
            <button
              key={r.symbol}
              type="button"
              disabled={alreadyIn}
              onClick={() => toggle(r.symbol)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition ${
                alreadyIn ? "cursor-not-allowed opacity-40" : "hover:bg-muted"
              } ${isPicked ? "bg-primary/10" : ""}`}
            >
              <StockLogo symbol={r.symbol} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.symbol}
                  {r.exchange ? ` · ${r.exchange}` : ""}
                </p>
              </div>
              {alreadyIn ? (
                <span className="text-[10px] uppercase text-muted-foreground">Added</span>
              ) : isPicked ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-[11px] text-muted-foreground">
          {picked.size} selected
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={picked.size === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add {picked.size > 0 ? `(${picked.size})` : ""}
        </button>
      </div>
    </Modal>
  )
}
