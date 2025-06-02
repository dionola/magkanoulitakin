'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { deleteAccount } from '@/lib/api'

export default function SettingsPage() {
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') {
      setError('please type "delete" to confirm')
      return
    }
    setIsDeleting(true)
    setError(null)
    try {
      await deleteAccount()
      await signOut({ callbackUrl: '/auth/signin' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-foreground">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl mb-2">settings</h1>
          <p className="text-sm text-background/50 font-medium">manage your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-500 rounded text-sm">
            {error}
          </div>
        )}

        {/* Delete Account */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Trash2 className="h-5 w-5 text-background" />
            <h2 className="text-2xl font-bold text-background">delete account</h2>
          </div>

          {!showDeleteAccount ? (
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="border-2 border-red-500/50 py-3 px-6 text-base font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-background"
            >
              delete account
            </button>
          ) : (
            <div className="space-y-6 max-w-md">
              <p className="text-sm text-background/70">
                this action cannot be undone. type "delete" to confirm.
              </p>
              <div>
                <input
                  type="text"
                  placeholder="type 'delete' to confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAccount(false)
                    setDeleteConfirm('')
                  }}
                  className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                >
                  cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 border-2 border-red-500/50 py-3 text-base font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-background disabled:opacity-50"
                >
                  {isDeleting ? 'deleting...' : 'delete account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
