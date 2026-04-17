'use client';

import { useEffect } from 'react';

export default function ParticleBackground() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        // particles.js requires window — dynamic import keeps it client-only
        const particlesJS = (await import('particles.js' as string)).default as (
          id: string,
          config: object
        ) => void;

        particlesJS('particles-js', {
          particles: {
            number: { value: 60, density: { enable: true, value_area: 800 } },
            color: { value: '#ffffff' },
            shape: { type: 'circle' },
            opacity: { value: 0.15, random: true },
            size: { value: 3, random: true },
            line_linked: {
              enable: true,
              distance: 140,
              color: '#ffffff',
              opacity: 0.08,
              width: 1,
            },
            move: {
              enable: true,
              speed: 0.8,
              direction: 'none',
              random: true,
              straight: false,
              out_mode: 'out',
              bounce: false,
            },
          },
          interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: false }, onclick: { enable: false }, resize: true },
          },
          retina_detect: true,
        });

        cleanup = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = window as any;
          if (win.pJSDom && win.pJSDom.length > 0) {
            win.pJSDom[win.pJSDom.length - 1].pJS.fn.vendors.destroypJS();
            win.pJSDom.pop();
          }
        };
      } catch {
        // particles.js unavailable — CSS fallback handles the visual
      }
    })();

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <>
      {/* CSS-only animated dots shown as fallback (always rendered; hidden behind canvas when particles load) */}
      <div
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div id="particles-js" className="absolute inset-0" />
        <span className="particle-dot" style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
        <span className="particle-dot" style={{ top: '25%', left: '70%', animationDelay: '2s' }} />
        <span className="particle-dot" style={{ top: '55%', left: '40%', animationDelay: '4s' }} />
        <span className="particle-dot" style={{ top: '75%', left: '80%', animationDelay: '1s' }} />
        <span className="particle-dot" style={{ top: '85%', left: '20%', animationDelay: '3s' }} />
        <span className="particle-dot" style={{ top: '40%', left: '90%', animationDelay: '5s' }} />
      </div>

      <style>{`
        .particle-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          animation: particle-float 8s ease-in-out infinite alternate;
        }
        @keyframes particle-float {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.15; }
          50%  { transform: translateY(-30px) scale(1.2); opacity: 0.3; }
          100% { transform: translateY(10px) scale(0.9);  opacity: 0.1; }
        }
      `}</style>
    </>
  );
}
