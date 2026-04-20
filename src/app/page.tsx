'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Navbar, ParticleBackground } from '@/components/layout';
import { Button, Input, Card } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = gameCode.trim().toUpperCase();
    const name = playerName.trim();

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character game code');
      return;
    }
    if (!name) {
      setError('Please enter your name');
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/games/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to join game');
        return;
      }

      const data = await res.json();
      localStorage.setItem('kalameh-gameCode', code);
      localStorage.setItem('kalameh-playerId', String(data.playerId));
      localStorage.setItem(`kalameh-playerId-${code}`, String(data.playerId));
      localStorage.setItem('kalameh-playerName', name);
      router.push(`/game/${code}/lobby`);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} />
      <ParticleBackground />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12 flex flex-col items-center">
            <div className="relative mb-6 w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle,_rgba(245,166,35,0.28)_0%,_transparent_65%)] blur-xl"
              />
              <Image
                src="/hero.png"
                alt=""
                fill
                priority
                sizes="(max-width: 640px) 12rem, (max-width: 768px) 15rem, 18rem"
                className="relative object-contain drop-shadow-[0_10px_30px_rgba(245,166,35,0.25)]"
              />
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-[#f5a623] mb-4 glow-gold">
              {t('home.title')}
            </h1>
            <p className="text-xl text-[#a89b8c] max-w-xl mx-auto">
              {t('home.subtitle')}
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Create Game */}
            <Card variant="elevated" padding="lg" className="flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#f5a623]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#f5a623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#f0e6d3] mb-2">
                  {t('home.createGame')}
                </h2>
              </div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => router.push('/create')}
              >
                {t('home.createGame')}
              </Button>
            </Card>

            {/* Join Game */}
            <Card variant="elevated" padding="lg">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-[#27ae60]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#27ae60]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#f0e6d3]">
                  {t('home.joinGame')}
                </h2>
              </div>

              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <Input
                  placeholder={t('home.enterCode')}
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono uppercase"
                />
                <Input
                  placeholder={t('home.enterName')}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={30}
                />
                {error && (
                  <p className="text-sm text-[#e74c3c] text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  variant="success"
                  size="lg"
                  fullWidth
                  loading={joining}
                  disabled={!gameCode.trim() || !playerName.trim()}
                >
                  {t('home.join')}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
