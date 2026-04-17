'use client';

import { useEffect, useRef, useState } from 'react';

type Size = 'sm' | 'md' | 'lg';

interface TimerProps {
  duration: number;
  isRunning: boolean;
  onTimeUp?: () => void;
  size?: Size;
}

const sizeConfig: Record<Size, { radius: number; stroke: number; textClass: string; svgSize: number }> = {
  sm: { radius: 28, stroke: 3, textClass: 'text-lg font-bold', svgSize: 72 },
  md: { radius: 40, stroke: 4, textClass: 'text-2xl font-bold', svgSize: 96 },
  lg: { radius: 56, stroke: 5, textClass: 'text-4xl font-bold', svgSize: 128 },
};

function getColor(ratio: number): string {
  if (ratio > 0.5) return '#27ae60'; // green
  if (ratio > 0.25) return '#f5a623'; // gold
  return '#e74c3c'; // red
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Timer({
  duration,
  isRunning,
  onTimeUp,
  size = 'md',
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const timeLeftRef = useRef(timeLeft);

  // Sync when duration changes externally
  useEffect(() => {
    setTimeLeft(duration);
    timeLeftRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
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
          onTimeUp?.();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, onTimeUp]);

  const { radius, stroke, textClass, svgSize } = sizeConfig[size];
  const ratio = duration > 0 ? timeLeft / duration : 0;
  const color = getColor(ratio);
  const center = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div className="inline-flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        aria-label={`Timer: ${formatTime(timeLeft)} remaining`}
        role="timer"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#3d3248"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
        />
        {/* Time text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          className={textClass}
          style={{ transition: 'fill 0.3s ease', fontFamily: 'inherit' }}
        >
          {formatTime(timeLeft)}
        </text>
      </svg>
    </div>
  );
}
