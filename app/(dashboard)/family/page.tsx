'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { getInitials } from '@/lib/utils'
import { Plus, Users, UserPlus, Trash2 } from 'lucide-react'
import type { FamilyRole } from '@/lib/types'

interface Member { id: string; role: FamilyRole; accepted: number; invited_email?: string; full_name?: string; email?: string }

const ROLES: { value: FamilyRole; label: string }[] = [
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'advisor', label: 'Advisor' },
]

const ROLE_BADGE: Record<FamilyRole, 'purple' | 'info' | 'success' | 'warning' | 'default'> = {
  owner: 'purple', partner: 'info', child: 'success', parent: 'warning', advisor: 'default',
}

export default function FamilyPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [household, setHousehold] = useState<{ name: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<FamilyRole>('partner')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/family')
    const { members: m, household: h } = await res.json()
    setMembers(m || [])
    setHousehold(h || null)
  }, [])

  useEffect(() => { load() }, [load])

  const invite = async () => {
    if (!inviteEmail) return
    setLoading(true)
    await fetch('/api/family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invited_email: inviteEmail, role: inviteRole }) })
    setOpen(false); setInviteEmail(''); setLoading(false); load()
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this member?')) return
    await fetch('/api/family', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div>
      <Topbar title="Family" subtitle={household?.name} userName={session?.user?.name ?? ''}
        actions={<Button onClick={() => setOpen(true)} size="sm"><UserPlus size={14} /> Invite</Button>} />
      <div className="p-4 md:p-8 animate-fade-in">
        <Card>
          <CardHeader><CardTitle>Household Members</CardTitle></CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="py-10 text-center">
                <Users size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Just you for now</p>
                <Button onClick={() => setOpen(true)} size="sm" className="mt-4"><Plus size={14} /> Invite a member</Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {members.map((m) => {
                  const name = m.full_name || m.invited_email || 'Invited user'
                  return (
                    <div key={m.id} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold">
                          {getInitials(name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{name}</p>
                          <p className="text-xs text-slate-400">{m.email || m.invited_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={ROLE_BADGE[m.role]}>{m.role}</Badge>
                        {!m.accepted && <Badge variant="warning">Pending</Badge>}
                        {m.role !== 'owner' && (
                          <Button variant="ghost" size="sm" onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite Family Member">
        <div className="space-y-4">
          <Input label="Email address" type="email" placeholder="jane@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <Select label="Role" value={inviteRole} onChange={e => setInviteRole(e.target.value as FamilyRole)} options={ROLES} />
          <p className="text-xs text-slate-400">They will receive an invitation to join your vault.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={invite} loading={loading} className="flex-1">Send invite</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
