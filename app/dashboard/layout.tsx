'use client'

import React from "react"
import { useSession, signOut } from 'next-auth/react'
import { LogOut, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/components/providers/theme-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const { darkMode, toggleDarkMode } = useTheme()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-foreground/20 bg-background">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/calculator" className="text-xl font-bold tracking-tight text-foreground hover:opacity-70 transition">
            magkanoulitakin
          </Link>
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{session.user.name}</p>
                <p className="text-xs text-foreground/50">{session.user.email}</p>
              </div>
            )}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-foreground/70 transition-colors hover:text-foreground"
              title="toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-foreground/70 transition-colors hover:text-foreground"
              title="logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="bg-background">
        {children}
      </main>
    </div>
  )
}
