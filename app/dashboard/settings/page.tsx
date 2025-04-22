'use client'

import { useState } from 'react'
import { Shield, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const handleChangePassword = () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('new passwords do not match')
      return
    }
    if (passwordData.new.length < 8) {
      alert('password must be at least 8 characters')
      return
    }
    // Handle password change
    alert('password changed successfully')
    setShowChangePassword(false)
    setPasswordData({ current: '', new: '', confirm: '' })
  }

  const handleDeleteAccount = () => {
    if (deleteConfirm.toLowerCase() !== 'delete') {
      alert('please type "delete" to confirm')
      return
    }
    // Handle account deletion
    sessionStorage.removeItem('user')
    router.push('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-foreground">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl mb-2">settings</h1>
          <p className="text-sm text-background/50 font-medium">manage your account</p>
        </div>

        {/* Link to Calculator */}
        <div className="mb-12 border-b border-background/20 pb-8">
          <Link
            href="/calculator"
            className="text-sm text-background/70 transition-colors hover:text-background inline-block"
          >
            ← add expenses
          </Link>
        </div>

        {/* Change Password */}
        <div className="mb-12 border-b border-background/20 pb-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-background" />
            <h2 className="text-2xl font-bold text-background">change password</h2>
          </div>

          {!showChangePassword ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="border-2 border-background py-3 px-6 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground"
            >
              change password
            </button>
          ) : (
            <div className="space-y-6 max-w-md">
              <div>
                <input
                  type="password"
                  placeholder="current password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="new password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="confirm new password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowChangePassword(false)
                    setPasswordData({ current: '', new: '', confirm: '' })
                  }}
                  className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                >
                  cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground"
                >
                  save
                </button>
              </div>
            </div>
          )}
        </div>

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
                  className="flex-1 border-2 border-red-500/50 py-3 text-base font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-background"
                >
                  delete account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
