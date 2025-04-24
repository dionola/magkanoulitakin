'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Home, Settings, LogOut, Menu, X, Users } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/history', label: 'History', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const NavContent = () => (
    <>
      <div className="flex items-center justify-between border-b border-background/20 px-6 py-5 lg:justify-center">
        <Link href="/" className="text-xl font-bold tracking-tight text-background hover:opacity-70 transition">
          split
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-2 text-background/40 transition-colors hover:text-background"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'font-medium text-background'
                  : 'text-background/70 hover:text-background'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label.toLowerCase()}</span>
            </Link>
          )
        })}
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-background/20 px-4 py-6">
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <div className="flex-1 min-w-0">
            {session?.user && (
              <>
                <p className="truncate text-xs font-medium text-background">{session.user.name}</p>
                <p className="truncate text-xs text-background/50">{session.user.email}</p>
              </>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-background/40 transition-colors hover:text-background">
                <Menu className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-foreground border border-background/20">
              <DropdownMenuItem asChild className="text-background">
                <Link href="/dashboard/settings">settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-background">
                <LogOut className="mr-2 h-4 w-4" />
                logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-4 z-50 lg:hidden p-2 text-background/40 transition-colors hover:text-background"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 z-50 w-64 bg-foreground border-r border-background/20"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </div>
          <div className="absolute inset-0 bg-black/80" />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 flex-col border-r border-background/20 bg-foreground relative">
        <NavContent />
      </div>
    </>
  )
}
