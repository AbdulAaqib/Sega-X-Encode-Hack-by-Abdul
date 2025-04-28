export interface Player {
    name: string;
    description: string;
    attributes: { trait_type: string; value: string | string[] }[];
    health: number;
  }
  
  export interface AssistantResponse {
    narrative: string;
    options: string[];
    health: { player: number; opponent: number };
    game_over: boolean;
    winner: string | null;
  }
  
  export interface Message {
    sender: 'player' | 'bot';
    text: string;
    health?: { player: number; opponent: number };
    options?: string[];
  }
  