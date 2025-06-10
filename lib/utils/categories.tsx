import { Utensils, Car, Zap, Tv, Heart, BookOpen, Plane, Tag, type LucideIcon } from 'lucide-react'

export interface Category {
  value: string
  label: string
  Icon: LucideIcon
}

export const CATEGORIES: Category[] = [
  { value: 'food',          label: 'food',          Icon: Utensils  },
  { value: 'transport',     label: 'transport',     Icon: Car       },
  { value: 'utilities',     label: 'utilities',     Icon: Zap       },
  { value: 'entertainment', label: 'entertainment', Icon: Tv        },
  { value: 'health',        label: 'health',        Icon: Heart     },
  { value: 'education',     label: 'education',     Icon: BookOpen  },
  { value: 'travel',        label: 'travel',        Icon: Plane     },
  { value: 'other',         label: 'other',         Icon: Tag       },
]

export function getCategoryIcon(value: string): LucideIcon | null {
  return CATEGORIES.find(c => c.value === value)?.Icon ?? null
}
