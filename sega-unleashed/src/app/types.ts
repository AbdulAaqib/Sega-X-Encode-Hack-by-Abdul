// app/types.ts

export interface Player {
  name: string;
  description: string;
  attributes: {
    trait_type: string;
    value: string | string[];
  }[];
  health: number;
  wallet_address_real: string;
}

export interface AssistantResponse {
  narrative: string;
  options: [string, string, string, string];
  health: {
    player: number;
    opponent: number;
  };
  game_over: boolean;
  winner: string | null;
  callback: {
    url: string;
    method: string;
    headers: Record<string, string>;
    payload: Record<string, unknown>; // ✅ safer than `any`
  };
}

export interface ChatMessage {
  sender: 'player' | 'bot';
  text: string;
}
