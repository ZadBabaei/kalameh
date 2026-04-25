'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useSocket } from '@/hooks/useSocket';
import { Navbar } from '@/components/layout';
import { Button, Card, Timer } from '@/components/ui';
import type { Team, RoundNumber, TeamScores, GamePlayer, GameSettings } from '@/types/game';

// Derived UI phase — separate from server phase to keep rendering logic flat.
type UiPhase = 'waiting' | 'round1' | 'round2' | 'round3' | 'round_results' | 'finished';

interface TurnInfo {
  playerId: number;
  playerName: string;
  team: Team;
  timerDuration: number;
  skipsMax: number;
  awaitingStart: boolean;
}

interface RoundResult {
  roundNumber: RoundNumber;
  teamAScore: number;
  teamBScore: number;
  roundWinner: Team | 'tie';
  nextRound: RoundNumber | null;
  nextStartPlayerId: number | null;
}

function derivePhase(serverPhase: string, round: RoundNumber): UiPhase {
  if (serverPhase === 'round_results') return 'round_results';
  if (serverPhase === 'finished') return 'finished';
  if (serverPhase === 'playing') return `round${round}` as UiPhase;
  return 'waiting';
}

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const code = params.code;

  const myPlayerId = typeof window !== 'undefined'
    ? Number(localStorage.getItem(`kalameh-playerId-${code}`) || localStorage.getItem('kalameh-playerId'))
    : null;

  // ── Core state (shaped per refactor spec) ──
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [, setSettings] = useState<GameSettings | null>(null);
  const [serverPhase, setServerPhase] = useState<string>('lobby');
  const [currentRound, setCurrentRound] = useState<RoundNumber>(1);
  const [, setTurnOrder] = useState<number[]>([]);
  const [turnInfo, setTurnInfo] = useState<TurnInfo | null>(null);
  const [currentWord, setCurrentWord] = useState<{ id: number; text: string } | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(45);
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [skipsMax, setSkipsMax] = useState(999);
  const [usedSkipThisTurn, setUsedSkipThisTurn] = useState(false);
  const [wordsRemaining, setWordsRemaining] = useState(0);
  const [, setCollectedCount] = useState(0);

  const [scores, setScores] = useState<TeamScores>({
    A: { round1: 0, round2: 0, round3: 0, total: 0 },
    B: { round1: 0, round2: 0, round3: 0, total: 0 },
  });

  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  const socketUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
    : '';

  // ── Socket event routing ──
  const onEventRef = useRef<(event: string, data: unknown) => void>(undefined);

  const onEvent = useCallback((event: string, data: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;

    switch (event) {
      case 'game:state': {
        if (d.players) setPlayers(d.players);
        if (d.settings) setSettings(d.settings);
        if (d.phase) setServerPhase(d.phase);
        if (d.currentRound) setCurrentRound(d.currentRound);
        if (d.turnOrder) setTurnOrder(d.turnOrder);
        if (d.scores) setScores(d.scores);
        if (typeof d.wordsRemaining === 'number') setWordsRemaining(d.wordsRemaining);
        if (typeof d.collectedCount === 'number') setCollectedCount(d.collectedCount);
        if (d.currentTurn) {
          setTurnInfo({
            playerId: d.currentTurn.playerId,
            playerName: d.currentTurn.playerName,
            team: d.currentTurn.team,
            timerDuration: d.currentTurn.timerDuration,
            skipsMax: d.currentTurn.skipsMax,
            awaitingStart: false,
          });
          setTimerDuration(d.currentTurn.timerDuration);
          setTimerRunning(true);
          setSkipsUsed(d.currentTurn.skipsUsed ?? 0);
          setSkipsMax(d.currentTurn.skipsMax ?? 999);
          setUsedSkipThisTurn(!!d.currentTurn.usedSkipThisTurn);
        }
        // If we refreshed during round_results, reconstruct result header.
        if (d.phase === 'round_results') {
          const rk = `round${d.currentRound}` as `round${1 | 2 | 3}`;
          setRoundResult({
            roundNumber: d.currentRound,
            teamAScore: d.scores?.A?.[rk] ?? 0,
            teamBScore: d.scores?.B?.[rk] ?? 0,
            roundWinner: (d.scores?.A?.[rk] ?? 0) > (d.scores?.B?.[rk] ?? 0) ? 'A'
                        : (d.scores?.B?.[rk] ?? 0) > (d.scores?.A?.[rk] ?? 0) ? 'B' : 'tie',
            nextRound: d.currentRound < 3 ? ((d.currentRound + 1) as RoundNumber) : null,
            nextStartPlayerId: d.lastDescriberId ?? null,
          });
        }
        break;
      }

      case 'game:phase_changed':
        if (d.phase) setServerPhase(d.phase);
        if (d.round) setCurrentRound(d.round);
        setRoundResult(null);
        setCurrentWord(null);
        setTimerRunning(false);
        setUsedSkipThisTurn(false);
        setSkipsUsed(0);
        break;

      case 'game:turn_order':
        if (d.turnOrder) setTurnOrder(d.turnOrder);
        break;

      case 'game:turn_started':
        setTurnInfo({
          playerId: d.playerId,
          playerName: d.playerName,
          team: d.team,
          timerDuration: d.timerDuration,
          skipsMax: d.skipsMax ?? 999,
          awaitingStart: d.awaitingStart ?? true,
        });
        setTimerDuration(d.timerDuration);
        setSkipsMax(d.skipsMax ?? 999);
        setTimerRunning(!d.awaitingStart);
        // Only clear word + skip state on brand-new turn (awaitingStart=true);
        // avoid wiping the word emitted alongside awaitingStart=false.
        if (d.awaitingStart) {
          setSkipsUsed(0);
          setUsedSkipThisTurn(false);
          setCurrentWord(null);
        }
        break;

      case 'game:word_for_describer':
        setCurrentWord({ id: d.wordId, text: d.wordText });
        break;

      case 'game:correct':
        setScores((prev) => {
          const next = { ...prev };
          const team = d.team as Team;
          const rk = `round${d.roundNumber}` as `round${1 | 2 | 3}`;
          next[team] = {
            ...next[team],
            [rk]: next[team][rk] + 1,
            total: next[team].total + 1,
          };
          return next;
        });
        setWordsRemaining(d.wordsRemaining);
        setCollectedCount(d.collectedCount ?? 0);
        setCurrentWord(null);
        break;

      case 'game:skip':
        setSkipsUsed(d.skipsUsed);
        setSkipsMax(d.skipsMax);
        setUsedSkipThisTurn(!!d.usedSkipThisTurn);
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
        setServerPhase('round_results');
        setRoundResult({
          roundNumber: d.roundNumber,
          teamAScore: d.teamAScore,
          teamBScore: d.teamBScore,
          roundWinner: d.roundWinner,
          nextRound: d.nextRound,
          nextStartPlayerId: d.nextStartPlayerId,
        });
        break;

      case 'game:finished':
        setTimerRunning(false);
        setCurrentWord(null);
        setTurnInfo(null);
        setServerPhase('finished');
        router.push(`/game/${code}/results`);
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

  // ── Initial REST fetch (populates players/settings + redirects if not ready) ──
  const gameDataRef = useRef<{ players: GamePlayer[]; settings: GameSettings; gameWords: { id: number; text: string }[]; turnOrder: number[]; hostPlayerId: number | null } | null>(null);
  const [gameDataReady, setGameDataReady] = useState(false);
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
        setGameDataReady(true);

        if (data.game.status === 'lobby' || data.game.status === 'adding_words') {
          router.push(`/game/${code}/words`);
        }
      } catch {
        // Retry on next poll
      }
    }
    fetchGame();
  }, [code, router]);

  // ── Bootstrap socket engine once connected ──
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isConnected || bootstrappedRef.current || !gameDataReady || !gameDataRef.current || !myPlayerId) return;
    const gd = gameDataRef.current;
    const me = gd.players.find((p: GamePlayer) => p.id === myPlayerId);
    if (!me) return;
    bootstrappedRef.current = true;

    emit('player:join', {
      gameCode: code,
      playerName: me.playerName,
      playerId: me.id,
      isHost: me.isHost,
      joinOrder: me.joinOrder,
      settings: gd.settings,
    });

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

    if (gd.gameWords.length > 0) {
      setTimeout(() => {
        emit('bootstrap:start_game', {
          gameCode: code,
          words: gd.gameWords,
          hostPlayerId: gd.hostPlayerId,
        });
      }, 800);
    }
  }, [isConnected, code, emit, myPlayerId, gameDataReady]);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');

  // ── Derived state ──
  const uiPhase = derivePhase(serverPhase, currentRound);
  const isMyTurn = turnInfo?.playerId === myPlayerId;
  const isDescribing = isMyTurn && timerRunning;
  // Round 2 uses oncePerTurn. Rounds 1 & 3 use per-round limit (respecting settings).
  const canSkip = currentRound === 2
    ? !usedSkipThisTurn
    : skipsMax >= 999
      ? true
      : skipsMax > 0 && skipsUsed < skipsMax;

  const teamA = players.filter((p) => p.team === 'A');
  const teamB = players.filter((p) => p.team === 'B');
  const roundScoreKey = `round${currentRound}` as `round${1 | 2 | 3}`;

  // ── Actions ──
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

  const handleAdvanceRound = () => {
    emit('player:advance_round', { gameCode: code, playerId: myPlayerId });
  };

  const handleTimeUp = () => {
    setTimerRunning(false);
    setCurrentWord(null);
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

  // ── Render: Round Results (manual advance) ──
  if (uiPhase === 'round_results' && roundResult) {
    const winnerName = roundResult.roundWinner === 'A' ? t('lobby.teamA')
      : roundResult.roundWinner === 'B' ? t('lobby.teamB') : '';
    const nextStarter = roundResult.nextStartPlayerId
      ? players.find(p => p.id === roundResult.nextStartPlayerId)
      : null;
    const iStartNext = roundResult.nextStartPlayerId === myPlayerId;

    return (
      <>
        <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card variant="elevated" padding="lg" className="max-w-md md:max-w-lg w-full text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#f0e6d3] mb-6">
              {t('results.roundWinner', { number: roundResult.roundNumber })}
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className={`p-4 rounded-xl ${roundResult.roundWinner === 'A' ? 'ring-2 ring-[#f5a623] bg-[#f5a623]/10' : 'bg-[#2a2035]'}`}>
                <div className="text-sm text-[#a89b8c]">{t('lobby.teamA')}</div>
                <div className="text-4xl md:text-5xl font-bold text-[#f5a623]">{roundResult.teamAScore}</div>
              </div>
              <div className={`p-4 rounded-xl ${roundResult.roundWinner === 'B' ? 'ring-2 ring-[#3b82f6] bg-[#3b82f6]/10' : 'bg-[#2a2035]'}`}>
                <div className="text-sm text-[#a89b8c]">{t('lobby.teamB')}</div>
                <div className="text-4xl md:text-5xl font-bold text-[#3b82f6]">{roundResult.teamBScore}</div>
              </div>
            </div>
            <p className="text-lg md:text-xl font-semibold text-[#f0e6d3] mb-6">
              {roundResult.roundWinner === 'tie'
                ? t('game.roundXTie', { number: roundResult.roundNumber, a: roundResult.teamAScore, b: roundResult.teamBScore })
                : t('game.roundXWon', { team: winnerName, number: roundResult.roundNumber, a: roundResult.teamAScore, b: roundResult.teamBScore })}
            </p>

            {roundResult.nextRound !== null && (
              iStartNext ? (
                <Button variant="primary" size="lg" onClick={handleAdvanceRound}>
                  {t('game.startRound', { number: roundResult.nextRound })}
                </Button>
              ) : (
                <p className="text-sm text-[#a89b8c]/80">
                  {t('game.waitingForNextRound', {
                    player: nextStarter?.playerName ?? '—',
                    number: roundResult.nextRound,
                  })}
                </p>
              )
            )}
          </Card>
        </main>
      </>
    );
  }

  // ── Render: Main Gameplay ──
  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />

      <main className="flex-1 px-4 py-4 md:py-6">
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col gap-4 md:gap-5">
          {!isConnected && (
            <div className="bg-[#e74c3c]/20 text-[#e74c3c] text-sm text-center py-2 rounded-lg">
              Reconnecting...
            </div>
          )}

          {/* ── Team Scores (top) ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 border-2 transition-all ${
              turnInfo?.team === 'A' ? 'border-[#f5a623] bg-[#f5a623]/10' : 'border-[#3d3248] bg-[#2a2035]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#f5a623] text-sm">{t('lobby.teamA')}</h3>
                <span
                  key={`A-R${currentRound}-${scores.A[roundScoreKey]}`}
                  className="text-2xl font-bold text-[#f5a623] animate-score-pop"
                >
                  {scores.A[roundScoreKey]}
                </span>
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

            <div className={`rounded-xl p-3 border-2 transition-all ${
              turnInfo?.team === 'B' ? 'border-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#3d3248] bg-[#2a2035]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#3b82f6] text-sm">{t('lobby.teamB')}</h3>
                <span
                  key={`B-R${currentRound}-${scores.B[roundScoreKey]}`}
                  className="text-2xl font-bold text-[#3b82f6] animate-score-pop"
                >
                  {scores.B[roundScoreKey]}
                </span>
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

          {/* ── Round / Bowl Info ── */}
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

          {/* ── Main Gameplay Box ── */}
          <Card variant="elevated" padding="none" className="min-h-[340px] md:min-h-[420px] flex flex-col relative overflow-hidden">

            {!turnInfo && (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-[#a89b8c] text-lg">{t('common.loading')}</p>
              </div>
            )}

            {/* Awaiting start — active player */}
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

            {/* Awaiting start — other players */}
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

            {/* Active turn — I am describing */}
            {turnInfo && !turnInfo.awaitingStart && isDescribing && (
              <div className="flex-1 flex flex-col p-4">
                <div className="flex items-start justify-between">
                  <Timer
                    duration={timerDuration}
                    isRunning={timerRunning}
                    onTimeUp={handleTimeUp}
                    size="md"
                  />
                  <div className="text-right">
                    {currentRound === 2 ? (
                      <span className="text-xs text-[#a89b8c]">
                        {usedSkipThisTurn ? t('game.noSkipsLeft') : t('game.skipsLeft', { count: 1 })}
                      </span>
                    ) : skipsMax < 999 ? (
                      <span className="text-xs text-[#a89b8c]">
                        {t('game.skipsLeft', { count: Math.max(0, skipsMax - skipsUsed) })}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center my-4">
                  {currentWord ? (
                    <div className="bg-[#f5a623]/10 border-2 border-[#f5a623]/30 rounded-2xl px-8 py-8 md:py-12 text-center w-full">
                      <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#f5a623]">
                        {currentWord.text}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#2a2035] border border-[#3d3248] rounded-2xl px-8 py-8 text-center w-full">
                      <p className="text-[#a89b8c]/50 text-lg">...</p>
                    </div>
                  )}
                </div>

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

            {/* Active turn — spectator view */}
            {turnInfo && !turnInfo.awaitingStart && !isMyTurn && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                <Timer
                  duration={timerDuration}
                  isRunning={timerRunning}
                  onTimeUp={handleTimeUp}
                  size="lg"
                />
                <p className="text-xl text-[#a89b8c] text-center">
                  {t('game.describing', { player: turnInfo.playerName })}
                </p>
                <div className="flex gap-8 text-center">
                  <div>
                    <div className="text-xs text-[#a89b8c]">{t('lobby.teamA')}</div>
                    <div
                      key={`spec-A-R${currentRound}-${scores.A[roundScoreKey]}`}
                      className="text-3xl font-bold text-[#f5a623] animate-score-pop"
                    >
                      {scores.A[roundScoreKey]}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a89b8c]">{t('lobby.teamB')}</div>
                    <div
                      key={`spec-B-R${currentRound}-${scores.B[roundScoreKey]}`}
                      className="text-3xl font-bold text-[#3b82f6] animate-score-pop"
                    >
                      {scores.B[roundScoreKey]}
                    </div>
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
