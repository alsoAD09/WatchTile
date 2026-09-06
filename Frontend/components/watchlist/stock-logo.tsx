import { badgeColor, shortLabel } from "@/lib/watchlists"

type StockLogoProps = {
  symbol: string
  size?: number
}

export function StockLogo({ symbol, size = 40 }: StockLogoProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: badgeColor(symbol),
        fontSize: size <= 28 ? 9 : 11,
      }}
      aria-hidden
    >
      {shortLabel(symbol)}
    </div>
  )
}
