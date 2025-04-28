// src/app/api/chat/route.ts

import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import type { Player, AssistantResponse } from '../types';

// 1) Ensure Supabase env vars are provided
const supabaseUrl        = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// 2) Initialize Supabase client with service-role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // ─────────────────────────────────────────────────────────────────
    // PARSE + NORMALIZE WALLET FIELD (snake_case or camelCase)
    // ─────────────────────────────────────────────────────────────────
    const { player: playerData, history } = await request.json() as {
      player: Player & Record<string, any>;
      history?: { sender: 'player' | 'bot'; text: string | null }[];
    };

    // Accept either property name and normalize to lower-case
    const originalWallet = playerData.wallet_address_real ?? '';
    const wallet         = originalWallet.toLowerCase();
    const masked         = originalWallet;
    console.log('▶️ player.wallet_address_real (masked):', masked);

    // ─────────────────────────────────────────────────────────────────
    // BUILD + CALL AZURE OPENAI
    // ─────────────────────────────────────────────────────────────────
    const systemPrompt = `IMPORTANT: Respond with PURE JSON ONLY. Do NOT include any commentary, narrative, or markdown fences. Output exactly one JSON object matching this schema:
    {
      "narrative": string,
      "options": [string,string,string,string,string,string],
      "health": {"player": number, "opponent": number},
      "game_over": boolean,
      "winner": string|null,
      "callback": {"url": string,"method": string,"headers": object,"payload": object}
    }
    
    You are Sonic Battle Arena, the over-the-top, hype-filled announcer for a turn-based Pokémon-style game starring Sega Sonic Universe characters.
    
    Opponent Generation Instructions:
    Use these trait pools:
    const TRAITS = {
      characters: ["Sonic","Tails","Knuckles","Amy"],
      backgrounds: ["Green Hill","Blue Space"],
      lightning: ["Red Lightning","Blue Lightning"],
      gear: ["Speed Shoes","Dash Gloves","Power Ring","Shield Booster"]
    };
    
    Use these pack distributions to determine how many cards and rarities:
    const PACKS = {
      Bronze: { size: 3, distribution: { Common:2, Rare:1, Epic:0, Legendary:0 } },
      Silver: { size: 5, distribution: { Common:3, Rare:1, Epic:1, Legendary:0 } },
      Gold:   { size: 7, distribution: { Common:3, Rare:2, Epic:1, Legendary:1 } }
    };
    
    Rarity multipliers:
    - Common: ×1.0 health & damage
    - Rare: ×1.1
    - Epic: ×1.25
    - Legendary: ×1.5
    
    Lightning multiplier on damage:
    - Blue Lightning: +20% damage
    - Red Lightning: no bonus
    
    Battle Rules:
    1. Always generate a new opponent JSON using the TRAITS and PACKS specifications.
    2. You also receive the player JSON with base health and move set.
    3. Each player turn:
       a. Present exactly 6 distinct move options.
       b. After the user picks one, calculate damage = base move damage × applicable multipliers and subtract from opponent’s HP.
    4. Then the opponent auto-selects one of its 6 moves; calculate and subtract from the player’s HP.
    5. Continue until either HP ≤ 0.
    6. On battle end, set "game_over": true and "winner" to the name of the victor.
    8. Stay hyped, fun, and in-character as a Sonic arena announcer!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: JSON.stringify({ player: playerData, wallet_address: wallet }) },
      ...(history ?? [])
        .filter(h => typeof h.text === 'string' && h.text.trim())
        .map(h => ({ role: h.sender === 'player' ? 'user' : 'assistant', content: h.text! }))
    ];

    const aiClient = new AzureOpenAI({
      endpoint:   process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey:     process.env.AZURE_OPENAI_KEY!,
      apiVersion: '2024-05-01-preview'
    });

    const completion = await aiClient.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.0,
      top_p: 1,
    });

    const rawResponse = completion.choices[0].message?.content?.trim() ?? '';
    const parsed: AssistantResponse = JSON.parse(rawResponse);

    // ─────────────────────────────────────────────────────────────────
    // CLAMP + FINALIZE GAME STATE
    // ─────────────────────────────────────────────────────────────────
    parsed.health.player   = Math.max(0, parsed.health.player);
    parsed.health.opponent = Math.max(0, parsed.health.opponent);

    // Determine game over and correct winner
    if (parsed.health.opponent <= 0) {
      parsed.game_over = true;
      parsed.winner = playerData.name;
    } else if (parsed.health.player <= 0) {
      parsed.game_over = true;
      parsed.winner = null;
    } else {
      parsed.game_over = false;
      parsed.winner = null;
    }

    // ─────────────────────────────────────────────────────────────────
    // SUPABASE: UPDATE WINS BY WALLET ADDRESS ON PLAYER VICTORY
    // ─────────────────────────────────────────────────────────────────
    if (wallet && parsed.game_over === true && parsed.winner === playerData.name) {
      console.log('🛠️ Updating wins for wallet', masked);

      const { data: matchingUser, error: selectError } = await supabase
        .from('user_data')
        .select('*')
        .ilike('wallet_address', wallet)
        .single();

      if (selectError) {
        console.error('❌ Supabase select error:', selectError);
      } else if (matchingUser) {
        const newWins = (matchingUser.wins ?? 0) + 1;
        const { data: updated, error: updateError } = await supabase
          .from('user_data')
          .update({ wins: newWins })
          .ilike('wallet_address', wallet)
          .select();

        if (updateError) {
          console.error('❌ Supabase update error:', updateError);
        } else {
          console.log('✅ Wins updated for', masked, '->', newWins);
        }
      } else {
        console.warn('⚠️ No matching user for wallet', masked);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // SUCCESS: return the game state
    // ─────────────────────────────────────────────────────────────────
    return NextResponse.json(parsed);
  }
  catch (err: any) {
    console.error('❌ Handler error:', err);
    const fallback: AssistantResponse = {
      narrative: '⚠️ An unexpected error occurred. Please try again.',
      options: [],
      health: { player: 0, opponent: 0 },
      game_over: false,
      winner: null,
      callback: { url: '', method: '', headers: {}, payload: {} }
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
