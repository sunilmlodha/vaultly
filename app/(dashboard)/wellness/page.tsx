'use client'

import { Topbar } from '@/components/layout/topbar'
import { WellnessCheckinCard } from '@/components/enterprise/wellness-checkin-card'
import { ExternalLink } from 'lucide-react'

const RESOURCES = [
  {
    title: 'Debt help',
    url: 'https://www.stepchange.org',
    description: 'Free debt advice',
    domain: 'stepchange.org',
    colour: 'bg-rose-50 border-rose-100',
    iconColour: 'text-rose-500',
  },
  {
    title: 'Benefits calculator',
    url: 'https://www.gov.uk/benefits-calculators',
    description: 'Check what you\'re entitled to',
    domain: 'gov.uk',
    colour: 'bg-sky-50 border-sky-100',
    iconColour: 'text-sky-500',
  },
  {
    title: 'Money guidance',
    url: 'https://www.moneyhelper.org.uk',
    description: 'Free and impartial money guidance',
    domain: 'moneyhelper.org.uk',
    colour: 'bg-emerald-50 border-emerald-100',
    iconColour: 'text-emerald-500',
  },
  {
    title: 'Mental health + money',
    url: 'https://www.mind.org.uk',
    description: 'When finances affect mental health',
    domain: 'mind.org.uk',
    colour: 'bg-violet-50 border-violet-100',
    iconColour: 'text-violet-500',
  },
]

export default function WellnessPage() {
  return (
    <div>
      <Topbar title="Wellness" subtitle="Your weekly financial check-in" />
      <div className="p-4 md:p-8 space-y-8 animate-fade-in">
        {/* Weekly Check-in */}
        <div className="max-w-lg">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Weekly Check-in</h2>
          <WellnessCheckinCard />
        </div>

        {/* Resources */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Financial Wellbeing Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RESOURCES.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col justify-between p-4 rounded-2xl border ${r.colour} hover:shadow-sm transition-all group`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                    <ExternalLink size={13} className={`${r.iconColour} mt-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <p className="text-xs text-slate-500">{r.description}</p>
                </div>
                <p className="text-xs text-slate-400 mt-3">{r.domain}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
