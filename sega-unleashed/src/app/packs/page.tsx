'use client';

import React, { useState } from 'react';

export default function PackOpenings() {
  const [packs, setPacks] = useState<number[][]>([]);
  const openPack = () =>
    setPacks((prev) => [
      ...prev,
      Array.from({ length: 5 }, () => Math.floor(Math.random() * 100)),
    ]);

  return (
    <div className="page">
      <h2>Pack Openings</h2>
      <button onClick={openPack}>Open New Pack</button>
      <div className="packs-list">
        {packs.map((pack, i) => (
          <div key={i} className="pack">
            <strong>Pack {i + 1}:</strong> {pack.join(', ')}
          </div>
        ))}
      </div>
    </div>
  );
}
