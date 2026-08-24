"use client";

/**
 * BeedooIcon — ícone fixo da IA nas mensagens do chat.
 * Estrela sparkle de 4 pontas branca, sem fundo. Estático.
 */
export function BeedooIcon({ size = 28 }: { size?: number }) {
  const s = size;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s,
        height: s,
        flexShrink: 0,
      }}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Estrela sparkle de 4 pontas branca */}
        <ellipse cx="50" cy="50" rx="5"  ry="22" fill="white" />
        <ellipse cx="50" cy="50" rx="22" ry="5"  fill="white" />
        <ellipse cx="50" cy="50" rx="4"  ry="16" fill="white" opacity="0.6" transform="rotate(45 50 50)" />
        <ellipse cx="50" cy="50" rx="4"  ry="16" fill="white" opacity="0.6" transform="rotate(-45 50 50)" />

        {/* Mini-estrela superior direita */}
        <circle cx="76" cy="26" r="2.5" fill="white" opacity="0.7" />
        <line x1="76" y1="20" x2="76" y2="32" stroke="white" strokeWidth="1.2" opacity="0.5" />
        <line x1="70" y1="26" x2="82" y2="26" stroke="white" strokeWidth="1.2" opacity="0.5" />

        {/* Mini-estrela inferior esquerda */}
        <circle cx="26" cy="74" r="2" fill="white" opacity="0.6" />
        <line x1="26" y1="69" x2="26" y2="79" stroke="white" strokeWidth="1" opacity="0.4" />
        <line x1="21" y1="74" x2="31" y2="74" stroke="white" strokeWidth="1" opacity="0.4" />
      </svg>
    </span>
  );
}
