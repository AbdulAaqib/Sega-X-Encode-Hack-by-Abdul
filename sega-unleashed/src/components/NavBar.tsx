// components/NavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import './navigation-menu.css';

export default function NavBar() {
  const { account } = useWallet();
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = true;
    audio.defaultMuted = true;
    audio.play().catch(() => {});
    const onFirstClick = () => {
      audio.muted = false;
      setMuted(false);
      audio.play().catch(() => {});
      document.removeEventListener('click', onFirstClick);
    };
    document.addEventListener('click', onFirstClick, { once: true });
    return () => document.removeEventListener('click', onFirstClick);
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    audio.muted = next;
    setMuted(next);
    if (!next) audio.play().catch(() => {});
  };

  const links = [
    { href: '/packs', label: 'Buy Packs' },
    { href: '/battles', label: 'Battle' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/nft_characters', label: 'NFT Characters' },
  ];

  return (
    <nav className="navigation-menu-container">
      <audio
        ref={audioRef}
        src="/sonic_theme_song.mp3"
        loop
        autoPlay
        muted={muted}
        playsInline
        style={{ display: 'none' }}
      />

      <div className="nav-left">
        <Link href="/">
          <img src="/SEGA-UNLEASHED.png" alt="Logo" className="nav-logo" />
        </Link>
        <ul className="navigation-menu-list">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`nav-link${pathname === l.href ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="nav-right">
        <button
          className="audio-toggle-btn"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute music' : 'Mute music'}
        >
          <img
            src={muted ? '/audio_mute.png' : '/audio_unmute.png'}
            alt={muted ? 'Muted' : 'Unmuted'}
            className="audio-icon"
          />
        </button>
        {account && <div className="account-info">{account}</div>}
      </div>
    </nav>
  );
}
