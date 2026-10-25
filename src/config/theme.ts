// BLKSTAR Command Center — Centralized Theme Configuration
// All colors go through CSS variables. Components NEVER hardcode hex values.

export const lightTheme = {
  bg: '#F5F3EF',
  surface: '#FAFAF7',
  card: '#FFFFFF',
  cardAlt: '#F0EDE8',
  border: '#E2DED6',
  text: '#1a1a2e',
  textSecondary: '#6B6B7B',
  textMuted: '#A0A0AD',
  accent: '#A78BFA',
  accentDark: '#8b5cf6',
  charcoal: '#2D2D3F',
  todayBorder: '#65D843',
  pastDayBg: '#F2E8E8',
} as const

export const darkTheme = {
  bg: '#0d1117',
  surface: '#161b22',
  card: '#1c2333',
  cardAlt: '#242d3d',
  border: '#30363d',
  text: '#e6edf3',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
  accent: '#A78BFA',
  accentDark: '#8b5cf6',
  charcoal: '#e6edf3',
  todayBorder: '#65D843',
  pastDayBg: '#3d2a2a',
} as const

// BLKSTAR Life Area Colors — canonical, centralized
export const lifeAreaColors = {
  medical: '#3B82F6',
  nutrition: '#F97316',
  financial: '#10B981',
  fitness: '#EF4444',
  pet_care: '#14B8A6',
  business: '#A78BFA',
  home: '#A87C5A',
  personal: '#9CA3AF',
} as const

export type LifeArea = keyof typeof lifeAreaColors

export const lifeAreaLabels: Record<LifeArea, string> = {
  medical: 'Medical',
  nutrition: 'Nutrition',
  financial: 'Financial',
  fitness: 'Fitness',
  pet_care: 'Pet Care',
  business: 'Business',
  home: 'Home',
  personal: 'Personal',
}

// Event Types — canonical 7 only
export const eventTypes = [
  'appointment',
  'work',
  'meeting',
  'deep_work',
  'task',
  'routine',
  'plan',
] as const

export type EventType = (typeof eventTypes)[number]

export const eventTypeLabels: Record<EventType, string> = {
  appointment: 'Appointment',
  work: 'Work',
  meeting: 'Meeting',
  deep_work: 'Deep Work',
  task: 'Task',
  routine: 'Routine',
  plan: 'Plan',
}
