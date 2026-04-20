'use client';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Kalameh"
    >
      <defs>
        <linearGradient id="kalameh-bowl" x1="5" y1="15" x2="27" y2="27.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5a623" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f5a623" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="kalameh-k" x1="12" y1="18" x2="19" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="100%" stopColor="#f5a623" />
        </linearGradient>
      </defs>

      {/* Bowl body — gradient fill */}
      <path
        d="M5 15 C5 23.5 10.5 27.5 16 27.5 C21.5 27.5 27 23.5 27 15 Z"
        fill="url(#kalameh-bowl)"
      />

      {/* Bowl arc */}
      <path
        d="M5 15 C5 23.5 10.5 27.5 16 27.5 C21.5 27.5 27 23.5 27 15"
        stroke="#f5a623"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bowl rim */}
      <line
        x1="3.5"
        y1="15"
        x2="28.5"
        y2="15"
        stroke="#f5a623"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Letter K inside bowl */}
      <line x1="12.5" y1="18.5" x2="12.5" y2="25" stroke="url(#kalameh-k)" strokeWidth="2" strokeLinecap="round" />
      <line x1="12.5" y1="21.2" x2="18.5" y2="18.5" stroke="url(#kalameh-k)" strokeWidth="2" strokeLinecap="round" />
      <line x1="12.5" y1="21.2" x2="19" y2="25" stroke="url(#kalameh-k)" strokeWidth="2" strokeLinecap="round" />

      {/* Three word-dots floating above the bowl */}
      <circle cx="11" cy="9.5" r="1.3" fill="#f5a623" opacity="0.55" />
      <circle cx="16" cy="7" r="1.7" fill="#f5a623" />
      <circle cx="16" cy="7" r="3" fill="#f5a623" opacity="0.18" />
      <circle cx="21" cy="9.5" r="1.3" fill="#f5a623" opacity="0.55" />
    </svg>
  );
}
