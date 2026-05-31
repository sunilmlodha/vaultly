import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getOrgById, isOrgAdmin, getOrgWellnessMetrics,
  createInviteToken,
} from '@/lib/enterprise/org'

type Params = { params: Promise<{ orgId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params
  const [org, admin] = await Promise.all([
    getOrgById(orgId),
    isOrgAdmin(session.user.id, orgId),
  ])

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const metrics = await getOrgWellnessMetrics(orgId)
  return NextResponse.json({ org, metrics })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params
  const admin = await isOrgAdmin(session.user.id, orgId)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { role = 'employee', email } = await req.json().catch(() => ({}))
  const token = await createInviteToken(orgId, role, email)

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://vaultly-mu.vercel.app'
  return NextResponse.json({ token, inviteUrl: `${baseUrl}/join/${token}` })
}
