import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { email, password, full_name } = await req.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Check email not already taken
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  })
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const userId = randomUUID()
  const householdId = randomUUID()
  const memberId = randomUUID()
  const passwordHash = await bcrypt.hash(password, 12)
  const householdName = `${full_name.split(' ')[0]}'s Vault`

  // Create household, user, and owner membership in one transaction
  await db.batch([
    {
      sql: 'INSERT INTO households (id, name, owner_id) VALUES (?, ?, ?)',
      args: [householdId, householdName, userId],
    },
    {
      sql: 'INSERT INTO users (id, email, password_hash, full_name, household_id) VALUES (?, ?, ?, ?, ?)',
      args: [userId, email, passwordHash, full_name, householdId],
    },
    {
      sql: 'INSERT INTO household_members (id, household_id, user_id, role, accepted) VALUES (?, ?, ?, ?, 1)',
      args: [memberId, householdId, userId, 'owner'],
    },
  ])

  return NextResponse.json({ success: true }, { status: 201 })
}
