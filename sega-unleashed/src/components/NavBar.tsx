'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function NavBar() {
  const pathname = usePathname();
  const links = [
    { href: '/packs', label: 'Buy Packs' },
    { href: '/battles', label: 'Battle' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <nav className="nav-bar">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`nav-link${pathname === l.href ? ' active' : ''}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
