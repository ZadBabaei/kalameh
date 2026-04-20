'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Language } from '@/types/game';
import { t } from '@/lib/i18n';
import { Badge, Logo } from '@/components/ui';

interface NavbarProps {
  gameCode?: string;
  language: Language;
  onLanguageToggle: () => void;
}

export default function Navbar({ gameCode, language, onLanguageToggle }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#120e18]/85 backdrop-blur-md border-b border-[#3d3248]/60 shadow-[0_1px_0_0_rgba(245,166,35,0.06),0_8px_24px_-12px_rgba(0,0,0,0.5)]">
      {/* Thin gold accent line at top */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f5a623]/60 to-transparent" />

      <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        {/* Left: Logo + wordmark + game code */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2 md:gap-2.5 transition-transform duration-200 hover:scale-[1.02]"
            aria-label="Kalameh home"
          >
            <span className="relative flex items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[#f5a623]/0 group-hover:bg-[#f5a623]/15 blur-md transition-all duration-300"
              />
              <Logo size={28} className="relative md:hidden text-[#f0e6d3]" />
              <Logo size={32} className="relative hidden md:block text-[#f0e6d3]" />
            </span>
            <span className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-b from-[#ffd27a] to-[#f5a623] bg-clip-text text-transparent group-hover:drop-shadow-[0_0_10px_rgba(245,166,35,0.5)] transition-all duration-200">
              Kalameh
            </span>
          </Link>

          {gameCode && (
            <Badge variant="warning" size="sm" className="font-mono tracking-wider">
              {gameCode}
            </Badge>
          )}
        </div>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-2 md:gap-3">
          <Link
            href="/rules"
            className="relative text-sm font-medium text-[#a89b8c] hover:text-[#f5a623] transition-colors px-3 py-1.5 rounded-lg group"
          >
            <span className="relative z-10">{t('nav.rules', language)}</span>
            <span
              aria-hidden="true"
              className="absolute inset-x-3 bottom-1 h-[1.5px] bg-[#f5a623] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
            />
          </Link>

          <button
            onClick={onLanguageToggle}
            className="relative text-sm font-medium px-3 py-1.5 rounded-lg border border-[#3d3248] text-[#a89b8c] hover:border-[#f5a623]/70 hover:text-[#f5a623] hover:shadow-[0_0_12px_rgba(245,166,35,0.25)] transition-all duration-200 flex items-center gap-1.5"
            aria-label={t('nav.language', language)}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <span>{t('nav.language', language)}</span>
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-[#a89b8c] hover:text-[#f5a623] hover:bg-[#2a2035]/60 active:bg-[#2a2035] transition-colors"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <div className="relative w-5 h-5">
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1 w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${
                menuOpen ? 'translate-y-[7px] rotate-45' : ''
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute left-0 top-[9px] w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${
                menuOpen ? 'opacity-0 scale-x-0' : ''
              }`}
            />
            <span
              aria-hidden="true"
              className={`absolute left-0 top-[17px] w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${
                menuOpen ? '-translate-y-[7px] -rotate-45' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile menu — slide-down panel */}
      <div
        className={`sm:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          menuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-[#3d3248] bg-[#120e18]/95 backdrop-blur px-4 py-3 flex flex-col gap-1">
          <Link
            href="/rules"
            className="text-sm font-medium text-[#a89b8c] hover:text-[#f5a623] hover:bg-[#2a2035]/60 transition-colors px-3 py-2 rounded-lg"
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.rules', language)}
          </Link>
          <button
            onClick={() => {
              onLanguageToggle();
              setMenuOpen(false);
            }}
            className="text-left text-sm font-medium text-[#a89b8c] hover:text-[#f5a623] hover:bg-[#2a2035]/60 transition-colors px-3 py-2 rounded-lg flex items-center gap-2"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            {t('nav.language', language)}
          </button>
        </div>
      </div>
    </nav>
  );
}
