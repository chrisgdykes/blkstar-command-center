'use client'

import type { DashboardView } from '@/types'
import LeftColumn from './LeftColumn'
import CenterColumn from './CenterColumn'
import RightColumn from './RightColumn'

interface HomeViewProps {
  onNavigate: (view: DashboardView) => void
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="flex gap-4 h-full overflow-hidden py-2">
      {/* Left Column — 280px fixed */}
      <div className="w-[280px] shrink-0 flex flex-col gap-3 overflow-hidden">
        <LeftColumn onNavigate={onNavigate} />
      </div>

      {/* Center Column — flex fill */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <CenterColumn onNavigate={onNavigate} />
      </div>

      {/* Right Column — 280px fixed */}
      <div className="w-[280px] shrink-0 flex flex-col gap-3 overflow-hidden">
        <RightColumn onNavigate={onNavigate} />
      </div>
    </div>
  )
}
