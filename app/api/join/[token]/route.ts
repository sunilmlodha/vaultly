import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { redeemInvite } from '@/lib/enterprise/org'
import { db } from '@/lib/db'

type Params = { params: Promise<{ token: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params
  const res = await db.execute({
    sql: `SELECT i.role, i.expires_at, i.used_at, o.name as org_name, o.id as org_id
          FROM org_invites i JOIN organisations o ON o.id = i.org_id
          WHERE i.token = ?`,
    args: [token],
  })
  const invite = res.rows[0]
  if (!invite) return NextResponse.json({ valid: false, reason: 'Invalid invite link' })
  if (invite.used_at) return NextResponse.json({ valid: false, reason: 'This invite has already been used' })
  if (new Date(invite.expires_at as string) < new Date()) return NextResponse.json({ valid: false, reason: 'This invite has expired' })
  return NextResponse.json({ valid: true, orgName: invite.org_name, role: invite.role })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await redeemInvite(token, session.user.id)
  if (!result) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
  return NextResponse.json({ success: true, orgName: result.org.name })
}
