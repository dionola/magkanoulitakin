'use client'

import type { DateRange } from '@/lib/api'

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
  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={dateRange}
          onChange={(e) => {
            const v = e.target.value as DateRange
            onDateRangeChange(v)
            if (v !== 'custom') {
              onShowCustomChange(false)
            } else {
              onShowCustomChange(true)
            }
          }}
          className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background transition-colors cursor-pointer"
          style={{ colorScheme: 'dark' }}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-foreground text-background">
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
              className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-background/50">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
              className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
