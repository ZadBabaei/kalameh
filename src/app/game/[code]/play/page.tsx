'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useSocket } from '@/hooks/useSocket';
import { Navbar } from '@/components/layout';
import { Button, Card, Timer } from '@/components/ui';
import type { Team, RoundNumber, TeamScores, GamePlayer, GameSettings } from '@/types/game';

interface TurnInfo {
  playerId: number;
  playerName: string;
  team: Team;
  timerDuration: number;
  awaitingStart: boolean;
}

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const code = params.code;

  // Player identity
  const myPlayerId = typeof window !== 'undefined'
    ? Number(localStorage.getItem(`kalameh-playerId-${code}`) || localStorage.getItem('kalameh-playerId'))
    : null;

  // Game state
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [currentRound, setCurrentRound] = useState<RoundNumber>(1);
  const [scores, setScores] = useState<TeamScores>({
    A: { round1: 0, round2: 0, round3: 0, total: 0 },
    B: { round1: 0, round2: 0, round3: 0, total: 0 },
  });
  const [wordsRemaining, setWordsRemaining] = useState(0);
  const [turnInfo, setTurnInfo] = useState<TurnInfo | null>(null);
  const [currentWord, setCurrentWord] = useState<{ id: number; text: string } | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(45);
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [skipsMax, setSkipsMax] = useState(999);
  const [roundResult, setRoundResult] = useState<{
    roundNumber: RoundNumber;
    teamAScore: number;
    teamBScore: number;
    roundWinner: Team | 'tie';
  } | null>(null);
  const [gameFinished, setGameFinished] = useState<{
    teamATotal: number;
    teamBTotal: number;
    winner: Team | 'tie';
    roundBreakdown: Array<{ round: RoundNumber; teamAScore: number; teamBScore: number }>;
  } | null>(null);

  const socketUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    : '';

  const onEventRef = useRef<(event: string, data: unknown) => void>(undefined);

  const onEvent = useCallback((event: string, data: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;

    switch (event) {
      case 'game:state':
        setPlayers(d.players || []);
        setSettings(d.settings || null);
        setCurrentRound(d.currentRound || 1);
        setScores(d.scores || scores);
        setWordsRemaining(d.wordsRemaining || 0);
        if (d.currentTurn) {
          setTurnInfo({
            playerId: d.currentTurn.playerId,
            playerName: d.currentTurn.playerName,
            team: d.currentTurn.team,
            timerDuration: d.currentTurn.timerDuration,
            awaitingStart: false,
          });
          setTimerDuration(d.currentTurn.timerDuration);
          setTimerRunning(true);
          setSkipsUsed(d.currentTurn.skipsUsed);
          setSkipsMax(d.currentTurn.skipsMax);
        }
        break;

      case 'game:phase_changed':
        if (d.round) setCurrentRound(d.round);
        setRoundResult(null);
        break;

      case 'game:turn_started':
        setTurnInfo({
          playerId: d.playerId,
          playerName: d.playerName,
          team: d.team,
          timerDuration: d.timerDuration,
          awaitingStart: d.awaitingStart ?? true,
        });
        setTimerDuration(d.timerDuration);
        setTimerRunning(!d.awaitingStart);
        setSkipsUsed(0);
        setCurrentWord(null);
        break;

      case 'game:word_for_describer':
        setCurrentWord({ id: d.wordId, text: d.wordText });
        break;

      case 'game:correct':
        setScores((prev) => {
          const next = { ...prev };
          const team = d.team as Team;
          const scoreKey = `round${d.roundNumber}` as `round${1 | 2 | 3}`;
          next[team] = {
            ...next[team],
            [scoreKey]: next[team][scoreKey] + 1,
            total: next[team].total + 1,
          };
          return next;
        });
        setWordsRemaining(d.wordsRemaining);
        setCurrentWord(null);
        break;

      case 'game:skip':
        setSkipsUsed(d.skipsUsed);
        setSkipsMax(d.skipsMax);
        setWordsRemaining(d.wordsRemaining);
        setCurrentWord(null);
        break;

      case 'game:turn_ended':
        setTimerRunning(false);
        setCurrentWord(null);
        setTurnInfo(null);
        break;

      case 'game:round_ended':
        setTimerRunning(false);
        setCurrentWord(null);
        setTurnInfo(null);
        setRoundResult({
          roundNumber: d.roundNumber,
          teamAScore: d.teamAScore,
          teamBScore: d.teamBScore,
          roundWinner: d.roundWinner,
        });
        break;

      case 'game:finished':
        setTimerRunning(false);
        setCurrentWord(null);
        setTurnInfo(null);
        setGameFinished(d);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  onEventRef.current = onEvent;

  const stableOnEvent = useCallback((event: string, data: unknown) => {
    onEventRef.current?.(event, data);
  }, []);

  const { emit, isConnected } = useSocket({
    serverUrl: socketUrl,
    gameCode: code,
    playerId: myPlayerId,
    onEvent: stableOnEvent,
  });

  // Fetch initial game data via REST
  const gameDataRef = useRef<{ players: GamePlayer[]; settings: GameSettings; gameWords: { id: number; text: string }[]; turnOrder: number[]; hostPlayerId: number | null } | null>(null);
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        setPlayers(data.players);
        setSettings(data.game.settings);
        setWordsRemaining(data.gameWords?.length || 0);
        gameDataRef.current = {
          players: data.players,
          settings: data.game.settings,
          gameWords: data.gameWords || [],
          turnOrder: data.turnOrder || [],
          hostPlayerId: data.game.hostPlayerId,
        };

        if (data.game.status === 'lobby' || data.game.status === 'adding_words') {
          router.push(`/game/${code}/words`);
        }
      } catch {
        // Retry on next poll
      }
    }
    fetchGame();
  }, [code, router]);

  // Bootstrap socket engine once connected — each tab only registers ITSELF
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isConnected || bootstrappedRef.current || !gameDataRef.current || !myPlayerId) return;
    const gd = gameDataRef.current;
    const me = gd.players.find((p: GamePlayer) => p.id === myPlayerId);
    if (!me) return;
    bootstrappedRef.current = true;

    // Register this player — send settings so engine gets created if it doesn't exist
    emit('player:join', {
      gameCode: code,
      playerName: me.playerName,
      playerId: me.id,
      isHost: me.isHost,
      joinOrder: me.joinOrder,
      settings: gd.settings,
    });

    // Also register the OTHER players so the engine knows about them (without socketId)
    for (const p of gd.players) {
      if (p.id !== myPlayerId) {
        emit('player:register_other', {
          gameCode: code,
          playerName: p.playerName,
          playerId: p.id,
          isHost: p.isHost,
          joinOrder: p.joinOrder,
        });
      }
    }

    // Tell the engine to start the game with words
    if (gd.gameWords.length > 0) {
      setTimeout(() => {
        emit('bootstrap:start_game', {
          gameCode: code,
          words: gd.gameWords,
          hostPlayerId: gd.hostPlayerId,
        });
      }, 800);
    }
  }, [isConnected, code, emit, myPlayerId]);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');

  const isMyTurn = turnInfo?.playerId === myPlayerId;
  const isDescribing = isMyTurn && timerRunning;
  const isUnlimitedSkips = skipsMax >= 999;
  const canSkip = isUnlimitedSkips || skipsUsed < skipsMax;

  const teamA = players.filter((p) => p.team === 'A');
  const teamB = players.filter((p) => p.team === 'B');
  const roundScoreKey = `round${currentRound}` as `round${1 | 2 | 3}`;

  const handleStartTurn = () => {
    emit('player:start_turn', { gameCode: code, playerId: myPlayerId });
    setTimerRunning(true);
    setTurnInfo((prev) => prev ? { ...prev, awaitingStart: false } : null);
  };

  const handleCorrect = () => {
    if (!currentWord) return;
    emit('player:correct', { gameCode: code, playerId: myPlayerId });
  };

  const handleSkip = () => {
    if (!currentWord || !canSkip) return;
    emit('player:skip', { gameCode: code, playerId: myPlayerId });
  };

  const handleTimeUp = () => {
    setTimerRunning(false);
    setCurrentWord(null);
    // Play alert sound
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 600;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
      }, 300);
    } catch {
      // Audio not available
    }
  };

  // --- Render: Game Finished ---
  if (gameFinished) {
    router.push(`/game/${code}/results`);
    return null;
  }

  // --- Render: Round Results ---
  if (roundResult) {
    const winnerName = roundResult.roundWinner === 'A' ? t('lobby.teamA')
      : roundResult.roundWinner === 'B' ? t('lobby.teamB') : '';
    return (
      <>
        <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card variant="elevated" padding="lg" className="max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-[#f0e6d3] mb-6">
              {t('results.roundWinner', { number: roundResult.roundNumber })}
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className={`p-4 rounded-xl ${roundResult.roundWinner === 'A' ? 'ring-2 ring-[#f5a623] bg-[#f5a623]/10' : 'bg-[#2a2035]'}`}>
                <div className="text-sm text-[#a89b8c]">{t('lobby.teamA')}</div>
                <div className="text-4xl font-bold text-[#f5a623]">{roundResult.teamAScore}</div>
              </div>
              <div className={`p-4 rounded-xl ${roundResult.roundWinner === 'B' ? 'ring-2 ring-[#3b82f6] bg-[#3b82f6]/10' : 'bg-[#2a2035]'}`}>
                <div className="text-sm text-[#a89b8c]">{t('lobby.teamB')}</div>
                <div className="text-4xl font-bold text-[#3b82f6]">{roundResult.teamBScore}</div>
              </div>
            </div>
            <p className="text-lg font-semibold text-[#f0e6d3]">
              {roundResult.roundWinner === 'tie'
                ? t('results.tie')
                : t('results.winner', { team: winnerName })}
            </p>
            <p className="text-sm text-[#a89b8c]/70 mt-3">
              {t('game.nextRoundSoon')}
            </p>
          </Card>
        </main>
      </>
    );
  }

  // --- Render: Main Game Screen ---
  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />

      <main className="flex-1 px-4 py-4">
        <div className="max-w-lg mx-auto flex flex-col gap-4">
          {/* Connection indicator */}
          {!isConnected && (
            <div className="bg-[#e74c3c]/20 text-[#e74c3c] text-sm text-center py-2 rounded-lg">
              Reconnecting...
            </div>
          )}

          {/* ── Team Scores ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Team A */}
            <div className={`rounded-xl p-3 border-2 transition-all ${
              turnInfo?.team === 'A' ? 'border-[#f5a623] bg-[#f5a623]/10' : 'border-[#3d3248] bg-[#2a2035]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#f5a623] text-sm">{t('lobby.teamA')}</h3>
                <span className="text-2xl font-bold text-[#f5a623]">{scores.A[roundScoreKey]}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {teamA.map((p) => (
                  <span
                    key={p.id}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      turnInfo?.playerId === p.id
                        ? 'bg-[#f5a623] text-[#1a1520] font-bold'
                        : 'bg-[#f5a623]/10 text-[#f0e6d3]'
                    }`}
                  >
                    {p.playerName}
                  </span>
                ))}
              </div>
            </div>

            {/* Team B */}
            <div className={`rounded-xl p-3 border-2 transition-all ${
              turnInfo?.team === 'B' ? 'border-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#3d3248] bg-[#2a2035]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#3b82f6] text-sm">{t('lobby.teamB')}</h3>
                <span className="text-2xl font-bold text-[#3b82f6]">{scores.B[roundScoreKey]}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {teamB.map((p) => (
                  <span
                    key={p.id}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      turnInfo?.playerId === p.id
                        ? 'bg-[#3b82f6] text-white font-bold'
                        : 'bg-[#3b82f6]/10 text-[#f0e6d3]'
                    }`}
                  >
                    {p.playerName}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Round Info ── */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#a89b8c]">
              {t('game.round', { number: currentRound })} — {
                currentRound === 1 ? t('game.round1Title') :
                currentRound === 2 ? t('game.round2Title') :
                t('game.round3Title')
              }
            </span>
            <span className="text-[#a89b8c]/70">
              {t('game.wordsLeft', { count: wordsRemaining })}
            </span>
          </div>

          {/* ── Game Box ── */}
          <Card variant="elevated" padding="none" className="min-h-[340px] flex flex-col relative overflow-hidden">

            {/* ── Waiting for turn ── */}
            {!turnInfo && (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-[#a89b8c] text-lg">{t('common.loading')}</p>
              </div>
            )}

            {/* ── My turn: awaiting start ── */}
            {turnInfo?.awaitingStart && isMyTurn && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                <p className="text-2xl font-bold text-[#f5a623]">{t('game.yourTurn')}</p>
                <p className="text-sm text-[#a89b8c]">
                  {currentRound === 1 ? t('game.round1Desc') :
                   currentRound === 2 ? t('game.round2Desc') :
                   t('game.round3Desc')}
                </p>
                <Button variant="primary" size="lg" onClick={handleStartTurn}>
                  {t('game.start')}
                </Button>
              </div>
            )}

            {/* ── Someone else's turn: awaiting their start ── */}
            {turnInfo?.awaitingStart && !isMyTurn && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <p className="text-xl text-[#a89b8c]">
                  {t('game.describing', { player: turnInfo.playerName })}
                </p>
                <p className="text-sm text-[#a89b8c]/60">
                  {t('game.waitingForStart')}
                </p>
              </div>
            )}

            {/* ── Active turn: I am describing ── */}
            {turnInfo && !turnInfo.awaitingStart && isDescribing && (
              <div className="flex-1 flex flex-col p-4">
                {/* Timer row */}
                <div className="flex items-start justify-between">
                  <Timer
                    duration={timerDuration}
                    isRunning={timerRunning}
                    onTimeUp={handleTimeUp}
                    size="md"
                  />
                  <div className="text-right">
                    {!isUnlimitedSkips && (
                      <span className="text-xs text-[#a89b8c]">
                        {t('game.skipsLeft', { count: skipsMax - skipsUsed })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Word display */}
                <div className="flex-1 flex items-center justify-center my-4">
                  {currentWord ? (
                    <div className="bg-[#f5a623]/10 border-2 border-[#f5a623]/30 rounded-2xl px-8 py-8 text-center w-full">
                      <p className="text-3xl sm:text-4xl font-bold text-[#f5a623]">
                        {currentWord.text}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#2a2035] border border-[#3d3248] rounded-2xl px-8 py-8 text-center w-full">
                      <p className="text-[#a89b8c]/50 text-lg">...</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={handleSkip}
                    disabled={!currentWord || !canSkip}
                  >
                    {t('game.skip')}
                  </Button>
                  <button
                    onClick={handleCorrect}
                    disabled={!currentWord}
                    className="flex-1 py-3 rounded-xl font-bold text-lg bg-[#27ae60] hover:bg-[#27ae60]/80 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('game.correct')}
                  </button>
                </div>
              </div>
            )}

            {/* ── Active turn: someone else is describing (spectator view) ── */}
            {turnInfo && !turnInfo.awaitingStart && !isMyTurn && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                {/* Timer */}
                <Timer
                  duration={timerDuration}
                  isRunning={timerRunning}
                  onTimeUp={handleTimeUp}
                  size="lg"
                />
                <p className="text-xl text-[#a89b8c] text-center">
                  {t('game.describing', { player: turnInfo.playerName })}
                </p>
                {/* Live score for this round */}
                <div className="flex gap-8 text-center">
                  <div>
                    <div className="text-xs text-[#a89b8c]">{t('lobby.teamA')}</div>
                    <div className="text-3xl font-bold text-[#f5a623]">{scores.A[roundScoreKey]}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a89b8c]">{t('lobby.teamB')}</div>
                    <div className="text-3xl font-bold text-[#3b82f6]">{scores.B[roundScoreKey]}</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
