import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Instrument_Sans } from "next/font/google";

import "./kpi-detalhado-polo.css";
import { KpiDetalhadoSection } from "@/components/operacional/kpi-detalhado/kpi-detalhado-section";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { getKpiDetalhado } from "@/lib/kpi/detalhado/get-kpi-detalhado";

export const metadata: Metadata = {
  title: "KPI - Detalhado Polo",
};

// Fonte do tema Zen Linen — carregada só nesta rota (mesmo padrão de
// /kpi/operadores e /kpi/gestor: next/font/google gera uma variável
// escopada ao módulo que a importa, referenciada só dentro de
// [data-page="kpi-detalhado-polo"] em kpi-detalhado-polo.css, então não
// afeta nenhuma outra página).
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

// Snapshot de todas as equipes, embaralhado a cada request — nunca cacheado.
export const dynamic = "force-dynamic";

// Loading "fake" de piso mínimo — mesma regra de /s/reports/consolidado e
// /kpi/operadores: o loading.tsx (Suspense fallback, entrada de rota/F5/
// refresh) fica no mínimo MIN_LOADING_MS na tela, contados desde a entrada
// nesta função. Se a busca real já passou disso, não espera nada.
const MIN_LOADING_MS = 3_000;

async function aguardarPisoMinimo(desde: number) {
  const faltam = MIN_LOADING_MS - (Date.now() - desde);
  if (faltam > 0) {
    await new Promise((resolve) => setTimeout(resolve, faltam));
  }
}

export default async function KpiDetalhadoPolo() {
  const inicioCarregamento = Date.now();

  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // Mesmo gate das demais telas do gestor: só role GESTOR (com ou sem
  // is_admin_skill). O ADM tem view_gestor_panel mas é confinado a /bases e
  // /configuracoes pelo middleware.
  if (user.profile.role !== "GESTOR") {
    redirect(getPostLoginPath(user.profile.role));
  }

  const dados = await getKpiDetalhado();

  await aguardarPisoMinimo(inicioCarregamento);

  // Sem <PageTransition> (mesmo motivo de /s/reports/consolidado e
  // /kpi/operadores): o fade a partir de opacity:0 só anima após a
  // hidratação, deixando a tela vazia entre o loading.tsx sumir e os dados
  // aparecerem. Quem cobre a espera é o loading.tsx — a troca é direta.
  return (
    <>
      <div
        data-page="kpi-detalhado-polo"
        className={`min-h-screen overflow-x-clip px-6 py-8 lg:px-12 lg:py-12 ${zenSans.variable}`}
      >
        {/*
          `overflow-x-clip` aqui (só nesta página, via data-page): medido no
          Chrome, a tabela usa colunas `position: sticky` (Operador/Gestor)
          dentro do `overflow-x-auto` do card — mesmo com esse container
          corretamente contido (clientWidth bate com a largura visível), o
          elemento acima dele na árvore (o `KpiFrame`) reporta scrollWidth
          muito maior que seu clientWidth (7043 vs 1427px medido), sem
          nenhum filho visivelmente ultrapassando a caixa. É o comportamento
          conhecido do Chromium de vazar o scrollWidth de descendentes com
          `position: sticky` dentro de um scroll container aninhado para os
          ancestrais com overflow:visible — daqui esse vazamento chegava até
          `<body>`, rolando a PÁGINA pro lado. `overflow-x-clip` (em vez de
          `hidden`) trava esse vazamento na origem sem forçar overflow-y a
          virar "auto" (efeito colateral do `hidden` na spec de CSS) e sem
          esconder nada visível — a rolagem real de conteúdo continua sendo
          só a do card (`overflow-x-auto` da tabela) e a vertical da página.
        */}
        {/*
          Mais larga que /kpi/operadores e /kpi/gestor (max-w-7xl = 80rem) de
          propósito — cabe mais colunas na tabela. Mesmo respiro esquerdo das
          outras duas rotas sempre, largura livre pra crescer só pra DIREITA
          até 1700px, SEM nunca ultrapassar a largura disponível (o que
          causava rolagem horizontal da PÁGINA, não só da tabela).

          BUG da versão anterior: `marginLeft` (centralização de max-w-7xl) e
          `maxWidth: 1700px` eram resolvidos de forma independente. Pela
          spec de CSS (width:auto + margins não-auto ⇒ width preenche o
          restante do contêiner; max-width só troca esse width por 1700px
          quando ultrapassa, SEM recalcular as margens), o resultado virava
          `marginLeft + 1700px`, que ultrapassa a largura do contêiner sempre
          que ela é menor que ~2120px (ou seja, em quase qualquer tela) — daí
          a página rolando pra direita e mostrando fundo vazio depois do fim
          da tabela.

          Correção: `width` derivado do MESMO `marginLeft` (via custom
          property), então a soma nunca excede 100% do contêiner:
            marginLeft = max(0, (100% - 80rem) / 2)      [igual às outras rotas]
            width      = min(1700px, 100% - marginLeft)  [nunca estoura à direita]
          Se o contêiner for mais estreito que 1700px + marginLeft, a largura
          cede (fica igual à disponível) — nunca a margem esquerda, que é o
          espaçamento que precisa bater com operadores/gestor.

          `min-w-0` continua necessário: evita que o conteúdo (tabela com
          minWidth fixo lá dentro) empurre esta caixa a ficar mais larga que
          o disponível — quem estoura em largura fica só dentro do
          `overflow-x-auto` da tabela, contido.
        */}
        <div
          className="min-w-0 space-y-2"
          style={
            {
              "--kpi-detalhado-ml": "max(0px, calc((100% - 80rem) / 2))",
              marginLeft: "var(--kpi-detalhado-ml)",
              width: "min(1700px, calc(100% - var(--kpi-detalhado-ml)))",
            } as CSSProperties
          }
        >
          <KpiDetalhadoSection dados={dados} />
        </div>
      </div>
    </>
  );
}
