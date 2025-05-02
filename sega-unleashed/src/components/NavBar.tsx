// components/NavBar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import './navigation-menu.css';

export default function NavBar() {
  const { account } = useWallet();
  const pathname = usePathname();

  // track when we've hydrated on the client
  const [isClient, setIsClient] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);

  // mark client after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize audio, unmute on first user interaction
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = true;
    audio.defaultMuted = true;
    audio.play().catch(() => {});
    const enableAudio = () => {
      audio.muted = false;
      setMuted(false);
      audio.play().catch(() => {});
      document.removeEventListener('click', enableAudio);
    };
    document.addEventListener('click', enableAudio, { once: true });
    return () => document.removeEventListener('click', enableAudio);
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
    { href: '/nft_characters', label: 'NFT Characters' },
    { href: '/leaderboard', label: 'Leaderboard' },
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
        <Link href="/" className="nav-logo-link">
          <Image
            src="/SEGA-UNLEASHED.png"
            alt="Logo"
            className="nav-logo"
            width={150}
            height={50}
            priority
          />
        </Link>

        <ul className="navigation-menu-list">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`nav-link${pathname === href ? ' active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="nav-right">
        {isClient && (
          <>
            {/* Audio toggle */}
            <button
              className="audio-toggle-btn"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute music' : 'Mute music'}
            >
              <Image
                src={muted ? '/audio_mute.png' : '/audio_unmute.png'}
                alt={muted ? 'Muted' : 'Unmuted'}
                className="audio-icon"
                width={24}
                height={24}
              />
            </button>

            {/* GitHub button */}
            <Link
              href="https://github.com/AbdulAaqib/Sega-X-Encode-Hack-by-Abdul"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
              aria-label="GitHub"
            >
              <Image
                src="/github_logo.png"
                alt="GitHub"
                className="social-icon"
                width={24}
                height={24}
              />
            </Link>

            {/* LinkedIn button */}
            <Link
              href="https://www.linkedin.com/in/abdulaaqib"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
              aria-label="LinkedIn"
            >
              <Image
                src="/linkedin_logo.png"
                alt="LinkedIn"
                className="social-icon"
                width={24}
                height={24}
              />
            </Link>

            {account && <div className="account-info">{account}</div>}
          </>
        )}
      </div>
    </nav>
  );
}
