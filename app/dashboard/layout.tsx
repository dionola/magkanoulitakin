import React from "react"
import { Sidebar } from '@/components/dashboard/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-foreground">
        {children}
      </main>
    </div>
  )
}
