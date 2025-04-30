// src/app/api/nfts/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet_address');

  if (!wallet) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }

  const { data: userData, error: userError } = await supabase
    .from('user_data')
    .select<'data', { data: number[] }>('data')
    .eq('wallet_address', wallet)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: userError?.message || 'No user_data found' }, { status: 404 });
  }

  const nftIds = userData.data;
  if (!Array.isArray(nftIds) || nftIds.length === 0) {
    return NextResponse.json({ error: 'No NFT IDs found for this wallet' }, { status: 404 });
  }

  const { data: nfts, error: nftError } = await supabase
    .from('nfts')
    .select('nft_id, nft_data')
    .in('nft_id', nftIds);

  if (nftError) {
    return NextResponse.json({ error: nftError.message }, { status: 500 });
  }

  return NextResponse.json({ nfts });
}
