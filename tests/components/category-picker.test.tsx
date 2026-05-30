import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryPicker, ASSET_GROUPS } from '@/components/assets/category-picker'

describe('<CategoryPicker />', () => {
  it('renders all 6 category tiles', () => {
    render(<CategoryPicker selected={null} onChange={vi.fn()} />)
    expect(screen.getByText('Bank Account')).toBeDefined()
    expect(screen.getByText('Investments')).toBeDefined()
    expect(screen.getByText('Property')).toBeDefined()
    expect(screen.getByText('Crypto')).toBeDefined()
    expect(screen.getByText('Pension')).toBeDefined()
    expect(screen.getByText('Other')).toBeDefined()
  })

  it('shows hint text for each category', () => {
    render(<CategoryPicker selected={null} onChange={vi.fn()} />)
    expect(screen.getByText(/Current, savings/)).toBeDefined()
    expect(screen.getByText(/live prices/i)).toBeDefined()
    expect(screen.getByText(/postcode/i)).toBeDefined()
  })

  it('calls onChange with correct group when tile clicked', () => {
    const onChange = vi.fn()
    render(<CategoryPicker selected={null} onChange={onChange} />)
    fireEvent.click(screen.getByText('Crypto'))
    expect(onChange).toHaveBeenCalledWith('crypto')
  })

  it('shows checkmark on selected tile', () => {
    const { container } = render(<CategoryPicker selected="bank" onChange={vi.fn()} />)
    // Selected tile has scale-[1.02] class
    const selected = container.querySelector('.scale-\\[1\\.02\\]')
    expect(selected).not.toBeNull()
  })

  it('does not show checkmark when nothing selected', () => {
    const { container } = render(<CategoryPicker selected={null} onChange={vi.fn()} />)
    const selected = container.querySelector('.scale-\\[1\\.02\\]')
    expect(selected).toBeNull()
  })

  it('calls onChange for each category type', () => {
    const onChange = vi.fn()
    render(<CategoryPicker selected={null} onChange={onChange} />)
    const groups = ['Bank Account', 'Investments', 'Property', 'Crypto', 'Pension', 'Other']
    groups.forEach(label => {
      fireEvent.click(screen.getByText(label))
    })
    expect(onChange).toHaveBeenCalledTimes(6)
  })

  it('ASSET_GROUPS contains 6 groups', () => {
    expect(ASSET_GROUPS.length).toBe(6)
  })

  it('every group has emoji, label, hint, colour', () => {
    ASSET_GROUPS.forEach(g => {
      expect(g.emoji).toBeTruthy()
      expect(g.label).toBeTruthy()
      expect(g.hint).toBeTruthy()
      expect(g.colour).toBeTruthy()
      expect(g.defaultCategory).toBeTruthy()
    })
  })
})
