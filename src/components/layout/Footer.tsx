'use client'

import type { DashboardView } from '@/types'

interface FooterProps {
  onNavigate: (view: DashboardView) => void
}

interface FooterCardData {
  id: string
  label: string
  value: string
  subtext: string
  navigateTo?: DashboardView
}

// Static placeholder data — will be replaced with live data from app endpoints
const footerCards: FooterCardData[] = [
  { id: 'income', label: 'Income & Expenses', value: '$—', subtext: 'This month', navigateTo: 'finance' },
  { id: 'accounts', label: 'Accounts', value: '$—', subtext: 'Total balance', navigateTo: 'finance' },
  { id: 'networth', label: 'Net Worth', value: '$—', subtext: 'Updated today', navigateTo: 'finance' },
  { id: 'fitness', label: 'Fitness', value: '—', subtext: 'Chris & Eryn', navigateTo: 'fitness' },
  { id: 'rover', label: 'Rover', value: '🐕', subtext: 'Next walk TBD' },
  { id: 'opentime', label: 'Open Time', value: '—h', subtext: 'Available today' },
]

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="shrink-0 px-5 pb-3 pt-2">
      <div className="grid grid-cols-6 gap-3">
        {footerCards.map((card) => (
          <button
            key={card.id}
            onClick={() => card.navigateTo && onNavigate(card.navigateTo)}
            className={`bg-card rounded-xl border border-border px-3 py-2.5 text-left transition-all
              ${card.navigateTo ? 'hover:border-accent hover:shadow-sm cursor-pointer' : 'cursor-default'}`}
          >
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div className="text-lg font-bold text-text leading-tight">
              {card.value}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">
              {card.subtext}
            </div>
          </button>
        ))}
      </div>
    </footer>
  )
}
