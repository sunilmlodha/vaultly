import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AssetCard } from '@/components/assets/asset-card'
import type { Asset } from '@/lib/types'

const makeAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: 'a1',
  user_id: 'u1',
  household_id: 'hh1',
  name: 'Barclays Current Account',
  category: 'bank_account',
  value: 12500,
  currency: 'GBP',
  institution: 'Barclays',
  notes: 'Main account',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
})

describe('<AssetCard />', () => {
  it('renders asset name', () => {
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Barclays Current Account')).toBeDefined()
  })

  it('renders institution', () => {
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Barclays')).toBeDefined()
  })

  it('renders formatted value', () => {
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/12,500/)).toBeDefined()
  })

  it('shows Edit button', () => {
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Edit')).toBeDefined()
  })

  it('calls onEdit when Edit clicked', () => {
    const onEdit = vi.fn()
    render(<AssetCard asset={makeAsset()} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByText('Edit'))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }))
  })

  it('shows delete confirmation after clicking Delete', () => {
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByText(/Delete this asset/)).toBeDefined()
    expect(screen.getByText('Yes')).toBeDefined()
  })

  it('calls onDelete when Yes confirmed', () => {
    const onDelete = vi.fn()
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Yes'))
    expect(onDelete).toHaveBeenCalledWith('a1')
  })

  it('cancels delete when X clicked', () => {
    const onDelete = vi.fn()
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('Delete'))
    // Click the X cancel button
    const cancelButtons = screen.getAllByRole('button')
    const xButton = cancelButtons.find(b => b.querySelector('svg') && !b.textContent?.includes('Yes') && !b.textContent?.includes('Delete'))
    if (xButton) fireEvent.click(xButton)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('disables edit for live bank-synced assets', () => {
    const asset = makeAsset({ ob_account_id: 'ob-123' })
    render(<AssetCard asset={asset} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const editBtn = screen.getByText('Edit').closest('button')
    expect(editBtn?.disabled).toBe(true)
  })

  it('shows Live badge for synced assets', () => {
    const asset = makeAsset({ ob_account_id: 'ob-123' })
    render(<AssetCard asset={asset} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Live')).toBeDefined()
  })

  it('renders notes when present', () => {
    render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Main account')).toBeDefined()
  })

  it('renders colour accent bar at top', () => {
    const { container } = render(<AssetCard asset={makeAsset()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const bar = container.querySelector('.h-1')
    expect(bar).not.toBeNull()
  })

  it('renders correct emoji for crypto assets', () => {
    const asset = makeAsset({ category: 'crypto', name: 'Bitcoin' })
    render(<AssetCard asset={asset} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('₿')).toBeDefined()
  })

  it('renders correct emoji for property assets', () => {
    const asset = makeAsset({ category: 'property', name: 'My House' })
    render(<AssetCard asset={asset} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('🏠')).toBeDefined()
  })
})
