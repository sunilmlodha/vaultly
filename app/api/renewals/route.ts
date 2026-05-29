import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
  const { data } = await supabase.from('renewals').select('*').eq('household_id', profile?.household_id).order('renewal_date')
  return NextResponse.json({ renewals: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
  const body = await req.json()
  const { data, error } = await supabase.from('renewals').insert({ ...body, user_id: user.id, household_id: profile?.household_id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ renewal: data }, { status: 201 })
}
