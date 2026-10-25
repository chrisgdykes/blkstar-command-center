import { NextResponse } from 'next/server'

const API_KEY = process.env.OPENWEATHER_API_KEY || '3290abf87ad639ddbab595c72aa408f7'
const LAT = 41.1065 // West Milford, NJ
const LON = -74.3668

// Cache weather for 30 minutes
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 30 * 60 * 1000

export async function GET() {
  // Serve cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    // Current weather
    const currentRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`
    )
    if (!currentRes.ok) throw new Error(`Weather API: ${currentRes.status}`)
    const current = await currentRes.json()

    // 5-day forecast
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`
    )
    if (!forecastRes.ok) throw new Error(`Forecast API: ${forecastRes.status}`)
    const forecastData = await forecastRes.json()

    // Group forecast by day, get daily high/low
    const dailyMap = new Map<string, { highs: number[]; lows: number[]; icon: string }>()
    for (const entry of forecastData.list) {
      const day = new Date(entry.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { highs: [], lows: [], icon: mapWeatherIcon(entry.weather[0]?.icon || '') })
      }
      const d = dailyMap.get(day)!
      d.highs.push(entry.main.temp_max)
      d.lows.push(entry.main.temp_min)
    }

    const forecast = Array.from(dailyMap.entries())
      .slice(0, 5)
      .map(([day, d]) => ({
        day,
        icon: d.icon,
        high: Math.round(Math.max(...d.highs)),
        low: Math.round(Math.min(...d.lows)),
      }))

    const result = {
      temp: Math.round(current.main.temp),
      feels_like: Math.round(current.main.feels_like),
      description: current.weather[0]?.description
        ? current.weather[0].description.replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Unknown',
      icon: mapWeatherIcon(current.weather[0]?.icon || ''),
      wind_speed: Math.round(current.wind?.speed || 0),
      humidity: current.main?.humidity || 0,
      uv_index: 0, // UV requires separate API call
      forecast,
    }

    cache = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather' },
      { status: 500 }
    )
  }
}

function mapWeatherIcon(owmIcon: string): string {
  const map: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '🌤️', '02n': '☁️',
    '03d': '⛅', '03n': '⛅',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '🌨️', '13n': '🌨️',
    '50d': '🌫️', '50n': '🌫️',
  }
  return map[owmIcon] || '🌡️'
}
