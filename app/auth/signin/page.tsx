'use client'

import React, { useState } from "react"
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignIn() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        setIsLoading(false)
      } else {
        router.push(callbackUrl)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl, redirect: true })
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

          <form onSubmit={handleEmailSignIn} className="mt-12 space-y-6">
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

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground"
            >
              {isLoading ? 'signing in...' : 'sign in'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 border-t border-background/20"></div>
            <span className="text-sm text-background/50">or</span>
            <div className="flex-1 border-t border-background/20"></div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              className="w-full border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              continue with google
            </button>
          </div>

          <div className="mt-12">
            <p className="text-center text-sm text-background/70">
              don't have an account?{' '}
              <Link href="/auth/signup" className="text-background/70 transition-colors hover:text-background">
                sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
