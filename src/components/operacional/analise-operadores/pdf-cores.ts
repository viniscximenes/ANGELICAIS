/**
 * Cores para o PDF em RGB [r,g,b] (jsPDF/autotable não aceitam oklch nem
 * alpha). Lê os tokens do tema CLARO (`[data-theme="light"]`) via
 * `getComputedStyle().color` — que o browser SEMPRE computa para `rgb(...)`
 * — de um `<span>` sonda destacado. Só lê `var(--x)` puro (garante saída
 * rgb); tons/tints e o "laranja" (warning×danger) são calculados em JS.
 */
export type RGB = [number, number, number];

const FALLBACK = {
  foreground: [24, 24, 27] as RGB,
  muted: [113, 113, 122] as RGB,
  border: [214, 214, 221] as RGB,
  headerBg: [244, 244, 245] as RGB,
  zebra: [250, 250, 251] as RGB,
  success: [22, 101, 52] as RGB,
  warning: [161, 98, 7] as RGB,
  danger: [153, 27, 27] as RGB,
  laranja: [157, 62, 17] as RGB,
  successBg: [222, 240, 228] as RGB,
  warningBg: [246, 236, 214] as RGB,
  dangerBg: [246, 224, 224] as RGB,
  laranjaBg: [247, 231, 221] as RGB,
};
export type CoresPdf = typeof FALLBACK;

function clamp(x: number): number {
  return Math.max(0, Math.min(255, Math.round(x)));
}

function parseRgb(s: string): RGB {
  const m = s.match(/-?\d*\.?\d+/g);
  if (!m || m.length < 3) return [0, 0, 0];
  return [clamp(+m[0]), clamp(+m[1]), clamp(+m[2])];
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  clamp(a[0] * (1 - t) + b[0] * t),
  clamp(a[1] * (1 - t) + b[1] * t),
  clamp(a[2] * (1 - t) + b[2] * t),
];
const WHITE: RGB = [255, 255, 255];
const tint = (c: RGB, pct: number): RGB => mix(WHITE, c, pct);

export function resolverCoresPdf(): CoresPdf {
  if (typeof document === "undefined") return FALLBACK;

  const probe = document.createElement("span");
  probe.setAttribute("data-theme", "light");
  probe.style.cssText = "position:fixed;left:-99999px;top:0;";
  document.body.appendChild(probe);

  const read = (expr: string): RGB => {
    probe.style.color = "";
    probe.style.color = expr;
    return parseRgb(getComputedStyle(probe).color);
  };

  const foreground = read("var(--foreground)");
  const muted = read("var(--muted-foreground)");
  const border = read("var(--border)");
  const success = read("var(--success)");
  const warning = read("var(--warning)");
  const danger = read("var(--danger)");
  probe.remove();

  const laranja = mix(warning, danger, 0.5);

  return {
    foreground,
    muted,
    border,
    headerBg: tint(muted, 0.12),
    zebra: tint(muted, 0.045),
    success,
    warning,
    danger,
    laranja,
    successBg: tint(success, 0.16),
    warningBg: tint(warning, 0.2),
    dangerBg: tint(danger, 0.14),
    laranjaBg: tint(laranja, 0.18),
  };
}
