'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DashboardView } from '@/types'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HomeView from '@/components/home/HomeView'

export default function Dashboard() {
  const [view, setView] = useState<DashboardView>('home')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Initialize theme from localStorage
  useEffect(() => {
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

  const navigateTo = useCallback((v: DashboardView) => {
    setView(v)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">
      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        currentView={view}
        onNavigate={navigateTo}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden px-5">
        {view === 'home' && <HomeView onNavigate={navigateTo} />}
        {view === 'day' && <PlaceholderView label="Day View" onBack={() => navigateTo('home')} />}
        {view === 'week' && <PlaceholderView label="Week View" onBack={() => navigateTo('home')} />}
        {view === 'finance' && <PlaceholderView label="Finance Dashboard" onBack={() => navigateTo('home')} />}
        {view === 'briefing' && <PlaceholderView label="Morning Briefing" onBack={() => navigateTo('home')} />}
        {view === 'fitness' && <PlaceholderView label="Fitness Dashboard" onBack={() => navigateTo('home')} />}
        {view === 'nutrition' && <PlaceholderView label="Kitchen OS" onBack={() => navigateTo('home')} />}
        {view === 'shopping' && <PlaceholderView label="Shopping / PO" onBack={() => navigateTo('home')} />}
      </main>

      {/* Footer */}
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
