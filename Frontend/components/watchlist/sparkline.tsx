"use client"

import { useId } from "react"

type SparklineProps = {
  data: number[]
  positive: boolean
  width?: number
  height?: number
}

export function Sparkline({ data, positive, width = 150, height = 56 }: SparklineProps) {
  const gradientId = useId()
  const padding = 4

  if (!data || data.length < 2) {
    return <div style={{ width, height }} aria-hidden />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = (width - padding * 2) / (data.length - 1)

  const points = data.map((value, i) => {
    const x = padding + i * stepX
    const y = padding + (1 - (value - min) / range) * (height - padding * 2)
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
  const area = `${line} L${points[points.length - 1][0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`

  const stroke = positive ? "var(--bull)" : "var(--bear)"

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={positive ? "Upward price trend" : "Downward price trend"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
