import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { VaultScoreCard } from '@/components/dashboard/vault-score-card'

const mockFetch = vi.fn()
global.fetch = mockFetch

const SCORE_RESPONSE = {
  vaultScore: {
    score: 620,
    components: {
      net_worth_momentum: 200, emergency_buffer: 120,
      goal_velocity: 150, debt_health: 100, renewal_control: 40, engagement: 10,
    },
    trend: 30,
    label: 'Great',
    colour: 'text-green-500',
    netWorth: 50000,
  },
  history: [
    { score: 590, created_at: '2025-06-01' },
    { score: 620, created_at: '2025-06-15' },
  ],
}

describe('<VaultScoreCard />', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SCORE_RESPONSE),
    })
  })

  it('renders loading skeleton initially', () => {
    const { container } = render(<VaultScoreCard />)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('renders score after loading', async () => {
    render(<VaultScoreCard />)
    await waitFor(() => expect(screen.getByText('620')).toBeDefined())
  })

  it('shows label text', async () => {
    render(<VaultScoreCard />)
    await waitFor(() => expect(screen.getByText('Great')).toBeDefined())
  })

  it('shows positive trend text', async () => {
    render(<VaultScoreCard />)
    await waitFor(() => expect(screen.getByText(/\+30 pts/)).toBeDefined())
  })

  it('shows max score /850', async () => {
    render(<VaultScoreCard />)
    await waitFor(() => expect(screen.getByText(/850/)).toBeDefined())
  })

  it('shows Vault Score heading', async () => {
    render(<VaultScoreCard />)
    await waitFor(() => expect(screen.getByText(/Vault Score/i)).toBeDefined())
  })

  it('renders nothing when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const { container } = render(<VaultScoreCard />)
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).toBeNull()
    })
  })

  it('shows negative trend text for declining score', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ...SCORE_RESPONSE,
        vaultScore: { ...SCORE_RESPONSE.vaultScore, trend: -15, label: 'Good' },
      }),
    })
    render(<VaultScoreCard />)
    await waitFor(() => expect(screen.getByText(/-15 pts/)).toBeDefined())
  })
})
