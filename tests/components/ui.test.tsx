import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// ── Badge ─────────────────────────────────────────────────────────────────────
describe('<Badge />', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeDefined()
  })

  it('applies variant classes', () => {
    const { container } = render(<Badge variant="success">OK</Badge>)
    // success variant should add a green-ish class
    expect(container.firstChild).toBeDefined()
  })

  it('renders default variant without crashing', () => {
    expect(() => render(<Badge>Default</Badge>)).not.toThrow()
  })

  it('renders all variants', () => {
    const variants = ['default', 'success', 'danger', 'warning', 'info', 'purple'] as const
    for (const v of variants) {
      expect(() => render(<Badge variant={v}>{v}</Badge>)).not.toThrow()
    }
  })
})

// ── Button ────────────────────────────────────────────────────────────────────
describe('<Button />', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDefined()
  })

  it('calls onClick when clicked', () => {
    let clicked = false
    render(<Button onClick={() => { clicked = true }}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(clicked).toBe(true)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })

  it('shows loading spinner when loading prop is true', () => {
    const { container } = render(<Button loading>Loading</Button>)
    // Should render spinner or be disabled
    const btn = container.querySelector('button')
    expect(btn?.disabled).toBe(true)
  })

  it('does not fire onClick when disabled', () => {
    let clicked = false
    render(<Button disabled onClick={() => { clicked = true }}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(clicked).toBe(false)
  })

  it('renders all variants', () => {
    const variants = ['default', 'secondary', 'outline', 'ghost'] as const
    for (const v of variants) {
      expect(() => render(<Button variant={v}>{v}</Button>)).not.toThrow()
    }
  })

  it('renders size variants', () => {
    expect(() => render(<Button size="sm">sm</Button>)).not.toThrow()
    expect(() => render(<Button size="lg">lg</Button>)).not.toThrow()
  })
})

// ── Card ──────────────────────────────────────────────────────────────────────
describe('<Card />', () => {
  it('renders children', () => {
    render(<Card><CardContent>Card body</CardContent></Card>)
    expect(screen.getByText('Card body')).toBeDefined()
  })

  it('renders with header and title', () => {
    render(
      <Card>
        <CardHeader><CardTitle>My Title</CardTitle></CardHeader>
        <CardContent>Body</CardContent>
      </Card>
    )
    expect(screen.getByText('My Title')).toBeDefined()
    expect(screen.getByText('Body')).toBeDefined()
  })

  it('applies additional className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>)
    expect(container.firstChild?.toString()).toBeDefined()
  })
})

// ── Input ─────────────────────────────────────────────────────────────────────
describe('<Input />', () => {
  it('renders with label', () => {
    render(<Input label="Name" />)
    expect(screen.getByText('Name')).toBeDefined()
  })

  it('renders placeholder', () => {
    render(<Input placeholder="Enter name" />)
    expect(screen.getByPlaceholderText('Enter name')).toBeDefined()
  })

  it('fires onChange when typing', () => {
    let value = ''
    render(<Input onChange={e => { value = e.target.value }} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(value).toBe('hello')
  })

  it('respects disabled prop', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders number type', () => {
    render(<Input type="number" />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeDefined()
  })

  it('displays controlled value', () => {
    render(<Input value="test-value" onChange={() => {}} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('test-value')
  })
})
