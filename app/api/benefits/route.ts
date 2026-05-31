import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { calculateBenefits } from '@/lib/enterprise/benefits'
import { getUserOrgs, getOrgById } from '@/lib/enterprise/org'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { annualSalary, currentPensionPct } = await req.json()

  if (!annualSalary || annualSalary < 0) {
    return NextResponse.json({ error: 'Annual salary is required' }, { status: 400 })
  }

  // Get org benefits config if user is in an org
  const orgs = await getUserOrgs(session.user.id)
  const orgId = orgs[0]?.id ?? null
  const org = orgId ? await getOrgById(orgId) : null

  // Also check actual pension contribution from assets
  const userId = session.user.id
  const householdId = (session.user as Record<string, unknown>).householdId as string
    ?? (await db.execute({ sql: 'SELECT household_id FROM users WHERE id = ?', args: [userId] })).rows[0]?.household_id as string

  const opportunities = calculateBenefits({
    annualSalary,
    currentPensionPct: currentPensionPct ?? 3,
    config: {
      pensionMatchPct: org?.pension_match_pct ?? null,
      pensionMaxMatchPct: org?.pension_max_match_pct ?? null,
      salarySacrificeEnabled: !!(org?.salary_sacrifice_enabled),
      shareScheme: org?.share_scheme_name
        ? { name: org.share_scheme_name, deadline: org.share_scheme_deadline ?? null }
        : null,
    },
  })

  const totalSaving = opportunities.reduce((s, o) => s + o.annualSavingGBP, 0)

  return NextResponse.json({ opportunities, totalSaving, orgName: org?.name ?? null })
}
