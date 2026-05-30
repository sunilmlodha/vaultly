'use client'
import { useState } from 'react'
import { X, ArrowLeft, ChevronRight } from 'lucide-react'
import { CategoryPicker, ASSET_GROUPS } from './category-picker'
import { AssetFormForGroup } from './asset-forms'
import type { AssetGroup } from './category-picker'
import type { AssetFormData } from './asset-forms'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: AssetFormData) => Promise<void>
}

const GROUP_DEFAULTS: Record<AssetGroup, Partial<AssetFormData>> = {
  bank:       { category: 'bank_account', currency: 'GBP' },
  investment: { category: 'investment',   currency: 'GBP' },
  property:   { category: 'property',     currency: 'GBP' },
  crypto:     { category: 'crypto',       currency: 'GBP' },
  pension:    { category: 'pension',      currency: 'GBP' },
  other:      { category: 'other',        currency: 'GBP' },
}

function isReadyToSave(group: AssetGroup | null, data: Partial<AssetFormData> & { coinQty?: string }): boolean {
  if (!group || !data.name?.trim()) return false
  if (group === 'crypto') return !!data.coinQty && Number(data.coinQty) > 0
  return (data.value ?? 0) > 0
}

export function AddAssetWizard({ open, onClose, onSave }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [group, setGroup] = useState<AssetGroup | null>(null)
  const [formData, setFormData] = useState<Partial<AssetFormData> & { coinQty?: string; coinId?: string }>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const selectedGroup = ASSET_GROUPS.find(g => g.id === group)

  const handleGroupSelect = (g: AssetGroup) => {
    setGroup(g)
    setFormData({ ...GROUP_DEFAULTS[g] })
    setStep(2)
  }

  const handleFormChange = (partial: Partial<AssetFormData> & { coinQty?: string; coinId?: string }) => {
    setFormData(prev => ({ ...prev, ...partial }))
  }

  const handleSave = async () => {
    if (!group) return
    setSaving(true)
    setError(null)
    try {
      const payload: AssetFormData = {
        name:        formData.name?.trim() || '',
        category:    formData.category || GROUP_DEFAULTS[group].category!,
        value:       formData.value ?? 0,
        currency:    formData.currency || 'GBP',
        institution: formData.institution?.trim() || '',
        notes:       formData.notes?.trim() || '',
      }
      await onSave(payload)
      // Reset
      setStep(1); setGroup(null); setFormData({}); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    setStep(1)
    setGroup(null)
    setFormData({})
    setError(null)
  }

  const ready = isReadyToSave(group, formData)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel — full screen on mobile, centred modal on desktop */}
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[90vh] bg-white md:rounded-3xl z-50 flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={handleBack} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                <ArrowLeft size={16} className="text-slate-500" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {step === 1 ? 'What are you adding?' : `Add ${selectedGroup?.label}`}
              </h2>
              {step === 2 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-slate-400">Choose type</span>
                  <ChevronRight size={10} className="text-slate-300" />
                  <span className="text-xs text-indigo-500 font-medium">Details</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 py-3 shrink-0">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-6 bg-indigo-500' : s < step ? 'w-3 bg-indigo-200' : 'w-3 bg-slate-200'}`} />
          ))}
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {step === 1 && (
            <CategoryPicker selected={group} onChange={handleGroupSelect} />
          )}

          {step === 2 && group && (
            <AssetFormForGroup group={group} data={formData} onChange={handleFormChange} />
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0 space-y-2">
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button
              onClick={handleSave}
              disabled={!ready || saving}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-2xl transition-all"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving…
                </span>
              ) : (
                `Save ${selectedGroup?.label ?? 'asset'}`
              )}
            </button>
            {!ready && formData.name && (
              <p className="text-xs text-center text-slate-400">
                {group === 'crypto' ? 'Select a coin and enter quantity to continue'
                : 'Enter a value to continue'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
