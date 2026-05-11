'use client'

import { useRef, useState } from 'react'
import { ScanLine, X, Check, Camera, ChevronDown, RotateCcw } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Person, CalculatorExpense } from '@/lib/types'

interface ReceiptItem {
  name: string
  amount: number
  paidBy: string[]  // person IDs — multi-payer splits into sub-expenses
}

interface ReceiptScannerProps {
  currency: string
  people: Person[]
  onAddExpenses: (expenses: Omit<CalculatorExpense, 'id'>[]) => void
}

function PayerDropdown({
  people,
  selected,
  onChange,
}: {
  people: Person[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const label =
    selected.length === 0
      ? 'Select payer'
      : selected.length === people.length
        ? 'Everyone'
        : selected.length === 1
          ? (people.find(p => p.id === selected[0])?.name ?? 'Unknown')
          : `${selected.length} people`

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition bg-foreground/5 rounded px-2 py-1"
      >
        {label}
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-background border border-foreground/20 rounded-lg shadow-lg z-20 min-w-36">
            <button
              type="button"
              onClick={() => { onChange(people.map(p => p.id)); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs font-bold hover:opacity-70 transition border-b border-foreground/10"
            >
              Everyone
            </button>
            {people.map(person => (
              <label key={person.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-70 transition border-b border-foreground/10 last:border-b-0">
                <input
                  type="checkbox"
                  checked={selected.includes(person.id)}
                  onChange={() => toggle(person.id)}
                  className="h-3 w-3 accent-primary shrink-0"
                />
                <span className="text-xs font-bold truncate">{person.name}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ReceiptScanner({ currency, people, onAddExpenses }: ReceiptScannerProps) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [globalPayers, setGlobalPayers] = useState<string[]>(() => people.slice(0, 1).map(p => p.id))
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setItems([])
    setSelected(new Set())
    setError('')
    setGlobalPayers(people.slice(0, 1).map(p => p.id))
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
      const data = await res.json() as { items?: { name: string; amount: number }[]; error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to scan receipt')
        return
      }

      const defaultPayers = people.slice(0, 1).map(p => p.id)
      const parsed: ReceiptItem[] = (data.items ?? [])
        .filter(i => i.name && typeof i.amount === 'number')
        .map(i => ({ ...i, paidBy: defaultPayers }))

      setItems(parsed)
      setSelected(new Set(parsed.map((_, i) => i)))
      setGlobalPayers(defaultPayers)
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

  const setItemPayers = (idx: number, payers: string[]) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, paidBy: payers } : item))
  }

  const applyGlobalPayers = (payers: string[]) => {
    setGlobalPayers(payers)
    setItems(prev => prev.map(item => ({ ...item, paidBy: payers })))
  }

  const handleAdd = () => {
    const allPeople = people.map(p => p.id)
    const expenses: Omit<CalculatorExpense, 'id'>[] = []

    items.forEach((item, idx) => {
      if (!selected.has(idx)) return
      const payers = item.paidBy.length > 0 ? item.paidBy : [people[0]?.id ?? '']

      if (payers.length === 1) {
        expenses.push({
          name: item.name,
          amount: item.amount,
          paidBy: payers[0],
          splitWith: allPeople,
          splitType: 'equal',
          splitData: {},
        })
      } else {
        // Split into one sub-expense per payer, each paying amount / N
        const share = Math.round((item.amount / payers.length) * 100) / 100
        payers.forEach((payerId, i) => {
          // Give any rounding remainder to the last payer
          const amount = i === payers.length - 1
            ? Math.round((item.amount - share * (payers.length - 1)) * 100) / 100
            : share
          expenses.push({
            name: `${item.name}${payers.length > 1 ? ` (${people.find(p => p.id === payerId)?.name ?? ''})` : ''}`,
            amount,
            paidBy: payerId,
            splitWith: allPeople,
            splitType: 'equal',
            splitData: {},
          })
        })
      }
    })

    if (expenses.length === 0) return
    onAddExpenses(expenses)
    setOpen(false)
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-4 border border-foreground/20 text-foreground font-bold text-lg rounded-lg hover:bg-foreground/5 transition flex items-center justify-center gap-2"
      >
        <ScanLine className="h-5 w-5" />
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

      {/* Hidden file input */}
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

      {items.length === 0 && !scanning && (
        <div className="space-y-3">
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
          {/* Global payer row */}
          <div className="flex items-center justify-between pb-2 border-b border-foreground/10">
            <span className="text-xs text-muted-foreground font-bold">Paid by (all items)</span>
            <PayerDropdown
              people={people}
              selected={globalPayers}
              onChange={applyGlobalPayers}
            />
          </div>

          {/* Item list */}
          <div className="space-y-1 max-h-[50vh] md:max-h-64 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-foreground/5 transition">
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleItem(idx)}
                  className="h-4 w-4 accent-primary shrink-0"
                />
                <span className="flex-1 text-sm font-bold truncate">{item.name}</span>
                <span className="text-sm font-bold tabular-nums shrink-0">
                  {currency}{item.amount.toFixed(2)}
                </span>
                <PayerDropdown
                  people={people}
                  selected={item.paidBy}
                  onChange={(ids) => setItemPayers(idx, ids)}
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 0) }}
              className="flex items-center gap-1.5 px-3 py-2 border border-foreground/20 text-xs font-bold rounded-lg hover:bg-foreground/5 transition"
            >
              <RotateCcw className="h-3 w-3" />
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
        </div>
      )}
    </div>
  )
}
