'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('[SessionProvider] Component mounted')
    
    // Check for session token cookie
    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find(c => c.trim().startsWith('next-auth.session-token'))
    console.log('[SessionProvider] Session cookie found:', !!sessionCookie)
    if (sessionCookie) {
      console.log('[SessionProvider] Session cookie value (first 30 chars):', sessionCookie.substring(0, 30))
    }
  }, [])
  
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  )
}

