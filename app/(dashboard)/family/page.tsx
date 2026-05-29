'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
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

const ROLE_BADGE: Record<FamilyRole, 'purple' | 'info' | 'success' | 'warning' | 'default'> = {
  owner: 'purple', partner: 'info', child: 'success', parent: 'warning', advisor: 'default',
}

export default function FamilyPage() {
  const { data: session } = useSession()
  const t = useTranslations('family')
  const tc = useTranslations('common')
  const [members, setMembers] = useState<Member[]>([])
  const [household, setHousehold] = useState<{ name: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<FamilyRole>('partner')
  const [loading, setLoading] = useState(false)

  const ROLES: { value: FamilyRole; label: string }[] = [
    { value: 'partner', label: t('role.partner') },
    { value: 'child', label: t('role.child') },
    { value: 'parent', label: t('role.parent') },
    { value: 'advisor', label: t('role.advisor') },
  ]

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
    if (!confirm(t('removeMemberConfirm'))) return
    await fetch('/api/family', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div>
      <Topbar title={t('title')} subtitle={household?.name} userName={session?.user?.name ?? ''}
        actions={<Button onClick={() => setOpen(true)} size="sm"><UserPlus size={14} /> {t('invite')}</Button>} />
      <div className="p-4 md:p-8 animate-fade-in">
        <Card>
          <CardHeader><CardTitle>{t('householdMembers')}</CardTitle></CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="py-10 text-center">
                <Users size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">{t('justYou')}</p>
                <Button onClick={() => setOpen(true)} size="sm" className="mt-4"><Plus size={14} /> {t('inviteMember')}</Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {members.map((m) => {
                  const name = m.full_name || m.invited_email || t('invitedUser')
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
                        {!m.accepted && <Badge variant="warning">{t('status.pending')}</Badge>}
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
      <Modal open={open} onClose={() => setOpen(false)} title={t('inviteModal')}>
        <div className="space-y-4">
          <Input label={t('form.emailAddress')} type="email" placeholder={t('form.emailPlaceholder')} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <Select label={t('form.role')} value={inviteRole} onChange={e => setInviteRole(e.target.value as FamilyRole)} options={ROLES} />
          <p className="text-xs text-slate-400">{t('inviteDesc')}</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">{tc('cancel')}</Button>
            <Button onClick={invite} loading={loading} className="flex-1">{t('sendInvite')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
