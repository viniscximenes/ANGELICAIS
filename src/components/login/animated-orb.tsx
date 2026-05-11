"use client";

export function AnimatedOrb() {
  return (
    <div className="orb-wrapper" aria-hidden="true">
      <div className="orb-glow" />
      <div className="orb-ring" />
      <style jsx>{`
        .orb-wrapper {
          position: relative;
          width: 264px;
          height: 264px;
        }
        .orb-glow {
          position: absolute;
          inset: -200%;
          background: radial-gradient(
            circle at center,
            var(--glow-accent-strong) 0%,
            var(--glow-accent) 10%,
            color-mix(in oklch, var(--glow-accent) 60%, transparent) 20%,
            color-mix(in oklch, var(--glow-accent) 30%, transparent) 35%,
            color-mix(in oklch, var(--glow-accent) 12%, transparent) 55%,
            color-mix(in oklch, var(--glow-accent) 4%, transparent) 75%,
            transparent 95%
          );
          pointer-events: none;
        }
        .orb-ring {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: conic-gradient(
            from 0deg,
            oklch(0.68 0.22 25),
            oklch(0.78 0.18 60),
            oklch(0.88 0.17 95),
            oklch(0.78 0.18 145),
            oklch(0.78 0.14 195),
            oklch(0.65 0.2 250),
            oklch(0.55 0.25 290),
            oklch(0.68 0.25 340),
            oklch(0.68 0.22 25)
          );
          -webkit-mask: radial-gradient(
            circle at center,
            transparent 0,
            transparent 30%,
            black 32%,
            black 49%,
            transparent 50%
          );
          mask: radial-gradient(
            circle at center,
            transparent 0,
            transparent 30%,
            black 32%,
            black 49%,
            transparent 50%
          );
          animation: orb-spin 12s linear infinite;
        }
        @media (min-width: 1024px) {
          .orb-wrapper {
            width: 400px;
            height: 400px;
          }
        }
        @keyframes orb-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
