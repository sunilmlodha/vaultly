import { useState, useCallback, useEffect } from 'react'
import type { Asset } from '@/lib/types'

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/assets')
      if (!res.ok) throw new Error('Failed to load assets')
      const { assets: data } = await res.json()
      setAssets(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (payload: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'household_id' | 'ob_account_id'>) => {
    // Optimistic insert with temp id
    const temp = { ...payload, id: `temp-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: '', household_id: '' } as Asset
    setAssets(prev => [temp, ...prev])
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      await load() // reconcile with server
    } catch {
      setAssets(prev => prev.filter(a => a.id !== temp.id))
      throw new Error('Failed to save asset')
    }
  }, [load])

  const update = useCallback(async (id: string, payload: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...payload } : a))
    await fetch('/api/assets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    })
    await load()
  }, [load])

  const remove = useCallback(async (id: string) => {
    const prev = assets.find(a => a.id === id)
    setAssets(a => a.filter(x => x.id !== id))
    try {
      await fetch('/api/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      if (prev) setAssets(a => [...a, prev])
    }
  }, [assets])

  const totalValue = assets.reduce((s, a) => s + Number(a.value), 0)

  const byCategory = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    const key = a.category
    acc[key] = [...(acc[key] || []), a]
    return acc
  }, {})

  return { assets, loading, error, load, add, update, remove, totalValue, byCategory }
}

export function useCryptoSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string; symbol: string; thumb: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState<{ id: string; name: string; symbol: string; thumb: string } | null>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)

  useEffect(() => {
    if (query.length < 2 || selectedCoin) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/assets/crypto-price?q=${encodeURIComponent(query)}`)
        const { results: r } = await res.json()
        setResults(r || [])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query, selectedCoin])

  const selectCoin = useCallback(async (coin: { id: string; name: string; symbol: string; thumb: string }) => {
    setSelectedCoin(coin)
    setQuery(coin.name)
    setResults([])
    setLoadingPrice(true)
    try {
      const res = await fetch(`/api/assets/crypto-price?ids=${coin.id}`)
      const { prices } = await res.json()
      setLivePrice(prices?.[0]?.gbp ?? null)
    } finally {
      setLoadingPrice(false)
    }
  }, [])

  const reset = useCallback(() => {
    setQuery(''); setResults([]); setSelectedCoin(null); setLivePrice(null)
  }, [])

  return { query, setQuery, results, searching, selectedCoin, livePrice, loadingPrice, selectCoin, reset }
}

interface PropertySaleResult {
  address: string; postcode: string; price: number
  date: string; displayDate: string; propertyType: string
}

interface PropertyLookupResult {
  sales: PropertySaleResult[]
  selectedSale: PropertySaleResult | null
  estimatedValue: number | null
  yearsSinceSale: number | null
  annualGrowthPct: number
  confidence: string
  disclaimer: string
}

export function usePropertyLookup() {
  const [postcode, setPostcode] = useState('')
  const [result, setResult] = useState<PropertyLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectingLoading, setSelectingLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async () => {
    if (!postcode.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch(`/api/assets/property?postcode=${encodeURIComponent(postcode)}`)
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Could not look up postcode — please enter value manually.')
    } finally {
      setLoading(false)
    }
  }, [postcode])

  const selectSale = useCallback(async (sale: PropertySaleResult) => {
    if (!result) return
    setSelectingLoading(true)
    try {
      const res = await fetch('/api/assets/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale, postcode }),
      })
      const data = await res.json()
      setResult(prev => prev ? { ...prev, ...data } : data)
    } finally {
      setSelectingLoading(false)
    }
  }, [result, postcode])

  const reset = useCallback(() => {
    setPostcode(''); setResult(null); setError(null)
  }, [])

  return { postcode, setPostcode, result, loading, selectingLoading, error, lookup, selectSale, reset }
}
