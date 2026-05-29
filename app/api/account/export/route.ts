import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GDPR Article 20 — Right to data portability
// India DPDP Act 2023 Section 12 — right of access and correction
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const uid = session.user.id
  const hid = session.user.householdId

  const [
    userRes,
    assetsRes,
    liabilitiesRes,
    goalsRes,
    renewalsRes,
    docsRes,
    txRes,
    connectionsRes,
  ] = await Promise.all([
    db.execute({ sql: `SELECT id, email, full_name, currency, created_at FROM users WHERE id = ?`, args: [uid] }),
    db.execute({ sql: `SELECT * FROM assets WHERE household_id = ?`, args: [hid] }),
    db.execute({ sql: `SELECT id, name, category, balance, currency, interest_rate, monthly_payment, institution, created_at FROM liabilities WHERE household_id = ?`, args: [hid] }),
    db.execute({ sql: `SELECT * FROM goals WHERE household_id = ?`, args: [hid] }),
    db.execute({ sql: `SELECT id, name, category, amount, currency, renewal_date, provider, auto_renews, notes, created_at FROM renewals WHERE household_id = ?`, args: [hid] }),
    db.execute({ sql: `SELECT id, name, category, file_size, created_at FROM documents WHERE household_id = ?`, args: [hid] }),
    db.execute({ sql: `SELECT id, description, merchant_name, amount, currency, date, category FROM ob_transactions WHERE household_id = ? ORDER BY date DESC LIMIT 5000`, args: [hid] }),
    db.execute({ sql: `SELECT id, bank_name, bank_id, provider, status, created_at FROM open_banking_connections WHERE household_id = ?`, args: [hid] }),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    legal_basis: 'GDPR Art.20 / India DPDP Act 2023 S.12 — Right to data portability',
    format_version: '1.0',
    account: userRes.rows[0] ?? null,
    assets: assetsRes.rows,
    liabilities: liabilitiesRes.rows,
    goals: goalsRes.rows,
    renewals: renewalsRes.rows,
    documents_metadata: docsRes.rows,
    transactions: txRes.rows,
    bank_connections: connectionsRes.rows,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="vaultly-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
