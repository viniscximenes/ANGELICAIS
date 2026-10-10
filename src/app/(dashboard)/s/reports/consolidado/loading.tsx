// Suspense fallback do Next.js pra /s/reports/consolidado — mostrado
// automaticamente enquanto o Server Component de page.tsx (async, aguarda
// getGestorConsolidado + outras 4 chamadas em paralelo, mais o piso mínimo
// de MIN_LOADING_MS — ver page.tsx) ainda não resolveu.
//
// Reescrito pra ESPELHAR EXATAMENTE o layout real (não um formato genérico
// compartilhado, tipo o antigo KpiLoadingScreen formato="consolidado"): mesmo
// wrapper (`data-page`, `max-w-7xl`, paddings), mesmas classes literais de
// título/subtítulo/linha de botões (copiadas de gestor-equipe-section.tsx),
// mesma largura de coluna da tabela (BASE_COLUMN_WIDTHS_PX de
// equipe-table.tsx) dentro do MESMO componente KpiFrame (cantoneiras reais,
// sem duplicar o desenho), e mesma altura de gráfico (280px, ver
// grafico-evolucao.tsx). Onde um elemento real não depende de dado nenhum
// (ConsolidadoNavSidebar), ele é renderizado de verdade — não um placeholder.
//
// Isso evita o "pulo" de layout quando os dados chegam: todo bloco do
// skeleton ocupa a MESMA posição/tamanho que o elemento real vai ocupar.
//
// Exceção: a barra lateral flutuante de navegação (ConsolidadoNavSidebar) —
// antes renderizada AQUI de verdade (não depende de dado nenhum, só de
// scroll/DOM da página real). Na prática isso saía errado: ela é "use
// client" com estado próprio (hover expande 60px→300px) e os onClick fazem
// scroll até #trilho-card-N, elementos que não existem durante o loading —
// ficava um componente "de verdade", interativo mas quebrado, solto dentro
// da tela de loading, em vez de um esqueleto mudo como todo o resto.
// Trocada por um placeholder mudo (SkeletonNavSidebar, abaixo) na MESMA
// posição/tamanho (fixed, top-24 right-4, 60px colapsado) — mesmo tratamento
// dos outros blocos desta tela.

import { cookies } from "next/headers";

import { COOKIE_LINHAS, COOKIE_RV, ConsolidadoSkeleton } from "./consolidado-skeleton";
import { DESLIGAR_SCROLL_RESTORATION_SCRIPT } from "@/lib/scroll-restoration-script";

// Script de scroll do fallback (desliga a restauração nativa e força o
// topo antes do primeiro paint) — texto em src/lib/scroll-restoration-script.ts.
// A segunda camada (guarda em JS) fica em RetencaoDetalheSection.

export default async function LoadingReportsConsolidado() {
  // Nº de operadores da última tabela vista neste navegador (gravado por
  // GestorEquipeSection) — esqueleto com a mesma altura da tabela real.
  const jar = await cookies();
  const salvo = Number(jar.get(COOKIE_LINHAS)?.value);
  const linhas = Number.isInteger(salvo) && salvo > 0 && salvo <= 200 ? salvo : undefined;
  // Coluna RV aberta na última visita — esqueleto com a mesma largura.
  const rvAberto = jar.get(COOKIE_RV)?.value === "1";

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DESLIGAR_SCROLL_RESTORATION_SCRIPT }} />
      <ConsolidadoSkeleton linhas={linhas} rvAberto={rvAberto} />
    </>
  );
}

