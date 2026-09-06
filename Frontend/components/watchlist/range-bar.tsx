type RangeBarProps = {
  low: number
  high: number
  current: number
}

export function RangeBar({ low, high, current }: RangeBarProps) {
  const range = high - low || 1
  const pct = Math.min(100, Math.max(0, ((current - low) / range) * 100))

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground tabular">52L</span>
      <div className="relative h-[3px] flex-1 rounded-full bg-muted">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border-2 border-background bg-foreground"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular">52H</span>
    </div>
  )
}
