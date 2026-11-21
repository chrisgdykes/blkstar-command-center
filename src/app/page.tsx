'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DashboardView } from '@/types'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HomeView from '@/components/home/HomeView'
import KitchenDay from '@/components/kitchen/KitchenDay'
import KitchenShopping from '@/components/kitchen/KitchenShopping'
import DayView from '@/components/calendar/DayView'
import PlannerView from '@/components/calendar/PlannerView'
import FitnessView from '@/components/fitness/FitnessView'
import RoverView from '@/components/rover/RoverView'

export default function Dashboard() {
  const [view, setView] = useState<DashboardView>('home')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    setSelectedDate(new Date())
    const saved = localStorage.getItem('blkstar-theme') as 'light' | 'dark' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('blkstar-theme', next)
  }, [theme])

  const navigateTo = useCallback((v: DashboardView, date?: Date) => {
    if (date) setSelectedDate(date)
    setView(v)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view !== 'home' && !(e.target instanceof HTMLInputElement)) setView('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        currentView={view}
        onNavigate={navigateTo}
      />

      <main className="flex-1 overflow-hidden px-5">
        {view === 'home' && <HomeView onNavigate={navigateTo} />}
        {view === 'day' && selectedDate && (
          <DayView
            date={selectedDate}
            onBack={() => navigateTo('home')}
            onDateChange={(d) => setSelectedDate(d)}
          />
        )}
        {view === 'week' && <PlannerView onBack={() => navigateTo('home')} />}
        {view === 'planner' && <PlannerView onBack={() => navigateTo('home')} />}
        {view === 'finance' && <PlaceholderView label="Finance Dashboard" onBack={() => navigateTo('home')} />}
        {view === 'briefing' && <PlaceholderView label="Morning Briefing" onBack={() => navigateTo('home')} />}
        {view === 'fitness' && <FitnessView onBack={() => navigateTo('home')} />}
        {view === 'rover' && <RoverView onBack={() => navigateTo('home')} />}
        {view === 'nutrition' && <KitchenDay onBack={() => navigateTo('home')} />}
        {view === 'shopping' && <KitchenShopping onBack={() => navigateTo('home')} />}
      </main>

      <Footer onNavigate={navigateTo} />
    </div>
  )
}

function PlaceholderView({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <button
        onClick={onBack}
        className="text-accent hover:text-accent-dark transition-colors text-sm font-medium"
      >
        ← Home
      </button>
      <h2 className="text-2xl font-bold text-text">{label}</h2>
      <p className="text-text-muted text-sm">Coming soon</p>
    </div>
  )
}
