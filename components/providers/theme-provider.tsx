'use client'

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  )
}

export function useTheme() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useNextTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const darkMode = mounted ? resolvedTheme !== 'light' : true

  return {
    darkMode,
    toggleDarkMode: () => setTheme(darkMode ? 'light' : 'dark'),
  }
}
