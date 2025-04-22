'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      sessionStorage.setItem('user', JSON.stringify({ email, name, id: Math.random().toString() }))
      router.push('/calculator')
    }, 500)
  }

  return (
    <main className="min-h-screen bg-foreground">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-background">
          split
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/auth/signin" className="text-sm text-background/70 transition-colors hover:text-background">
            sign in
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl">
            sign up
          </h1>

          <form onSubmit={handleSubmit} className="mt-12 space-y-6">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="john doe"
                required
                className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
              />
            </div>

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

            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? 'creating account...' : 'sign up'}
            </button>
          </form>

          <div className="mt-12">
            <p className="text-center text-sm text-background/70">
              already have an account?{' '}
              <Link href="/auth/signin" className="text-background/70 transition-colors hover:text-background">
                sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
