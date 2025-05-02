// File: src/app/api/leaderboard/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  // 1. Fetch entire table
  const { data, error } = await supabase
    .from('user_data')
    .select('*')       // grab all columns
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. Sort in-memory by wins desc and take top 10
  //    Ensure 'wins' is a number field on each row
  const top10 = (data ?? [])
    .sort((a, b) => (b.wins || 0) - (a.wins || 0))
    .slice(0, 10)

  return NextResponse.json(top10)
}
