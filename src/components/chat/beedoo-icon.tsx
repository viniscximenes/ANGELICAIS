"use client";

/**
 * BeedooIcon — reprodução fiel do símbolo Alloha Fibra:
 * círculo branco (o "O") com folha verde interna inclinada, fundo navy.
 * Animação mínima: glow suave na folha verde, sem movimentos.
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
      <style>{`
        @keyframes beedoo-leaf-glow {
          0%, 100% { filter: drop-shadow(0 0 ${s * 0.06}px rgba(46,180,80,0.0)); }
          50%       { filter: drop-shadow(0 0 ${s * 0.18}px rgba(46,180,80,0.7)); }
        }
        @keyframes beedoo-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "beedoo-fade-in 0.4s ease" }}
      >
        {/* Fundo circular navy */}
        <circle cx="50" cy="50" r="50" fill="#0B2044" />

        {/*
          O símbolo do Alloha:
          - Anel branco espesso representando o "O"
          - Clip no anel para parecer um círculo aberto (não preenchido)
          - Folha verde inclinada ~-35° dentro do centro do anel
        */}

        {/* Anel branco — o "O" do alloha */}
        <circle
          cx="50"
          cy="50"
          r="28"
          stroke="white"
          strokeWidth="13"
          fill="none"
        />

        {/* Folha verde interna — exatamente como o logo Alloha */}
        <ellipse
          cx="50"
          cy="50"
          rx="11"
          ry="19"
          fill="#2EB450"
          transform="rotate(-35 50 50)"
          style={{
            animation: "beedoo-leaf-glow 3s ease-in-out infinite",
          }}
        />
      </svg>
    </span>
  );
}
