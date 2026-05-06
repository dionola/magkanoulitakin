import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: "Magkano Ulitakin",
  description: "Split group expenses without the awkward math.",
  metadataBase: new URL("https://magkanoulitakin.com"),
  openGraph: {
    title: "Magkano Ulitakin",
    description: "Split group expenses without the awkward math.",
    url: "https://magkanoulitakin.com",
    siteName: "Magkano Ulitakin",
    images: [{ url: "https://ejyic7eskr7jje45.public.blob.vercel-storage.com/magkanoulitakin-thumbnail.png", width:
1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Magkano Ulitakin",
    description: "Split group expenses without the awkward math.",
    images: ["https://ejyic7eskr7jje45.public.blob.vercel-storage.com/magkanoulitakin-thumbnail.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <SessionProvider>
              {children}
            </SessionProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
