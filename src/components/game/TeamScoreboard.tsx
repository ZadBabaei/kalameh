'use client';

import type { Team, TeamScores, GamePlayer } from '@/types/game';

interface TeamScoreboardProps {
  players: GamePlayer[];
  scores: TeamScores;
  currentRound: number;
  correctTicks: { A: number; B: number }; // green ticks this turn
  activeTeam: Team | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function TeamScoreboard({
  players,
  scores,
  currentRound,
  correctTicks,
  activeTeam,
  t,
}: TeamScoreboardProps) {
  const teamA = players.filter((p) => p.team === 'A');
  const teamB = players.filter((p) => p.team === 'B');

  const scoreKey = `round${currentRound}` as `round${1 | 2 | 3}`;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Team A */}
      <div className={`rounded-xl p-4 border-2 ${activeTeam === 'A' ? 'border-[#f5a623] bg-[#f5a623]/10' : 'border-[#3d3248] bg-[#2a2035]'}`}>
        <h3 className="font-bold text-[#f5a623] mb-1">{t('lobby.teamA')}</h3>
        <div className="text-3xl font-bold text-[#f5a623] mb-2">
          {scores.A[scoreKey]}
          <span className="text-sm font-normal text-[#a89b8c]/70 ml-2">
            ({t('results.total')}: {scores.A.total})
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {teamA.map((p) => (
            <span key={p.id} className="text-xs text-[#f0e6d3] bg-[#f5a623]/15 px-2 py-0.5 rounded-full">
              {p.playerName}
            </span>
          ))}
        </div>
        {/* Green ticks */}
        <div className="flex gap-1 min-h-[20px]">
          {Array.from({ length: correctTicks.A }).map((_, i) => (
            <span key={i} className="text-[#27ae60] text-sm animate-tick">&#10003;</span>
          ))}
        </div>
      </div>

      {/* Team B */}
      <div className={`rounded-xl p-4 border-2 ${activeTeam === 'B' ? 'border-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#3d3248] bg-[#2a2035]'}`}>
        <h3 className="font-bold text-[#3b82f6] mb-1">{t('lobby.teamB')}</h3>
        <div className="text-3xl font-bold text-[#3b82f6] mb-2">
          {scores.B[scoreKey]}
          <span className="text-sm font-normal text-[#a89b8c]/70 ml-2">
            ({t('results.total')}: {scores.B.total})
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {teamB.map((p) => (
            <span key={p.id} className="text-xs text-[#f0e6d3] bg-[#3b82f6]/15 px-2 py-0.5 rounded-full">
              {p.playerName}
            </span>
          ))}
        </div>
        {/* Green ticks */}
        <div className="flex gap-1 min-h-[20px]">
          {Array.from({ length: correctTicks.B }).map((_, i) => (
            <span key={i} className="text-[#27ae60] text-sm animate-tick">&#10003;</span>
          ))}
        </div>
      </div>
    </div>
  );
}
