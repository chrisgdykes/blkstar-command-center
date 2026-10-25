'use client'

import { useState, useEffect } from 'react'
import type { DashboardView } from '@/types'

interface HeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  currentView: DashboardView
  onNavigate: (view: DashboardView) => void
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function Header({ theme, onToggleTheme, currentView, onNavigate }: HeaderProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const greeting = now ? getGreeting(now.getHours()) : 'Welcome'

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-bg border-b border-border shrink-0">
      {/* Left — Greeting + Date */}
      <div className="flex items-center gap-4">
        {currentView !== 'home' && (
          <button
            onClick={() => onNavigate('home')}
            className="text-accent hover:text-accent-dark mr-2 font-semibold text-sm transition-colors"
          >
            ← Home
          </button>
        )}
        <button
          onClick={() => onNavigate('briefing')}
          className="hover:opacity-80 transition-opacity"
        >
          <h1 className="text-lg font-bold text-charcoal leading-none">
            {greeting}, Chris
          </h1>
        </button>
        <span className="text-text-muted text-sm">
          {now ? formatDate(now) : ''}
        </span>
      </div>

      {/* Center — BLKSTAR branding */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-xs font-bold tracking-[0.3em] text-text-muted uppercase">
          BLKSTAR Command Center
        </span>
      </div>

      {/* Right — Clock + Theme Toggle + Week Button */}
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-charcoal tabular-nums">
          {now ? formatTime(now) : '--:--'}
        </span>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-lg bg-card-alt border border-border flex items-center justify-center hover:bg-border transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {/* Week View Button */}
        <button
          onClick={() => onNavigate('week')}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark transition-colors"
        >
          Week
        </button>
      </div>
    </header>
  )
}
