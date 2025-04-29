import { createClient } from '@supabase/supabase-js';               // Supabase JS client⁽³⁾
import { NextResponse } from 'next/server';                        // Next.js Route Handler⁽⁴⁾

const supabase = createClient(
  process.env.SUPABASE_URL!,                                     // your project URL
  process.env.SUPABASE_SERVICE_ROLE_KEY!,                        // service-role key⁽³⁾
  { auth: { persistSession: false, autoRefreshToken: false } }   // disable browser-only behaviors⁽³⁾
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet_address');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
  }

  // 1) Fetch the array of NFT IDs for this wallet  
  const { data: userData, error: userError } = await supabase
    .from('user_data')
    .select<'data', { data: number[] }>('data')
    .eq('wallet_address', wallet)
    .single();                                                   // expect one row⁽⁸⁾

  if (userError || !userData) {
    return NextResponse.json({ error: userError?.message || 'No user_data found' }, { status: 404 });
  }

  const nftIds = userData.data;                                  // e.g. [83,84,…]  

  // 2) Fetch all matching NFTs in one query using `.in()` filter⁽⁸⁾
  const { data: nfts, error: nftError } = await supabase
    .from('nfts')
    .select('nft_id, nft_data')
    .in('nft_id', nftIds);

  if (nftError) {
    return NextResponse.json({ error: nftError.message }, { status: 500 });
  }

  return NextResponse.json({ nfts });                            // return array of { nft_id, nft_data }⁽⁵⁾
}
