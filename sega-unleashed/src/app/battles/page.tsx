'use client';

import React, { useState } from 'react';

export default function Battles() {
  const [log, setLog] = useState<string[]>([]);
  const startBattle = () =>
    setLog((prev) => [
      ...prev,
      `Battle ${prev.length + 1}: ${Math.random() > 0.5 ? 'Victory!' : 'Defeat...'}`,
    ]);

  return (
    <div className="page">
      <h2>Geminin Integrated Battles</h2>
      <button onClick={startBattle}>Start Battle</button>
      <ul className="battle-log">
        {log.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}