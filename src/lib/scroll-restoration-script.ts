/**
 * Script inline e síncrono dos loading.tsx (Suspense fallback) das telas com
 * esqueleto: roda no PARSE do HTML do fallback, antes de qualquer
 * hidratação, desligando a restauração nativa de scroll e forçando o topo
 * antes do primeiro paint. Sem ele, o navegador podia restaurar e PINTAR a
 * posição de scroll salva (ex.: fim da página) antes da guarda em JS de cada
 * página agir — um frame na posição antiga e só depois o topo.
 *
 * Antes era a mesma string copiada em 11 loading.tsx (auditoria 2026-10-09).
 * Módulo sem dependências (nem next/headers): dois desses loading.tsx também
 * são importados por componentes client (CoordenadorSkeleton,
 * DiarioSkeleton).
 *
 * ATENÇÃO: a CSP libera este script pelo hash (SCRIPT_TOPO_HASH em
 * src/middleware.ts), não pelo nonce. Qualquer mudança no texto abaixo
 * (inclusive espaços e quebras de linha) exige recalcular o hash — senão o
 * navegador bloqueia o script (só deixa de forçar o topo; nada quebra).
 */
export const DESLIGAR_SCROLL_RESTORATION_SCRIPT = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch (e) {}
`;
