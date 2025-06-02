'use client'

export function ErrorBanner({
  error,
  onDismiss,
}: {
  error: string | null
  onDismiss: () => void
}) {
  if (!error) return null
  return (
    <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-500 rounded">
      <p className="text-sm font-medium">{error}</p>
      <button
        onClick={onDismiss}
        className="mt-2 text-xs text-red-500/70 hover:text-red-500"
      >
        dismiss
      </button>
    </div>
  )
}
