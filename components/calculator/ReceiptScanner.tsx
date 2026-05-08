'use client'

import { useRef, useState } from 'react'
import { ScanLine, X, Check, Camera } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface ReceiptItem {
  name: string
  amount: number
}

interface ReceiptScannerProps {
  currency: string
  onAddItems: (items: ReceiptItem[]) => void
}

export function ReceiptScanner({ currency, onAddItems }: ReceiptScannerProps) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setItems([])
    setSelected(new Set())
    setError('')
  }

  const handleFile = async (file: File) => {
    setScanning(true)
    setError('')
    setItems([])
    setSelected(new Set())

    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/ocr', { method: 'POST', body: form })
      const data = await res.json() as { items?: ReceiptItem[]; error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to scan receipt')
        return
      }

      const parsed = (data.items ?? []).filter(i => i.name && typeof i.amount === 'number')
      setItems(parsed)
      setSelected(new Set(parsed.map((_, i) => i)))
    } catch {
      setError('Failed to scan receipt')
    } finally {
      setScanning(false)
    }
  }

  const toggleItem = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleAdd = () => {
    const toAdd = items.filter((_, i) => selected.has(i))
    if (toAdd.length === 0) return
    onAddItems(toAdd)
    setOpen(false)
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition"
        title="Scan receipt"
      >
        <ScanLine className="h-4 w-4" />
        Scan Receipt
      </button>
    )
  }

  return (
    <div className="border border-foreground/20 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">Receipt Scanner</span>
        <button
          type="button"
          onClick={() => { setOpen(false); reset() }}
          className="text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {items.length === 0 && !scanning && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-foreground/20 rounded-lg flex flex-col items-center gap-2 hover:border-foreground/40 transition text-muted-foreground hover:text-foreground"
          >
            <Camera className="h-6 w-6" />
            <span className="text-sm font-bold">Take photo or upload receipt</span>
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}

      {scanning && (
        <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
          <Spinner className="h-5 w-5" />
          <span className="text-sm font-bold">Scanning receipt...</span>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-bold">Select items to add as expenses</p>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {items.map((item, idx) => (
              <label
                key={idx}
                className="flex items-center gap-3 py-2 px-1 rounded hover:bg-foreground/5 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleItem(idx)}
                  className="h-4 w-4 accent-primary shrink-0"
                />
                <span className="flex-1 text-sm font-bold truncate">{item.name}</span>
                <span className="text-sm font-bold shrink-0 tabular-nums">
                  {currency}{item.amount.toFixed(2)}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { reset(); if (fileRef.current) fileRef.current.click() }}
              className="px-4 py-2 border border-foreground/20 text-sm font-bold rounded-lg hover:bg-foreground/5 transition"
            >
              Rescan
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="flex-1 py-2 bg-foreground text-background text-sm font-bold rounded-lg hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              Add {selected.size} item{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}
