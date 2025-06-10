'use client'

import type { DateRange } from '@/lib/api'
import { useTheme } from '@/components/providers/theme-provider'

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'thisMonth', label: 'this month' },
  { value: 'lastMonth', label: 'last month' },
  { value: 'thisYear', label: 'this year' },
  { value: 'all', label: 'all time' },
  { value: 'custom', label: 'custom range' },
]

export function DateRangeFilter({
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  showCustom,
  onShowCustomChange,
}: {
  dateRange: DateRange
  onDateRangeChange: (v: DateRange) => void
  customStartDate: string
  customEndDate: string
  onCustomStartDateChange: (v: string) => void
  onCustomEndDateChange: (v: string) => void
  showCustom: boolean
  onShowCustomChange: (v: boolean) => void
}) {
  const { darkMode } = useTheme()

  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={dateRange}
          onChange={(e) => {
            const v = e.target.value as DateRange
            onDateRangeChange(v)
            if (v === 'custom') {
              const today = new Date()
              const yearStart = `${today.getFullYear()}-01-01`
              const todayStr = today.toISOString().split('T')[0]
              onCustomStartDateChange(yearStart)
              onCustomEndDateChange(todayStr)
              onShowCustomChange(true)
            } else {
              onShowCustomChange(false)
            }
          }}
          className="bg-background text-sm text-foreground border-b-2 border-foreground/30 pb-2 outline-none focus:border-foreground transition-colors cursor-pointer"
          style={{ colorScheme: darkMode ? 'dark' : 'light' }}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-background text-foreground">
              {o.label}
            </option>
          ))}
        </select>
        {showCustom && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomStartDateChange(e.target.value)}
              className="bg-background text-sm text-foreground border-b-2 border-foreground/30 pb-2 outline-none focus:border-foreground"
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
            />
            <span className="text-foreground/50">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
              className="bg-background text-sm text-foreground border-b-2 border-foreground/30 pb-2 outline-none focus:border-foreground"
              style={{ colorScheme: darkMode ? 'dark' : 'light' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
