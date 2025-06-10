'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type ThemeContextType = {
  darkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: true,
  toggleDarkMode: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) setDarkMode(saved !== 'false')
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode: () => setDarkMode(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
