'use client';

import type { RoundNumber } from '@/types/game';

interface RoundBannerProps {
  round: RoundNumber;
  wordsRemaining: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const roundColors: Record<RoundNumber, string> = {
  1: 'bg-[#27ae60]/15 text-[#27ae60] border-[#27ae60]/30',
  2: 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/30',
  3: 'bg-[#e74c3c]/15 text-[#e74c3c] border-[#e74c3c]/30',
};

const roundTitleKeys: Record<RoundNumber, string> = {
  1: 'game.round1Title',
  2: 'game.round2Title',
  3: 'game.round3Title',
};

const roundDescKeys: Record<RoundNumber, string> = {
  1: 'game.round1Desc',
  2: 'game.round2Desc',
  3: 'game.round3Desc',
};

export default function RoundBanner({ round, wordsRemaining, t }: RoundBannerProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${roundColors[round]}`}>
      <div className="font-bold text-lg">
        {t('game.round', { number: round })} — {t(roundTitleKeys[round])}
      </div>
      <div className="text-sm opacity-80 mt-0.5">
        {t(roundDescKeys[round])}
      </div>
      <div className="text-xs mt-1 opacity-70">
        {t('game.wordsLeft', { count: wordsRemaining })}
      </div>
    </div>
  );
}
