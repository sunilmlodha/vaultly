import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export interface Organisation {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: 'starter' | 'growth' | 'enterprise'
  max_employees: number
  primary_colour: string
  pension_provider: string | null
  pension_match_pct: number | null
  pension_max_match_pct: number | null
  salary_sacrifice_enabled: number
  share_scheme_name: string | null
  share_scheme_deadline: string | null
  created_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: 'owner' | 'admin' | 'hr' | 'employee'
  joined_at: string
}

// ── Org CRUD ──────────────────────────────────────────────────────────────────

export async function createOrg(
  name: string,
  ownerUserId: string,
  settings: Partial<Organisation> = {}
): Promise<Organisation> {
  const id = randomUUID()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(0, 6)
  const memberId = randomUUID()

  await db.batch([
    {
      sql: `INSERT INTO organisations
              (id, name, slug, plan, max_employees, primary_colour,
               pension_provider, pension_match_pct, pension_max_match_pct,
               salary_sacrifice_enabled, billing_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, name, slug,
        settings.plan ?? 'starter',
        settings.max_employees ?? 50,
        settings.primary_colour ?? '#6366f1',
        settings.pension_provider ?? null,
        settings.pension_match_pct ?? null,
        settings.pension_max_match_pct ?? null,
        settings.salary_sacrifice_enabled ?? 0,
        null,
      ],
    },
    {
      sql: `INSERT INTO org_members (id, org_id, user_id, role)
            VALUES (?, ?, ?, 'owner')`,
      args: [memberId, id, ownerUserId],
    },
  ])

  const res = await db.execute({ sql: 'SELECT * FROM organisations WHERE id = ?', args: [id] })
  return res.rows[0] as unknown as Organisation
}

export async function getOrgById(id: string): Promise<Organisation | null> {
  const res = await db.execute({ sql: 'SELECT * FROM organisations WHERE id = ?', args: [id] })
  return (res.rows[0] as unknown as Organisation) ?? null
}

export async function getOrgBySlug(slug: string): Promise<Organisation | null> {
  const res = await db.execute({ sql: 'SELECT * FROM organisations WHERE slug = ?', args: [slug] })
  return (res.rows[0] as unknown as Organisation) ?? null
}

export async function getUserOrgs(userId: string): Promise<(Organisation & { role: string })[]> {
  const res = await db.execute({
    sql: `SELECT o.*, m.role FROM organisations o
          JOIN org_members m ON m.org_id = o.id
          WHERE m.user_id = ?
          ORDER BY o.created_at DESC`,
    args: [userId],
  })
  return res.rows as unknown as (Organisation & { role: string })[]
}

export async function getUserOrgRole(userId: string, orgId: string): Promise<string | null> {
  const res = await db.execute({
    sql: 'SELECT role FROM org_members WHERE user_id = ? AND org_id = ?',
    args: [userId, orgId],
  })
  return (res.rows[0]?.role as string) ?? null
}

export async function isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
  const role = await getUserOrgRole(userId, orgId)
  return role === 'owner' || role === 'admin' || role === 'hr'
}

// ── Invite management ─────────────────────────────────────────────────────────

export async function createInviteToken(
  orgId: string,
  role = 'employee',
  email?: string
): Promise<string> {
  const token = randomUUID()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await db.execute({
    sql: `INSERT INTO org_invites (id, org_id, token, email, role, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), orgId, token, email ?? null, role, expires],
  })
  return token
}

export async function redeemInvite(token: string, userId: string): Promise<{ org: Organisation; role: string } | null> {
  const res = await db.execute({
    sql: `SELECT i.*, o.* FROM org_invites i
          JOIN organisations o ON o.id = i.org_id
          WHERE i.token = ? AND i.used_at IS NULL AND i.expires_at > datetime('now')`,
    args: [token],
  })
  if (!res.rows[0]) return null

  const invite = res.rows[0]
  const memberId = randomUUID()

  await db.batch([
    {
      sql: `INSERT OR IGNORE INTO org_members (id, org_id, user_id, role)
            VALUES (?, ?, ?, ?)`,
      args: [memberId, invite.org_id as string, userId, invite.role as string],
    },
    {
      sql: `UPDATE org_invites SET used_by = ?, used_at = datetime('now') WHERE token = ?`,
      args: [userId, token],
    },
  ])

  const org = await getOrgById(invite.org_id as string)
  return org ? { org, role: invite.role as string } : null
}

// ── Aggregate wellness metrics (GDPR: min 5 members before surfacing data) ────

export const MIN_COHORT_SIZE = 5

export async function getOrgWellnessMetrics(orgId: string) {
  const [memberCount, checkIns, vaultScores, assets, liabilities] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as cnt FROM org_members WHERE org_id = ? AND role = 'employee'`,
      args: [orgId],
    }),
    db.execute({
      sql: `SELECT stress_score, week FROM wellness_checkins WHERE org_id = ?
            ORDER BY week DESC LIMIT 200`,
      args: [orgId],
    }),
    db.execute({
      sql: `SELECT vs.score FROM vault_scores vs
            JOIN org_members m ON m.user_id = vs.user_id
            WHERE m.org_id = ? AND m.role = 'employee'
            AND vs.created_at = (
              SELECT MAX(vs2.created_at) FROM vault_scores vs2 WHERE vs2.user_id = vs.user_id
            )`,
      args: [orgId],
    }),
    db.execute({
      sql: `SELECT a.category, COUNT(*) as cnt FROM assets a
            JOIN org_members m ON m.user_id = a.user_id
            WHERE m.org_id = ? GROUP BY a.category`,
      args: [orgId],
    }),
    db.execute({
      sql: `SELECT l.category, COUNT(*) as cnt FROM liabilities l
            JOIN org_members m ON m.user_id = l.user_id
            WHERE m.org_id = ? GROUP BY l.category`,
      args: [orgId],
    }),
  ])

  const total = Number(memberCount.rows[0]?.cnt ?? 0)
  if (total < MIN_COHORT_SIZE) {
    return { total, tooSmall: true }
  }

  // Vault Score distribution
  const scores = vaultScores.rows.map(r => Number(r.score))
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  // Stress trend (last 8 weeks)
  const weekMap = new Map<string, number[]>()
  for (const r of checkIns.rows) {
    const w = r.week as string
    if (!weekMap.has(w)) weekMap.set(w, [])
    weekMap.get(w)!.push(Number(r.stress_score))
  }
  const stressTrend = Array.from(weekMap.entries())
    .slice(0, 8)
    .map(([week, scores]) => ({
      week,
      avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      responses: scores.length,
    }))
    .reverse()

  const checkInRate = checkIns.rows.length > 0
    ? Math.round((new Set(checkIns.rows.map(r => r.user_id)).size / total) * 100)
    : 0

  const assetCats = new Map(assets.rows.map(r => [r.category as string, Number(r.cnt)]))
  const liabCats = new Map(liabilities.rows.map(r => [r.category as string, Number(r.cnt)]))

  const pctWithPension = total > 0
    ? Math.round(((assetCats.get('pension') ?? 0) + (assetCats.get('sipp') ?? 0)) / total * 100)
    : 0

  const pctWithInvestments = total > 0
    ? Math.round(((assetCats.get('investment') ?? 0) + (assetCats.get('isa_ss') ?? 0) + (assetCats.get('etf') ?? 0)) / total * 100)
    : 0

  const pctWithMortgage = total > 0
    ? Math.round((liabCats.get('mortgage') ?? 0) / total * 100)
    : 0

  const latestStress = stressTrend.length > 0 ? stressTrend[stressTrend.length - 1].avg : null
  const stressLabel = latestStress === null ? 'No data'
    : latestStress <= 2 ? 'Low'
    : latestStress <= 3.5 ? 'Moderate'
    : 'High'

  return {
    total,
    tooSmall: false,
    avgVaultScore: avgScore,
    stressTrend,
    latestStress,
    stressLabel,
    checkInRate,
    pctWithPension,
    pctWithInvestments,
    pctWithMortgage,
    engagement: {
      weeklyActiveRate: checkInRate,
      totalCheckins: checkIns.rows.length,
    },
  }
}
