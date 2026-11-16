import { createClient } from '@supabase/supabase-js'
// Server-side only (service role). Kitchen tables have RLS on with no public policies.
export const kitchenDb = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
