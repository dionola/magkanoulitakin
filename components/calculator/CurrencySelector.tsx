'use client'

import { ChevronDown } from 'lucide-react'

const CURRENCIES = [
  ['PHP', '₱'],
  ['USD', '$'],
  ['EUR', '€'],
  ['GBP', '£'],
  ['JPY', '¥'],
  ['INR', '₹'],
] as const

interface CurrencySelectorProps {
  currency: string
  currencyCode: string
  isOpen: boolean
  currencyRef: React.RefObject<HTMLDivElement | null>
  onToggle: () => void
  onSelect: (code: string, symbol: string) => void
}

export function CurrencySelector({
  currency,
  currencyCode,
  isOpen,
  currencyRef,
  onToggle,
  onSelect,
}: CurrencySelectorProps) {
  return (
    <div className="relative" ref={currencyRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 font-bold text-base hover:opacity-70 transition"
      >
        {currency} {currencyCode} <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-50 min-w-[120px]">
          {CURRENCIES.map(([code, symbol]) => (
            <button
              key={code}
              onClick={() => onSelect(code, symbol)}
              className="w-full text-left px-4 py-2.5 font-bold text-base hover:opacity-70 transition border-b border-foreground/20 last:border-b-0"
            >
              {symbol} {code}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
