'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Navbar } from '@/components/layout';
import { Button, Input, Card } from '@/components/ui';

interface DictWord {
  id: number;
  word: string;
  difficulty: string;
}

interface LocalWord {
  text: string;
  sourceWordId?: number;
  isCustom: boolean;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: 'bg-[#27ae60]/15', text: 'text-[#27ae60]', border: 'border-[#27ae60]/40' },
  moderate: { bg: 'bg-[#f5a623]/15', text: 'text-[#f5a623]', border: 'border-[#f5a623]/40' },
  hard: { bg: 'bg-[#e74c3c]/15', text: 'text-[#e74c3c]', border: 'border-[#e74c3c]/40' },
};

/* ── Swipeable Row Component ── */
function SwipeableWord({
  word,
  index,
  onRemove,
}: {
  word: LocalWord;
  index: number;
  onRemove: (i: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const dragging = useRef(false);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    dragging.current = true;
    const moveHandler = (ev: MouseEvent) => handleMove(ev.clientX);
    const upHandler = () => {
      handleEnd();
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  const handleMove = (clientX: number) => {
    if (!dragging.current) return;
    const diff = startX.current - clientX;
    const clamped = diff > 0 ? Math.min(diff, 120) : 0;
    offsetRef.current = clamped;
    setOffset(clamped);
  };

  const handleEnd = () => {
    dragging.current = false;
    if (offsetRef.current > 80) {
      setRemoving(true);
      setTimeout(() => onRemove(index), 300);
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-[#e74c3c] rounded-lg w-full">
        <span className="text-white text-sm font-medium">Delete</span>
      </div>

      {/* Swipeable content */}
      <div
        ref={rowRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        className={`relative z-10 flex items-center justify-between px-4 py-3 bg-[#2a2035] border border-[#3d3248] rounded-lg cursor-grab active:cursor-grabbing select-none transition-all ${removing ? 'opacity-0 -translate-x-full' : ''}`}
        style={{
          transform: removing ? undefined : `translateX(-${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#a89b8c]/50 text-sm font-mono w-5 shrink-0">{index + 1}</span>
          <span className="text-[#f0e6d3] truncate">{word.text}</span>
          {word.isCustom && (
            <span className="text-[10px] text-[#a89b8c]/50 bg-[#3d3248] px-1.5 py-0.5 rounded shrink-0">
              custom
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setRemoving(true);
            setTimeout(() => onRemove(index), 300);
          }}
          className="text-[#a89b8c]/40 hover:text-[#e74c3c] transition-colors shrink-0 ml-2"
          aria-label="Remove"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function AddWordsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const code = params.code;

  const [wordsPerPlayer, setWordsPerPlayer] = useState(5);
  const [myWords, setMyWords] = useState<LocalWord[]>([]);
  const [customWord, setCustomWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Word generator state
  const [easyCount, setEasyCount] = useState(2);
  const [moderateCount, setModerateCount] = useState(2);
  const [hardCount, setHardCount] = useState(1);
  const [generatedWords, setGeneratedWords] = useState<DictWord[]>([]);
  const [generating, setGenerating] = useState(false);

  const myPlayerId = typeof window !== 'undefined'
    ? Number(localStorage.getItem(`kalameh-playerId-${code}`) || localStorage.getItem('kalameh-playerId'))
    : null;

  // Fetch game info + poll for status changes
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        setWordsPerPlayer(data.game.settings.wordsPerPlayer);

        const me = data.players.find((p: { id: number }) => p.id === myPlayerId);
        if (me?.wordsSubmitted) setSubmitted(true);

        // If game moved to playing, redirect to play page
        if (data.game.status === 'playing') {
          router.push(`/game/${code}/play`);
        }
      } catch {
        // retry on next poll
      }
    }
    fetchGame();
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [code, myPlayerId, router]);

  const handleGenerate = useCallback(async () => {
    const total = easyCount + moderateCount + hardCount;
    if (total === 0) return;
    setGenerating(true);
    setError('');

    try {
      const requests: Promise<DictWord[]>[] = [];

      const pid = myPlayerId || '';
      if (easyCount > 0) {
        requests.push(
          fetch(`/api/games/${code}/words?difficulty=easy&count=${easyCount}&playerId=${pid}`)
            .then(r => r.ok ? r.json() : { words: [] })
            .then(d => d.words || [])
        );
      }
      if (moderateCount > 0) {
        requests.push(
          fetch(`/api/games/${code}/words?difficulty=moderate&count=${moderateCount}&playerId=${pid}`)
            .then(r => r.ok ? r.json() : { words: [] })
            .then(d => d.words || [])
        );
      }
      if (hardCount > 0) {
        requests.push(
          fetch(`/api/games/${code}/words?difficulty=hard&count=${hardCount}&playerId=${pid}`)
            .then(r => r.ok ? r.json() : { words: [] })
            .then(d => d.words || [])
        );
      }

      const results = await Promise.all(requests);
      const allWords = results.flat();
      // Shuffle
      for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
      }
      setGeneratedWords(allWords);
    } catch {
      setError('Failed to generate words');
    } finally {
      setGenerating(false);
    }
  }, [code, easyCount, moderateCount, hardCount]);

  const addFromGenerated = (word: DictWord) => {
    if (myWords.length >= wordsPerPlayer) return;
    if (myWords.some((w) => w.text.toLowerCase() === word.word.toLowerCase())) {
      setError(t('words.duplicate'));
      return;
    }
    setError('');
    setMyWords((prev) => [...prev, { text: word.word, sourceWordId: word.id, isCustom: false }]);
    setGeneratedWords((prev) => prev.filter((w) => w.id !== word.id));
  };

  const addCustom = () => {
    const text = customWord.trim();
    if (!text || myWords.length >= wordsPerPlayer) return;
    if (myWords.some((w) => w.text.toLowerCase() === text.toLowerCase())) {
      setError(t('words.duplicate'));
      return;
    }
    setError('');
    setMyWords((prev) => [...prev, { text, isCustom: true }]);
    setCustomWord('');
  };

  const removeWord = (index: number) => {
    setMyWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (myWords.length !== wordsPerPlayer || !myPlayerId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/games/${code}/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId, words: myWords }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit words');
        return;
      }
      const data = await res.json();
      if (data.allSubmitted) {
        router.push(`/game/${code}/play`);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');
  const isFull = myWords.length >= wordsPerPlayer;

  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} gameCode={code} />

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto flex flex-col gap-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#f0e6d3]">{t('words.title')}</h1>
            <p className="text-sm text-[#a89b8c] mt-1">
              {t('words.wordsCount', { count: myWords.length, total: wordsPerPlayer })}
            </p>
          </div>

          {submitted ? (
            /* ── Submitted: waiting for others ── */
            <Card variant="elevated" padding="lg" className="text-center">
              <div className="text-[#27ae60] text-5xl mb-4">&#10003;</div>
              <h2 className="text-xl font-semibold text-[#f0e6d3] mb-2">{t('words.submitted')}</h2>
              <p className="text-[#a89b8c]">{t('words.waiting')}</p>
            </Card>
          ) : (
            <>
              {/* ═══════════ 1. WORD GENERATOR ═══════════ */}
              <Card variant="elevated" padding="md">
                <h3 className="text-lg font-semibold text-[#f5a623] mb-4">{t('words.generator')}</h3>

                {/* Difficulty Selectors */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* Easy */}
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-sm font-medium text-[#27ae60]">{t('words.easy')}</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEasyCount(Math.max(0, easyCount - 1))}
                        className="w-8 h-8 rounded-lg bg-[#27ae60]/15 text-[#27ae60] font-bold hover:bg-[#27ae60]/25 transition-colors"
                      >−</button>
                      <span className="text-lg font-bold text-[#f0e6d3] w-6 text-center">{easyCount}</span>
                      <button
                        onClick={() => setEasyCount(Math.min(10, easyCount + 1))}
                        className="w-8 h-8 rounded-lg bg-[#27ae60]/15 text-[#27ae60] font-bold hover:bg-[#27ae60]/25 transition-colors"
                      >+</button>
                    </div>
                  </div>

                  {/* Moderate */}
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-sm font-medium text-[#f5a623]">{t('words.moderate')}</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModerateCount(Math.max(0, moderateCount - 1))}
                        className="w-8 h-8 rounded-lg bg-[#f5a623]/15 text-[#f5a623] font-bold hover:bg-[#f5a623]/25 transition-colors"
                      >−</button>
                      <span className="text-lg font-bold text-[#f0e6d3] w-6 text-center">{moderateCount}</span>
                      <button
                        onClick={() => setModerateCount(Math.min(10, moderateCount + 1))}
                        className="w-8 h-8 rounded-lg bg-[#f5a623]/15 text-[#f5a623] font-bold hover:bg-[#f5a623]/25 transition-colors"
                      >+</button>
                    </div>
                  </div>

                  {/* Hard */}
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-sm font-medium text-[#e74c3c]">{t('words.hard')}</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHardCount(Math.max(0, hardCount - 1))}
                        className="w-8 h-8 rounded-lg bg-[#e74c3c]/15 text-[#e74c3c] font-bold hover:bg-[#e74c3c]/25 transition-colors"
                      >−</button>
                      <span className="text-lg font-bold text-[#f0e6d3] w-6 text-center">{hardCount}</span>
                      <button
                        onClick={() => setHardCount(Math.min(10, hardCount + 1))}
                        className="w-8 h-8 rounded-lg bg-[#e74c3c]/15 text-[#e74c3c] font-bold hover:bg-[#e74c3c]/25 transition-colors"
                      >+</button>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={easyCount + moderateCount + hardCount === 0}
                >
                  {t('words.generate')}
                </Button>

                {/* Generated Word Chips */}
                {generatedWords.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-[#a89b8c]/70 mb-2">{t('words.clickToAdd')}</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedWords.map((word) => {
                        const colors = DIFFICULTY_COLORS[word.difficulty] || DIFFICULTY_COLORS.easy;
                        return (
                          <button
                            key={word.id}
                            onClick={() => addFromGenerated(word)}
                            disabled={isFull}
                            className={`px-3 py-1.5 text-sm rounded-full border ${colors.bg} ${colors.text} ${colors.border} hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {word.word}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>

              {/* ═══════════ 2. CUSTOM WORD INPUT ═══════════ */}
              <Card variant="outlined" padding="md">
                <h3 className="text-sm font-medium text-[#f0e6d3] mb-3">{t('words.customWord')}</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('words.customPlaceholder')}
                    value={customWord}
                    onChange={(e) => setCustomWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                    disabled={isFull}
                  />
                  <Button
                    variant="secondary"
                    onClick={addCustom}
                    disabled={!customWord.trim() || isFull}
                  >
                    {t('words.add')}
                  </Button>
                </div>
              </Card>

              {/* ═══════════ 3. MY WORD POOL (swipe to delete) ═══════════ */}
              <div>
                <h3 className="text-sm font-medium text-[#f0e6d3] mb-3 flex items-center justify-between">
                  <span>{t('words.myWords')}</span>
                  <span className="text-[#f5a623]">{myWords.length}/{wordsPerPlayer}</span>
                </h3>
                {myWords.length === 0 ? (
                  <div className="border border-dashed border-[#3d3248] rounded-xl py-8 text-center">
                    <p className="text-sm text-[#a89b8c]/50">{t('words.emptyPool')}</p>
                    <p className="text-xs text-[#a89b8c]/30 mt-1">{t('words.swipeHint')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {myWords.map((word, i) => (
                      <SwipeableWord
                        key={`${word.text}-${i}`}
                        word={word}
                        index={i}
                        onRemove={removeWord}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-[#e74c3c] text-center">{error}</p>
              )}

              {/* ═══════════ 4. SUBMIT BUTTON ═══════════ */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                loading={submitting}
                disabled={myWords.length !== wordsPerPlayer}
              >
                {t('words.addToBowl')} ({myWords.length}/{wordsPerPlayer})
              </Button>
            </>
          )}
        </div>
      </main>
    </>
  );
}
