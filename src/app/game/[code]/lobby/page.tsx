'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Navbar } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import type { GamePlayer, GameSettings } from '@/types/game';

interface GameInfo {
  game: {
    id: number;
    code: string;
    name: string;
    status: string;
    settings: GameSettings;
  };
  players: GamePlayer[];
}

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const code = params.code;

  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const myPlayerId = typeof window !== 'undefined'
    ? Number(localStorage.getItem(`kalameh-playerId-${code}`) || localStorage.getItem('kalameh-playerId'))
    : null;

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${code}`);
      if (!res.ok) return;
      const data: GameInfo = await res.json();
      setGameInfo(data);

      // If game started (any status beyond lobby), redirect to words page
      if (data.game.status === 'adding_words' || data.game.status === 'playing') {
        router.push(`/game/${code}/words`);
      }
    } catch {
      // Silently retry on next poll
    }
  }, [code, router]);

  // Poll every 3 seconds
  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const handleStartGame = async () => {
    if (!myPlayerId) return;
    setStarting(true);
    setError('');
    try {
      // Update game status to 'playing' via the start API
      const res = await fetch(`/api/games/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId, action: 'begin_words' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to start game');
        return;
      }

      // Host redirects to words page; other players will redirect via polling
      router.push(`/game/${code}/words`);
    } catch {
      setError('Failed to start');
    } finally {
      setStarting(false);
    }
  };

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');

  if (!gameInfo) {
    return (
      <>
        <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-[#a89b8c]">{t('common.loading')}</p>
        </main>
      </>
    );
  }

  const { game, players } = gameInfo;
  const teamA = players.filter((p) => p.team === 'A');
  const teamB = players.filter((p) => p.team === 'B');
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;
  const hasEnoughPlayers = players.length >= 4;

  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />

      <main className="flex-1 px-4 py-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Game Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#f5a623] mb-2 glow-gold">{game.name}</h1>
            <p className="text-[#a89b8c]">{t('lobby.title')}</p>
          </div>

          {/* Game Code */}
          <Card variant="elevated" padding="md" className="text-center">
            <p className="text-sm text-[#a89b8c] mb-1">{t('lobby.code')}</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-mono font-bold tracking-[0.3em] text-[#f5a623] glow-gold">
                {code}
              </span>
              <button
                onClick={handleCopy}
                className="text-sm px-3 py-1 rounded-lg bg-[#3d3248] text-[#a89b8c] hover:bg-[#f5a623] hover:text-[#1a1520] transition-all"
              >
                {copied ? t('lobby.copied') : t('lobby.copyCode')}
              </button>
            </div>
          </Card>

          {/* Settings Summary */}
          <Card variant="outlined" padding="sm">
            <div className="flex flex-wrap gap-3 justify-center text-sm text-[#a89b8c]">
              <span>{game.settings.maxPlayers} {t('lobby.players')}</span>
              <span className="text-[#3d3248]">|</span>
              <span>{game.settings.wordsPerPlayer} {t('create.wordsPerPlayer').toLowerCase()}</span>
              <span className="text-[#3d3248]">|</span>
              <span>{game.settings.language === 'fa' ? 'فارسی' : 'English'}</span>
            </div>
          </Card>

          {/* Teams */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team A */}
            <Card variant="outlined" padding="md" className="border-l-4 border-l-[#f5a623]">
              <h3 className="font-semibold text-[#f5a623] mb-3">{t('lobby.teamA')}</h3>
              <div className="flex flex-col gap-2">
                {teamA.length === 0 ? (
                  <p className="text-sm text-[#a89b8c] italic">{t('lobby.waitingForPlayers')}</p>
                ) : (
                  teamA.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#f0e6d3]">{p.playerName}</span>
                      {p.isHost && <Badge variant="warning" size="sm">Host</Badge>}
                      {p.id === myPlayerId && <Badge variant="success" size="sm">You</Badge>}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Team B */}
            <Card variant="outlined" padding="md" className="border-l-4 border-l-[#3b82f6]">
              <h3 className="font-semibold text-[#3b82f6] mb-3">{t('lobby.teamB')}</h3>
              <div className="flex flex-col gap-2">
                {teamB.length === 0 ? (
                  <p className="text-sm text-[#a89b8c] italic">{t('lobby.waitingForPlayers')}</p>
                ) : (
                  teamB.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#f0e6d3]">{p.playerName}</span>
                      {p.isHost && <Badge variant="warning" size="sm">Host</Badge>}
                      {p.id === myPlayerId && <Badge variant="success" size="sm">You</Badge>}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Player Count */}
          <p className="text-center text-sm text-[#a89b8c]">
            {players.length} / {game.settings.maxPlayers} {t('lobby.players').toLowerCase()}
          </p>

          {/* Start Button (host only) */}
          {isHost && (
            <div className="text-center">
              {error && <p className="text-sm text-[#e74c3c] mb-2">{error}</p>}
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartGame}
                loading={starting}
                disabled={!hasEnoughPlayers}
              >
                {hasEnoughPlayers
                  ? t('lobby.startGame')
                  : t('lobby.needMorePlayers')}
              </Button>
            </div>
          )}

          {/* Non-host waiting message */}
          {!isHost && (
            <p className="text-center text-[#a89b8c] text-sm">
              {t('lobby.waitingForPlayers')}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
