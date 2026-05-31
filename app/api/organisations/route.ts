import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOrg, getUserOrgs } from '@/lib/enterprise/org'

// GET — list orgs the current user belongs to
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgs = await getUserOrgs(session.user.id)
  return NextResponse.json({ orgs })
}

// POST — create a new organisation
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, pension_match_pct, pension_max_match_pct, pension_provider,
          salary_sacrifice_enabled, share_scheme_name, share_scheme_deadline } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Organisation name is required' }, { status: 400 })

  const org = await createOrg(name.trim(), session.user.id, {
    pension_match_pct: pension_match_pct ?? null,
    pension_max_match_pct: pension_max_match_pct ?? null,
    pension_provider: pension_provider ?? null,
    salary_sacrifice_enabled: salary_sacrifice_enabled ? 1 : 0,
    share_scheme_name: share_scheme_name ?? null,
    share_scheme_deadline: share_scheme_deadline ?? null,
  })

  return NextResponse.json({ org }, { status: 201 })
}
