'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Moon, Sun, LogOut, Menu, X } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from '@/components/providers/theme-provider'

interface SiteHeaderProps {
  children?: React.ReactNode
  sticky?: boolean
}

export function SiteHeader({ children, sticky = false }: SiteHeaderProps) {
  const { darkMode, toggleDarkMode } = useTheme()
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated' && !!session
  const isAuthLoading = status === 'loading'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className={`border-b border-foreground/20 bg-background text-foreground${sticky ? ' sticky top-0 z-50' : ''}`}>
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-foreground hover:opacity-70 transition">
            magkanoulitakin
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            {children}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-foreground/70 hover:text-foreground transition"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {!isAuthLoading && (isLoggedIn ? (
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="flex items-center gap-2 font-bold text-base hover:opacity-70 transition"
                title="logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <>
                <Link href="/auth/signin" className="font-bold text-base hover:opacity-70 transition">
                  sign in
                </Link>
                <span className="text-foreground/30">/</span>
                <Link href="/auth/signup" className="font-bold text-base hover:opacity-70 transition">
                  sign up
                </Link>
              </>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-foreground/70 hover:text-foreground transition"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />

          {/* Sidebar panel */}
          <div className="relative ml-auto w-72 h-full bg-background text-foreground flex flex-col shadow-xl overflow-visible">
            <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/20">
              <span className="text-xl font-bold">menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-foreground/70 hover:text-foreground transition"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col py-6 flex-1 overflow-visible">
              {children && (
                <div className="relative z-10 px-6 py-3">
                  {children}
                </div>
              )}

              <button
                onClick={toggleDarkMode}
                className="px-6 py-3 text-base font-bold text-foreground hover:opacity-70 transition text-left"
              >
                {darkMode ? 'light mode' : 'dark mode'}
              </button>

              {!isAuthLoading && (isLoggedIn ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="px-6 py-3 text-base font-bold text-foreground hover:opacity-70 transition text-left"
                >
                  logout
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="block px-6 py-3 font-bold text-base text-foreground hover:opacity-70 transition"
                  >
                    sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block px-6 py-3 font-bold text-base text-foreground hover:opacity-70 transition"
                  >
                    sign up
                  </Link>
                </>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
