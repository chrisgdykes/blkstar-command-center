// Seeds Kitchen OS tables. Run from repo root:  node --env-file=.env.local scripts/seed-kitchen.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing env vars. Run with --env-file=.env.local'); process.exit(1) }
const sb = createClient(url, key)
const { recipes, days, meals } = JSON.parse(readFileSync(new URL('./kitchen-seed.json', import.meta.url), 'utf8'))
for (const [table, rows, conflict] of [
  ['kitchen_recipes', recipes, 'id'],
  ['kitchen_days', days, 'plan_date'],
  ['kitchen_meals', meals, 'plan_date,slot'],
]) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: conflict })
  console.log(table, error ? 'ERROR ' + error.message : 'ok (' + rows.length + ' rows)')
}
