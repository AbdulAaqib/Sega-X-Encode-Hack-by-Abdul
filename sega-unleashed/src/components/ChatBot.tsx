// File: src/components/ChatBot.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { Player, AssistantResponse } from '../app/types';
import styles from './ChatBot.module.css';

interface HistoryItem {
  sender: 'player' | 'bot';
  text: string;
}

interface ChatBotProps {
  player: Player;
}

const ChatBot: React.FC<ChatBotProps> = ({ player }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [health, setHealth] = useState({ player: player.health, opponent: player.health });
  const [loading, setLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);

  // Kick off initial battle/opponent generation
  useEffect(() => {
    sendMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (playerChoice: string | null) => {
    setLoading(true);
    const newHistory = [...history];
    if (playerChoice) newHistory.push({ sender: 'player', text: playerChoice });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, history: newHistory }),
      });
      const data: AssistantResponse = await res.json();

      newHistory.push({ sender: 'bot', text: data.narrative });
      setHistory(newHistory);
      setOptions(data.options);
      setHealth(data.health);
      if (data.game_over) setOptions([]);
    } catch (err) {
      console.error('ChatBot error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.chatWindow} ref={chatWindowRef}>
          {history.map((msg, i) => (
            <div
              key={i}
              className={
                msg.sender === 'player'
                  ? styles.bubbleRight
                  : styles.bubbleLeft
              }
            >
              {msg.text}
            </div>
          ))}
        </div>

        <div className={styles.statusBar}>
          <span>Player: {health.player} HP</span>
          <span>Opponent: {health.opponent} HP</span>
        </div>

        <div className={styles.optionsBar}>
          {options.map((opt, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => sendMessage(opt)}
              className={styles.optionButton}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
