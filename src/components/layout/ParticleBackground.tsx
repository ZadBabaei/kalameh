'use client';

import { useEffect } from 'react';

// particles.js attaches `particlesJS` and `pJSDom` to window — no ES default export.
type ParticlesJSFn = (id: string, config: object) => void;
interface PJSWindow extends Window {
  particlesJS?: ParticlesJSFn;
  pJSDom?: Array<{ pJS: { fn: { vendors: { destroypJS: () => void } } } }>;
}

export default function ParticleBackground() {
  useEffect(() => {
    let destroyed = false;

    (async () => {
      try {
        // Side-effect import: particles.js v2 registers itself on `window`.
        await import('particles.js');
        if (destroyed) return;

        const w = window as PJSWindow;
        if (typeof w.particlesJS !== 'function') return;

        w.particlesJS('particles-js', {
          particles: {
            number: { value: 70, density: { enable: true, value_area: 900 } },
            color: { value: ['#f5a623', '#ffd27a', '#ffffff'] },
            shape: { type: 'circle' },
            opacity: {
              value: 0.35,
              random: true,
              anim: { enable: true, speed: 0.6, opacity_min: 0.1, sync: false },
            },
            size: {
              value: 2.6,
              random: true,
              anim: { enable: false },
            },
            line_linked: {
              enable: true,
              distance: 150,
              color: '#f5a623',
              opacity: 0.18,
              width: 1,
            },
            move: {
              enable: true,
              speed: 1.1,
              direction: 'none',
              random: true,
              straight: false,
              out_mode: 'out',
              bounce: false,
            },
          },
          interactivity: {
            detect_on: 'canvas',
            events: {
              onhover: { enable: true, mode: 'grab' },
              onclick: { enable: false },
              resize: true,
            },
            modes: {
              grab: { distance: 180, line_linked: { opacity: 0.5 } },
            },
          },
          retina_detect: true,
        });
      } catch {
        // Library failed to load — CSS fallback dots keep the screen alive.
      }
    })();

    return () => {
      destroyed = true;
      const w = window as PJSWindow;
      if (w.pJSDom && w.pJSDom.length > 0) {
        try {
          w.pJSDom[w.pJSDom.length - 1].pJS.fn.vendors.destroypJS();
          w.pJSDom.pop();
        } catch {
          // ignore teardown errors
        }
      }
    };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Radial gold glow backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,166,35,0.12)_0%,_transparent_55%),_radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.08)_0%,_transparent_60%)]" />
        {/* Particles canvas (covers the glow) */}
        <div id="particles-js" className="absolute inset-0" />
        {/* CSS fallback dots (only visible if particles.js fails to mount) */}
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
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(245, 166, 35, 0.35);
          animation: particle-float 8s ease-in-out infinite alternate;
        }
        @keyframes particle-float {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.25; }
          50%  { transform: translateY(-30px) scale(1.2); opacity: 0.45; }
          100% { transform: translateY(10px) scale(0.9);  opacity: 0.15; }
        }
      `}</style>
    </>
  );
}
