'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { getShareableLink, authenticateShareableLink } from '@/lib/api'

export default function SharedExpensePage() {
  const params = useParams()
  const { data: session } = useSession()
  const linkId = params.linkId as string

  const [linkData, setLinkData] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (linkId) {
      fetchLinkData()
    }
  }, [linkId, session])

  const fetchLinkData = async () => {
    try {
      setIsLoading(true)
      const data = await getShareableLink(linkId)
      setLinkData(data)
      if (!data.requiresPassword) {
        await authenticate()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link not found')
    } finally {
      setIsLoading(false)
    }
  }

  const authenticate = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const data = await authenticateShareableLink(linkId, password)
      setIsAuthenticated(true)
      setLinkData((prev) => (prev ? { ...prev, resource: data.resource } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await authenticate()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-foreground text-background flex items-center justify-center">
        <p className="text-background/50">loading...</p>
      </div>
    )
  }

  if (error && !linkData) {
    return (
      <div className="min-h-screen bg-foreground text-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-background mb-4">{error}</p>
          <Link href="/" className="text-background/70 hover:text-background transition-colors">
            go home
          </Link>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && linkData?.requiresPassword) {
    return (
      <div className="min-h-screen bg-foreground text-background flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-background bg-foreground p-8">
          <h2 className="text-2xl font-bold text-background mb-6">access shared expense</h2>
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-background/50 mb-2">password</h3>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                placeholder="enter password"
              />
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background text-center"
              >
                cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
              >
                {isSubmitting ? 'authenticating...' : 'access'}
              </button>
            </div>
          </form>
          {!session && (
            <div className="mt-6 pt-6 border-t border-background/20">
              <p className="text-sm text-background/50 mb-3">or sign in if you're a friend</p>
              <Link
                href={`/auth/signin?callbackUrl=/share/${linkId}`}
                className="block w-full border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background text-center"
              >
                sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isAuthenticated && linkData?.resource) {
    const resource = linkData.resource
    return (
      <div className="min-h-screen bg-foreground text-background">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-8">
            <Link href="/" className="text-xl font-bold tracking-tight text-background">
              split
            </Link>
          </div>

          <div className="border border-background/20 p-8">
            <h1 className="text-3xl font-bold text-background mb-6">{resource.name}</h1>
            
            {linkData.resourceType === 'expense' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-background/50 mb-1">amount</p>
                  <p className="text-2xl font-bold text-background">₱{resource.amount.toFixed(2)}</p>
                </div>
                {resource.date && (
                  <div>
                    <p className="text-sm text-background/50 mb-1">date</p>
                    <p className="text-lg text-background">{new Date(resource.date).toLocaleDateString()}</p>
                  </div>
                )}
                {resource.category && (
                  <div>
                    <p className="text-sm text-background/50 mb-1">category</p>
                    <p className="text-lg text-background capitalize">{resource.category}</p>
                  </div>
                )}
                {resource.paidBy && (
                  <div>
                    <p className="text-sm text-background/50 mb-1">paid by</p>
                    <p className="text-lg text-background">{resource.paidBy}</p>
                  </div>
                )}
                {resource.splitWith && resource.splitWith.length > 0 && (
                  <div>
                    <p className="text-sm text-background/50 mb-1">split with</p>
                    <p className="text-lg text-background">{resource.splitWith.join(', ')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-background/50 mb-1">amount</p>
                  <p className="text-2xl font-bold text-background">₱{resource.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-background/50 mb-1">frequency</p>
                  <p className="text-lg text-background">{resource.frequency}</p>
                </div>
                {resource.category && (
                  <div>
                    <p className="text-sm text-background/50 mb-1">category</p>
                    <p className="text-lg text-background capitalize">{resource.category}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-background/20">
              <p className="text-sm text-background/50 mb-4">this is a shared expense. you can view it but cannot edit it here.</p>
              <Link
                href="/"
                className="inline-block border-2 border-background/30 py-2 px-6 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
              >
                go to calculator
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}




