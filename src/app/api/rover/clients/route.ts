import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const VALID_SERVICES = ['overnight', 'drop-in', 'day sitting', 'dog walk'] as const
type ServiceKey = typeof VALID_SERVICES[number]

interface RateInput {
  service_key: ServiceKey
  rate: number
}

interface ClientInput {
  name: string
  dogs: string[]
  pet_count?: number
  notes?: string
  rates: RateInput[]
}

function db() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// ── GET /api/rover/clients ────────────────────────────────────────────────────
// Returns all clients with their rates

export async function GET() {
  const supabase = db()

  const { data: clients, error } = await supabase
    .from('rover_clients')
    .select(`
      id, name, dogs, pet_count, notes, created_at,
      rover_rates ( service_key, rate )
    `)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(clients)
}

// ── POST /api/rover/clients ───────────────────────────────────────────────────
// Create a new client with optional rates

export async function POST(req: NextRequest) {
  const supabase = db()
  const body = await req.json() as ClientInput

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Insert client
  const { data: client, error: clientErr } = await supabase
    .from('rover_clients')
    .insert({ name: body.name.trim(), dogs: body.dogs ?? [], pet_count: body.pet_count ?? 1, notes: body.notes ?? null })
    .select()
    .single()

  if (clientErr || !client) {
    return NextResponse.json({ error: clientErr?.message ?? 'insert failed' }, { status: 500 })
  }

  // Insert rates
  if (body.rates?.length) {
    const rateRows = body.rates
      .filter(r => VALID_SERVICES.includes(r.service_key) && r.rate > 0)
      .map(r => ({ client_id: client.id, service_key: r.service_key, rate: r.rate }))

    if (rateRows.length) {
      const { error: rateErr } = await supabase.from('rover_rates').insert(rateRows)
      if (rateErr) {
        return NextResponse.json({ error: rateErr.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ id: client.id }, { status: 201 })
}

// ── PUT /api/rover/clients ────────────────────────────────────────────────────
// Update a client and replace all their rates

export async function PUT(req: NextRequest) {
  const supabase = db()
  const body = await req.json() as ClientInput & { id: string }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Update client row
  const { error: clientErr } = await supabase
    .from('rover_clients')
    .update({ name: body.name.trim(), dogs: body.dogs ?? [], pet_count: body.pet_count ?? 1, notes: body.notes ?? null })
    .eq('id', body.id)

  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 500 })
  }

  // Replace rates: delete existing, insert new
  await supabase.from('rover_rates').delete().eq('client_id', body.id)

  if (body.rates?.length) {
    const rateRows = body.rates
      .filter(r => VALID_SERVICES.includes(r.service_key) && r.rate > 0)
      .map(r => ({ client_id: body.id, service_key: r.service_key, rate: r.rate }))

    if (rateRows.length) {
      const { error: rateErr } = await supabase.from('rover_rates').insert(rateRows)
      if (rateErr) {
        return NextResponse.json({ error: rateErr.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE /api/rover/clients ─────────────────────────────────────────────────
// Delete a client (rates cascade)

export async function DELETE(req: NextRequest) {
  const supabase = db()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabase.from('rover_clients').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
