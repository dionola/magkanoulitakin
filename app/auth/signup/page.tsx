'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { User, Mail, Lock } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { Spinner } from '@/components/ui/spinner'

const inputClass = "flex-1 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:outline-none"

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleSignUp = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard', redirect: true })
    } catch {
      setError('Failed to sign up with Google. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError('passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (response.ok) {
        const signInResult = await signIn('credentials', { email, password, redirect: false })
        if (signInResult?.ok) {
          router.push('/dashboard')
        } else {
          router.push('/auth/signin')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create account')
        setIsLoading(false)
      }
    } catch {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <SiteHeader />

      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-16">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            sign up
          </h1>

          <form onSubmit={handleSubmit} className="mt-12 space-y-6">
            <div className="flex items-end gap-3 border-b-2 border-foreground/30 focus-within:border-foreground transition-colors">
              <User className="h-5 w-5 text-foreground/40 mb-3 shrink-0" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="john doe"
                required
                className={inputClass}
              />
            </div>

            <div className="flex items-end gap-3 border-b-2 border-foreground/30 focus-within:border-foreground transition-colors">
              <Mail className="h-5 w-5 text-foreground/40 mb-3 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>

            <div className="flex items-end gap-3 border-b-2 border-foreground/30 focus-within:border-foreground transition-colors">
              <Lock className="h-5 w-5 text-foreground/40 mb-3 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                required
                className={inputClass}
              />
            </div>

            <div className="flex items-end gap-3 border-b-2 border-foreground/30 focus-within:border-foreground transition-colors">
              <Lock className="h-5 w-5 text-foreground/40 mb-3 shrink-0" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="confirm password"
                required
                className={inputClass}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-60 flex items-center justify-center"
            >
              {isLoading ? <Spinner /> : 'sign up'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 border-t border-foreground/20"></div>
            <span className="text-sm text-foreground/50">or</span>
            <div className="flex-1 border-t border-foreground/20"></div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignUp}
              className="w-full border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              sign up with google
            </button>
          </div>

          <div className="mt-12">
            <p className="text-center text-sm text-foreground/70">
              already have an account?{' '}
              <Link href="/auth/signin" className="text-foreground/70 transition-colors hover:text-foreground">
                sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
