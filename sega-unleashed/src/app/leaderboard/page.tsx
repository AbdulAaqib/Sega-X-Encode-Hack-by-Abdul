'use client';

import React, { useEffect, useState } from 'react';

type Player = { name: string; score: number };

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<Player[]>([]);

  useEffect(() => {
    setLeaders([
      { name: 'UserA', score: 1200 },
      { name: 'UserB', score: 1100 },
      { name: 'UserC', score: 900 },
    ]);
  }, []);

  return (
    <div className="page">
      <h2>Leaderboard</h2>
      <ol>
        {leaders.map((p, i) => (
          <li key={i}>
            {p.name} — {p.score} pts
          </li>
        ))}
      </ol>
    </div>
  );
}