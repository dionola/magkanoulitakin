'use client'

import React from "react"
import { useSession, signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className="min-h-screen bg-foreground">
      <header className="sticky top-0 z-50 border-b border-background/20 bg-foreground">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/calculator" className="text-xl font-bold tracking-tight text-background hover:opacity-70 transition">
            split
          </Link>
          {session?.user && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-background">{session.user.name}</p>
                <p className="text-xs text-background/50">{session.user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-background/70 transition-colors hover:text-background"
                title="logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="bg-foreground">
        {children}
      </main>
    </div>
  )
}
