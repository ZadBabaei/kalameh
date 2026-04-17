'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTimerOptions {
  initialDuration: number;
  autoStart?: boolean;
  onTimeUp?: () => void;
}

interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newDuration?: number) => void;
}

export function useTimer({
  initialDuration,
  autoStart = false,
  onTimeUp,
}: UseTimerOptions): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(autoStart);

  const timeLeftRef = useRef(initialDuration);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Keep onTimeUp ref current without restarting the loop
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTickRef.current = null;
  }, []);

  useEffect(() => {
    if (!isRunning) {
      stopRaf();
      return;
    }

    const tick = (now: number) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }

      const elapsed = now - lastTickRef.current;

      if (elapsed >= 1000) {
        const secondsPassed = Math.floor(elapsed / 1000);
        lastTickRef.current = now - (elapsed % 1000);

        const next = Math.max(0, timeLeftRef.current - secondsPassed);
        timeLeftRef.current = next;
        setTimeLeft(next);

        if (next === 0) {
          setIsRunning(false);
          onTimeUpRef.current?.();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => stopRaf();
  }, [isRunning, stopRaf]);

  const start = useCallback(() => {
    if (timeLeftRef.current > 0) {
      setIsRunning(true);
    }
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(
    (newDuration?: number) => {
      stopRaf();
      const duration = newDuration !== undefined ? newDuration : initialDuration;
      timeLeftRef.current = duration;
      setTimeLeft(duration);
      setIsRunning(autoStart);
    },
    [initialDuration, autoStart, stopRaf],
  );

  return { timeLeft, isRunning, start, pause, reset };
}
