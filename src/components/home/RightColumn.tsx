'use client'

import { useState, useEffect } from 'react'
import type { DashboardView, WeatherData, Meal, NewsItem } from '@/types'

interface RightColumnProps {
  onNavigate: (view: DashboardView) => void
}

// Mock data — will be replaced with live API calls
const mockWeather: WeatherData = {
  temp: 52,
  feels_like: 48,
  description: 'Partly Cloudy',
  icon: '⛅',
  wind_speed: 8,
  humidity: 65,
  uv_index: 3,
  forecast: [
    { day: 'Mon', icon: '☀️', high: 58, low: 42 },
    { day: 'Tue', icon: '🌧️', high: 50, low: 38 },
    { day: 'Wed', icon: '⛅', high: 55, low: 40 },
    { day: 'Thu', icon: '☀️', high: 62, low: 45 },
    { day: 'Fri', icon: '🌤️', high: 60, low: 43 },
  ],
}

const mockMeals: Meal[] = [
  { type: 'breakfast', name: 'Oatmeal & Berries', emoji: '🥣', time: '7:30 AM', active: false },
  { type: 'lunch', name: 'Grilled Chicken Salad', emoji: '🥗', time: '12:30 PM', active: true },
  { type: 'dinner', name: 'Salmon & Veggies', emoji: '🐟', time: '6:30 PM', active: false },
]

const mockNews: NewsItem[] = [
  { tag: 'TECH', headline: 'AI Infrastructure Spending Hits Record High' },
  { tag: 'MARKET', headline: 'S&P 500 Reaches New All-Time High' },
  { tag: 'DESIGN', headline: 'Figma Announces New AI Design Features' },
]

const mockShopping = [
  { item: 'Chicken breast (3 lb)', checked: false },
  { item: 'Broccoli', checked: true },
  { item: 'Brown rice', checked: false },
  { item: 'Olive oil', checked: false },
]

export default function RightColumn({ onNavigate }: RightColumnProps) {
  const [weather, setWeather] = useState<WeatherData>(mockWeather)

  // Fetch real weather on mount
  useEffect(() => {
    fetch('/api/weather')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setWeather(data) })
      .catch(() => {/* keep mock */})
  }, [])

  return (
    <>
      {/* Weather Card */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Weather
          </h2>
          <span className="text-[10px] text-text-muted">West Milford, NJ</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{weather.icon}</span>
          <div>
            <div className="text-2xl font-bold text-text">{weather.temp}°F</div>
            <div className="text-[10px] text-text-muted">
              Feels {weather.feels_like}° · {weather.description}
            </div>
          </div>
        </div>

        {/* Mini forecast */}
        <div className="flex justify-between border-t border-border pt-2">
          {weather.forecast.slice(0, 5).map((day) => (
            <div key={day.day} className="text-center">
              <div className="text-[9px] text-text-muted font-medium">{day.day}</div>
              <div className="text-sm my-0.5">{day.icon}</div>
              <div className="text-[9px] text-text-muted">
                <span className="text-text font-medium">{day.high}°</span> {day.low}°
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Menu */}
      <button
        onClick={() => onNavigate('nutrition')}
        className="bg-card rounded-xl border border-border p-4 text-left hover:border-accent transition-colors w-full"
      >
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          Today&apos;s Menu
        </h2>
        <div className="space-y-1.5">
          {mockMeals.map((meal) => (
            <div
              key={meal.type}
              className={`flex items-center gap-2 text-sm ${
                meal.active ? 'text-text font-medium' : 'text-text-muted'
              }`}
            >
              <span className="text-base">{meal.emoji}</span>
              <span className="flex-1 truncate">{meal.name}</span>
              <span className="text-[10px]">{meal.time}</span>
            </div>
          ))}
        </div>
      </button>

      {/* News Feed */}
      <div className="bg-card rounded-xl border border-border p-4 flex-1 min-h-0">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          Headlines
        </h2>
        <div className="space-y-2">
          {mockNews.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                {item.tag}
              </span>
              <span className="text-xs text-text-secondary leading-tight line-clamp-2">
                {item.headline}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shopping List Mini */}
      <button
        onClick={() => onNavigate('shopping')}
        className="bg-card rounded-xl border border-border p-4 text-left hover:border-accent transition-colors w-full"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Shopping
          </h2>
          <span className="text-[10px] text-accent font-semibold">
            {mockShopping.filter(s => !s.checked).length} items
          </span>
        </div>
        <div className="space-y-1">
          {mockShopping.slice(0, 4).map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`w-3 h-3 rounded border flex items-center justify-center ${
                item.checked ? 'bg-accent border-accent text-white' : 'border-border'
              }`}>
                {item.checked && '✓'}
              </span>
              <span className={item.checked ? 'text-text-muted line-through' : 'text-text'}>
                {item.item}
              </span>
            </div>
          ))}
        </div>
      </button>
    </>
  )
}
