'use client'
import { CheckCircle } from 'lucide-react'

export type AssetGroup = 'bank' | 'investment' | 'property' | 'crypto' | 'pension' | 'other'

interface GroupMeta {
  id: AssetGroup
  emoji: string
  label: string
  hint: string
  colour: string
  defaultCategory: string
}

export const ASSET_GROUPS: GroupMeta[] = [
  {
    id: 'bank',
    emoji: '🏦',
    label: 'Bank Account',
    hint: 'Current, savings, or cash ISA',
    colour: 'bg-blue-50 border-blue-200 text-blue-700',
    defaultCategory: 'bank_account',
  },
  {
    id: 'investment',
    emoji: '📈',
    label: 'Investments',
    hint: 'Stocks, ISA, ETF, funds, bonds',
    colour: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    defaultCategory: 'investment',
  },
  {
    id: 'property',
    emoji: '🏠',
    label: 'Property',
    hint: 'UK postcode → auto-valued',
    colour: 'bg-amber-50 border-amber-200 text-amber-700',
    defaultCategory: 'property',
  },
  {
    id: 'crypto',
    emoji: '₿',
    label: 'Crypto',
    hint: 'Search 10,000+ coins · live prices',
    colour: 'bg-orange-50 border-orange-200 text-orange-700',
    defaultCategory: 'crypto',
  },
  {
    id: 'pension',
    emoji: '🏛️',
    label: 'Pension',
    hint: 'Workplace, SIPP, or personal',
    colour: 'bg-violet-50 border-violet-200 text-violet-700',
    defaultCategory: 'pension',
  },
  {
    id: 'other',
    emoji: '🗂️',
    label: 'Other',
    hint: 'Insurance, collectibles, cash',
    colour: 'bg-slate-50 border-slate-200 text-slate-600',
    defaultCategory: 'other',
  },
]

interface Props {
  selected: AssetGroup | null
  onChange: (group: AssetGroup) => void
}

export function CategoryPicker({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ASSET_GROUPS.map(g => {
        const isSelected = selected === g.id
        return (
          <button
            key={g.id}
            onClick={() => onChange(g.id)}
            className={`relative flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              isSelected
                ? `${g.colour} border-current shadow-md scale-[1.02]`
                : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            {isSelected && (
              <CheckCircle size={14} className="absolute top-2 right-2 opacity-70" />
            )}
            <span className="text-3xl mb-2">{g.emoji}</span>
            <p className={`text-sm font-semibold ${isSelected ? '' : 'text-slate-800'}`}>{g.label}</p>
            <p className={`text-[11px] mt-0.5 leading-snug ${isSelected ? 'opacity-70' : 'text-slate-400'}`}>{g.hint}</p>
          </button>
        )
      })}
    </div>
  )
}
