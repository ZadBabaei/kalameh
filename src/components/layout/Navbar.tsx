'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Language } from '@/types/game';
import { t } from '@/lib/i18n';
import { Badge } from '@/components/ui';

interface NavbarProps {
  gameCode?: string;
  language: Language;
  onLanguageToggle: () => void;
}

export default function Navbar({ gameCode, language, onLanguageToggle }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#120e18]/95 backdrop-blur border-b border-[#3d3248]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo + game code badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xl font-bold text-[#f5a623] tracking-tight hover:text-[#e6951a] transition-colors"
          >
            Kalameh
          </Link>
          {gameCode && (
            <Badge variant="warning" size="sm">
              {gameCode}
            </Badge>
          )}
        </div>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/rules"
            className="text-sm font-medium text-[#a89b8c] hover:text-[#f5a623] transition-colors"
          >
            {t('nav.rules', language)}
          </Link>
          <button
            onClick={onLanguageToggle}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-[#3d3248] text-[#a89b8c] hover:border-[#f5a623] hover:text-[#f5a623] transition-colors"
          >
            {t('nav.language', language)}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-[#a89b8c] hover:text-[#f5a623] hover:bg-[#2a2035] transition-colors"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-[#3d3248] bg-[#120e18] px-4 py-3 flex flex-col gap-3">
          <Link
            href="/rules"
            className="text-sm font-medium text-[#a89b8c] hover:text-[#f5a623] transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.rules', language)}
          </Link>
          <button
            onClick={() => {
              onLanguageToggle();
              setMenuOpen(false);
            }}
            className="text-left text-sm font-medium text-[#a89b8c] hover:text-[#f5a623] transition-colors"
          >
            {t('nav.language', language)}
          </button>
        </div>
      )}
    </nav>
  );
}
