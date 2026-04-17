'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Navbar } from '@/components/layout';
import { Button, Input, Card } from '@/components/ui';
import type { Language } from '@/types/game';

interface FormState {
  gameName: string;
  hostName: string;
  language: Language;
  maxPlayers: number;
  wordsPerPlayer: number;
  timerRound1: number;
  timerRound2: number;
  timerRound3: number;
  skipsRound1: number;
  skipsRound2: number;
  skipsRound3: number;
}

const defaultForm: FormState = {
  gameName: '',
  hostName: '',
  language: 'en',
  maxPlayers: 4,
  wordsPerPlayer: 5,
  timerRound1: 45,
  timerRound2: 35,
  timerRound3: 30,
  skipsRound1: 999, // unlimited
  skipsRound2: 1,
  skipsRound3: 0,
};

export default function CreateGamePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.gameName.trim()) {
      setError('Game name is required');
      return;
    }
    if (!form.hostName.trim()) {
      setError('Your name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            name: form.gameName.trim(),
            language: form.language,
            maxPlayers: form.maxPlayers,
            wordsPerPlayer: form.wordsPerPlayer,
            timerRound1: form.timerRound1,
            timerRound2: form.timerRound2,
            timerRound3: form.timerRound3,
            skipsRound1: form.skipsRound1,
            skipsRound2: form.skipsRound2,
            skipsRound3: form.skipsRound3,
          },
          hostName: form.hostName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create game');
        return;
      }

      const data = await res.json();
      localStorage.setItem('kalameh-gameCode', data.code);
      localStorage.setItem('kalameh-playerId', String(data.playerId));
      localStorage.setItem(`kalameh-playerId-${data.code}`, String(data.playerId));
      localStorage.setItem('kalameh-playerName', form.hostName.trim());
      router.push(`/game/${data.code}/lobby`);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const rounds = [
    { key: 1, label: t('create.round1'), timerKey: 'timerRound1' as const, skipsKey: 'skipsRound1' as const },
    { key: 2, label: t('create.round2'), timerKey: 'timerRound2' as const, skipsKey: 'skipsRound2' as const },
    { key: 3, label: t('create.round3'), timerKey: 'timerRound3' as const, skipsKey: 'skipsRound3' as const },
  ];

  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} />

      <main className="flex-1 flex justify-center px-4 py-8">
        <Card variant="elevated" padding="lg" className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-[#f5a623] mb-6 text-center">
            {t('create.title')}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Game Name & Host Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('create.gameName')}
                placeholder={t('create.gameNamePlaceholder')}
                value={form.gameName}
                onChange={(e) => update('gameName', e.target.value)}
                maxLength={50}
              />
              <Input
                label={t('create.hostName')}
                placeholder={t('create.hostNamePlaceholder')}
                value={form.hostName}
                onChange={(e) => update('hostName', e.target.value)}
                maxLength={30}
              />
            </div>

            {/* Language */}
            <div>
              <label className="text-sm font-medium text-[#f0e6d3] block mb-2">
                {t('create.language')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => update('language', 'en')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    form.language === 'en'
                      ? 'bg-[#f5a623] text-[#1a1520] border-[#f5a623] shadow-[0_0_10px_rgba(245,166,35,0.3)]'
                      : 'bg-[#2a2035] text-[#a89b8c] border-[#3d3248] hover:border-[#f5a623] hover:text-[#f5a623]'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => update('language', 'fa')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    form.language === 'fa'
                      ? 'bg-[#f5a623] text-[#1a1520] border-[#f5a623] shadow-[0_0_10px_rgba(245,166,35,0.3)]'
                      : 'bg-[#2a2035] text-[#a89b8c] border-[#3d3248] hover:border-[#f5a623] hover:text-[#f5a623]'
                  }`}
                >
                  فارسی
                </button>
              </div>
            </div>

            {/* Players & Words */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#f0e6d3] block mb-2">
                  {t('create.maxPlayers')}
                </label>
                <select
                  value={form.maxPlayers}
                  onChange={(e) => update('maxPlayers', Number(e.target.value))}
                  className="w-full rounded-lg border border-[#3d3248] bg-[#2a2035] px-3 py-2 text-sm text-[#f0e6d3] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623]"
                >
                  {[4, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#f0e6d3] block mb-2">
                  {t('create.wordsPerPlayer')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={8}
                    value={form.wordsPerPlayer}
                    onChange={(e) => update('wordsPerPlayer', Number(e.target.value))}
                    className="flex-1 accent-[#f5a623]"
                  />
                  <span className="text-lg font-semibold text-[#f5a623] w-8 text-center">
                    {form.wordsPerPlayer}
                  </span>
                </div>
              </div>
            </div>

            {/* Round Settings */}
            <div>
              <h3 className="text-sm font-medium text-[#f0e6d3] mb-3">
                {t('create.timerSettings')} &amp; {t('create.skipSettings')}
              </h3>
              <div className="flex flex-col gap-3">
                {rounds.map((round) => (
                  <div
                    key={round.key}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-[#1a1520] rounded-lg border border-[#3d3248]/50"
                  >
                    <span className="text-sm font-medium text-[#a89b8c] sm:w-48 shrink-0">
                      {round.label}
                    </span>
                    <div className="flex gap-3 flex-1">
                      <div className="flex items-center gap-1.5 flex-1">
                        <label className="text-xs text-[#a89b8c] shrink-0">{t('create.timer')}</label>
                        <input
                          type="number"
                          min={15}
                          max={90}
                          value={form[round.timerKey]}
                          onChange={(e) => update(round.timerKey, Number(e.target.value))}
                          className="w-full rounded-lg border border-[#3d3248] bg-[#2a2035] px-2 py-1.5 text-sm text-[#f0e6d3] text-center focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                        />
                        <span className="text-xs text-[#a89b8c]">s</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <label className="text-xs text-[#a89b8c] shrink-0">{t('create.skips')}</label>
                        {round.key === 1 ? (
                          <div className="w-full rounded-lg border border-[#3d3248] bg-[#2a2035] px-2 py-1.5 text-sm text-[#f5a623] text-center">
                            ∞
                          </div>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={5}
                            value={form[round.skipsKey]}
                            onChange={(e) => update(round.skipsKey, Number(e.target.value))}
                            className="w-full rounded-lg border border-[#3d3248] bg-[#2a2035] px-2 py-1.5 text-sm text-[#f0e6d3] text-center focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error & Submit */}
            {error && (
              <p className="text-sm text-[#e74c3c] text-center">{error}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {t('create.submit')}
            </Button>
          </form>
        </Card>
      </main>
    </>
  );
}
