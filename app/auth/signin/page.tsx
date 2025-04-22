'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      if (email === 'test@example.com' && password === 'password') {
        sessionStorage.setItem('user', JSON.stringify({ email, name: 'Test User', id: '1' }))
        router.push('/calculator')
      } else {
        alert('Invalid credentials. Use test@example.com / password')
        setIsLoading(false)
      }
    }, 500)
  }

  return (
    <main className="min-h-screen bg-foreground">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-background">
          split
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/auth/signup" className="text-sm text-background/70 transition-colors hover:text-background">
            sign up
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl">
            sign in
          </h1>

          <form onSubmit={handleSubmit} className="mt-12 space-y-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground"
            >
              {isLoading ? 'signing in...' : 'sign in'}
            </button>
          </form>

          <div className="mt-12">
            <p className="text-center text-sm text-background/70">
              don't have an account?{' '}
              <Link href="/auth/signup" className="text-background/70 transition-colors hover:text-background">
                sign up
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-sm text-background/40">
            demo: test@example.com / password
          </p>
        </div>
      </div>
    </main>
  )
}
