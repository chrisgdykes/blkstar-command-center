import type { LifeArea, EventType } from '@/config/theme'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  life_area: LifeArea
  event_type: EventType
  start_at: string // ISO datetime
  end_at: string
  all_day: boolean
  location?: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  source: 'manual' | 'google' | 'todoist'
  external_id?: string
  is_multi_day?: boolean
}

export interface WeatherData {
  temp: number
  feels_like: number
  description: string
  icon: string
  wind_speed: number
  humidity: number
  uv_index: number
  forecast: ForecastDay[]
}

export interface ForecastDay {
  day: string
  icon: string
  high: number
  low: number
}

export interface TodoistTask {
  id: string
  content: string
  description?: string
  due?: {
    date: string
    datetime?: string
  }
  priority: number
  is_completed: boolean
  project_id?: string
}

export interface TaskStats {
  due_today: number
  due_tomorrow: number
  total: number
  completed: number
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner'
  name: string
  emoji: string
  time: string
  active: boolean
}

export interface NewsItem {
  tag: string
  headline: string
  url?: string
}

export interface FooterCard {
  id: string
  label: string
  value: string
  subtext?: string
  icon?: string
}

export type DashboardView = 'home' | 'day' | 'week' | 'finance' | 'briefing' | 'fitness' | 'nutrition' | 'shopping'
