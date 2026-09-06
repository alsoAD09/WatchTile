import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Public_Sans, Noto_Sans } from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
})

// Self-hosted fallback that includes the ₹ (Indian Rupee) glyph.
const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto',
})

export const metadata: Metadata = {
  title: 'WatchTile — Watchlist',
  description: 'Live stock market watchlist with real-time Yahoo Finance data.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0c0f16',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${publicSans.variable} ${notoSans.variable} bg-background`}>
      <body className="font-mono antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
