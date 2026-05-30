'use client'
import { useState } from 'react'
import { Pencil, Trash2, RefreshCw, Check, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Asset } from '@/lib/types'

const CATEGORY_COLOUR: Record<string, { bg: string; text: string; dot: string }> = {
  bank_account: { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400' },
  investment:   { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  isa_ss:       { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  isa_cash:     { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400' },
  isa_lifetime: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  isa_junior:   { bg: 'bg-sky-50',    text: 'text-sky-600',    dot: 'bg-sky-400' },
  property:     { bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-400' },
  crypto:       { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
  pension:      { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
  sipp:         { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
  etf:          { bg: 'bg-green-50',  text: 'text-green-600',  dot: 'bg-green-400' },
  bonds:        { bg: 'bg-teal-50',   text: 'text-teal-600',   dot: 'bg-teal-400' },
  insurance:    { bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  other:        { bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  bank_account: '🏦', investment: '📈', isa_ss: '📈', isa_cash: '💰',
  isa_lifetime: '🔒', isa_junior: '👶', property: '🏠', crypto: '₿',
  pension: '🏛️', sipp: '🏛️', etf: '📊', bonds: '📜', insurance: '🔐', other: '🗂️',
}

interface Props {
  asset: Asset
  onEdit: (a: Asset) => void
  onDelete: (id: string) => void
}

export function AssetCard({ asset, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const colour = CATEGORY_COLOUR[asset.category] ?? CATEGORY_COLOUR.other
  const emoji = CATEGORY_EMOJI[asset.category] ?? '🗂️'
  const value = Number(asset.value)

  return (
    <div className={`group rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}>
      {/* Colour accent top bar */}
      <div className={`h-1 w-full ${colour.dot}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${colour.bg} flex items-center justify-center text-lg shrink-0`}>
              {emoji}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{asset.name}</p>
              {asset.institution && (
                <p className="text-xs text-slate-400 truncate">{asset.institution}</p>
              )}
            </div>
          </div>

          {asset.ob_account_id && (
            <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full shrink-0">
              <RefreshCw size={9} className="text-indigo-400" />
              <span className="text-[10px] text-indigo-500 font-medium">Live</span>
            </div>
          )}
        </div>

        {/* Value */}
        <p className={`text-2xl font-black ${colour.text} mb-1`}>
          {formatCurrency(value, asset.currency)}
        </p>

        {/* Notes */}
        {asset.notes && (
          <p className="text-xs text-slate-400 leading-snug line-clamp-1 mb-1" title={asset.notes}>
            {asset.notes}
          </p>
        )}

        <p className="text-[11px] text-slate-300">Added {formatDate(asset.created_at)}</p>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-50">
          {confirmDelete ? (
            <>
              <p className="text-xs text-red-600 flex-1">Delete this asset?</p>
              <button
                onClick={() => { onDelete(asset.id); setConfirmDelete(false) }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-xl hover:bg-red-600 transition-colors"
              >
                <Check size={11} /> Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(asset)}
                disabled={!!asset.ob_account_id}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
              >
                <Pencil size={11} /> Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
