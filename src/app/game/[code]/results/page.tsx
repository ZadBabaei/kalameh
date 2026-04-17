'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useSocket } from '@/hooks/useSocket';
import { Navbar } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import type { Team, RoundNumber } from '@/types/game';

interface FinalResults {
  teamATotal: number;
  teamBTotal: number;
  winner: Team | 'tie';
  roundBreakdown: Array<{ round: RoundNumber; teamAScore: number; teamBScore: number }>;
}

export default function ResultsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const code = params.code;

  const myPlayerId = typeof window !== 'undefined'
    ? Number(localStorage.getItem(`kalameh-playerId-${code}`) || localStorage.getItem('kalameh-playerId'))
    : null;

  const [results, setResults] = useState<FinalResults | null>(null);

  const socketUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    : '';

  const onEventRef = useRef<(event: string, data: unknown) => void>(undefined);

  const onEvent = useCallback((event: string, data: unknown) => {
    if (event === 'game:finished') {
      setResults(data as FinalResults);
    }
    if (event === 'game:state') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      if (d.phase === 'finished' && d.scores) {
        setResults({
          teamATotal: d.scores.A.total,
          teamBTotal: d.scores.B.total,
          winner: d.scores.A.total > d.scores.B.total ? 'A' : d.scores.B.total > d.scores.A.total ? 'B' : 'tie',
          roundBreakdown: [
            { round: 1, teamAScore: d.scores.A.round1, teamBScore: d.scores.B.round1 },
            { round: 2, teamAScore: d.scores.A.round2, teamBScore: d.scores.B.round2 },
            { round: 3, teamAScore: d.scores.A.round3, teamBScore: d.scores.B.round3 },
          ],
        });
      }
    }
  }, []);

  onEventRef.current = onEvent;

  const stableOnEvent = useCallback((event: string, data: unknown) => {
    onEventRef.current?.(event, data);
  }, []);

  useSocket({
    serverUrl: socketUrl,
    gameCode: code,
    playerId: myPlayerId,
    onEvent: stableOnEvent,
  });

  // Generate confetti pieces
  const [confetti] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: ['#f5a623', '#3b82f6', '#27ae60', '#e74c3c', '#8b5cf6'][Math.floor(Math.random() * 5)],
      size: 6 + Math.random() * 8,
    }))
  );

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');

  // Loading state
  if (!results) {
    return (
      <>
        <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-[#a89b8c]">{t('common.loading')}</p>
        </main>
      </>
    );
  }

  const winnerTeamName = results.winner === 'A'
    ? t('lobby.teamA')
    : results.winner === 'B'
      ? t('lobby.teamB')
      : '';

  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />

      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute animate-confetti"
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              top: -20,
            }}
          />
        ))}
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <Card variant="elevated" padding="lg" className="max-w-lg w-full text-center">
          <h1 className="text-3xl font-bold text-[#f0e6d3] mb-2">
            {t('results.finalResults')}
          </h1>

          {/* Winner */}
          <div className="my-6">
            {results.winner === 'tie' ? (
              <p className="text-2xl font-bold text-[#f5a623]">{t('results.tie')}</p>
            ) : (
              <p className="text-2xl font-bold">
                <span className={results.winner === 'A' ? 'text-[#f5a623]' : 'text-[#3b82f6]'}>
                  {t('results.winner', { team: winnerTeamName })}
                </span>
              </p>
            )}
          </div>

          {/* Total Scores */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className={`p-4 rounded-xl ${results.winner === 'A' ? 'bg-[#f5a623]/15 ring-2 ring-[#f5a623]' : 'bg-[#2a2035]'}`}>
              <div className="text-sm text-[#a89b8c] mb-1">{t('lobby.teamA')}</div>
              <div className="text-5xl font-bold text-[#f5a623]">{results.teamATotal}</div>
            </div>
            <div className={`p-4 rounded-xl ${results.winner === 'B' ? 'bg-[#3b82f6]/15 ring-2 ring-[#3b82f6]' : 'bg-[#2a2035]'}`}>
              <div className="text-sm text-[#a89b8c] mb-1">{t('lobby.teamB')}</div>
              <div className="text-5xl font-bold text-[#3b82f6]">{results.teamBTotal}</div>
            </div>
          </div>

          {/* Score Breakdown */}
          <h3 className="text-sm font-medium text-[#f0e6d3] mb-3">{t('results.scoreBreakdown')}</h3>
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b border-[#3d3248]">
                <th className="py-2 text-left text-[#a89b8c]"></th>
                <th className="py-2 text-center text-[#f5a623]">{t('lobby.teamA')}</th>
                <th className="py-2 text-center text-[#3b82f6]">{t('lobby.teamB')}</th>
              </tr>
            </thead>
            <tbody>
              {results.roundBreakdown.map((r) => (
                <tr key={r.round} className="border-b border-[#3d3248]/50">
                  <td className="py-2 text-[#a89b8c]">
                    {t('game.round', { number: r.round })}
                  </td>
                  <td className="py-2 text-center font-medium text-[#f0e6d3]">{r.teamAScore}</td>
                  <td className="py-2 text-center font-medium text-[#f0e6d3]">{r.teamBScore}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2 text-[#f0e6d3]">{t('results.total')}</td>
                <td className="py-2 text-center text-[#f5a623]">{results.teamATotal}</td>
                <td className="py-2 text-center text-[#3b82f6]">{results.teamBTotal}</td>
              </tr>
            </tbody>
          </table>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => router.push('/')}
            >
              {t('results.playAgain')}
            </Button>
          </div>
        </Card>
      </main>
    </>
  );
}
