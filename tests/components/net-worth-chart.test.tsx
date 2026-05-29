import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NetWorthChart } from '@/components/dashboard/net-worth-chart'

describe('<NetWorthChart />', () => {
  it('renders the net worth value', () => {
    render(<NetWorthChart netWorth={300000} currency="GBP" />)
    expect(screen.getByText(/300,000/)).toBeDefined()
  })

  it('shows a positive trend in emerald when net worth is above previous month', () => {
    // mockData second-to-last point is 272000 (Apr); if netWorth > 272000 → positive
    const { container } = render(<NetWorthChart netWorth={300000} currency="GBP" />)
    const trendEl = container.querySelector('.text-emerald-600')
    expect(trendEl).not.toBeNull()
    expect(trendEl?.textContent).toMatch(/^\+/)
  })

  it('shows a negative trend in rose when net worth is below previous month', () => {
    // netWorth below 272000 → negative
    const { container } = render(<NetWorthChart netWorth={200000} currency="GBP" />)
    const trendEl = container.querySelector('.text-rose-500')
    expect(trendEl).not.toBeNull()
    expect(trendEl?.textContent).toMatch(/^-/)
  })

  it('shows correct percentage change', () => {
    // prev = 272000, netWorth = 340000 → +25.0%
    render(<NetWorthChart netWorth={340000} currency="GBP" />)
    expect(screen.getByText(/\+25\.0%/)).toBeDefined()
  })

  it('renders chart area without crashing', () => {
    expect(() => render(<NetWorthChart netWorth={0} currency="GBP" />)).not.toThrow()
  })

  it('handles zero net worth gracefully', () => {
    render(<NetWorthChart netWorth={0} currency="GBP" />)
    // 0 vs 272000 → large negative, but should not crash
    const trendEl = screen.getByText(/since last month/)
    expect(trendEl).toBeDefined()
  })
})
