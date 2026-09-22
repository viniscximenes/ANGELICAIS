import { RetencaoHorizontalScroll } from "@/components/dashboard/retencao/retencao-horizontal-scroll";
import { AguardandoDadosCard } from "@/components/gestor/aguardando-dados-card";
import type { NomeFantasiaSerial } from "@/lib/gestor/nome-fantasia/aplicar-fantasia";
import { calcularPesoDesigual } from "@/lib/tma/calcular-peso-desigual";
import type { OperadorTma } from "@/lib/tma/get-gestor-tma";
import type { GestorTmaAnaliticoResult } from "@/lib/tma/get-gestor-tma-analitico";
import { AnaliticoTmaTabela } from "./analitico-tma-tabela";
import { CardForaDaCurva } from "./card-fora-da-curva";
import { CardPesoDesigual } from "./card-peso-desigual";
import { CardRechamada } from "./card-rechamada";
import { CardsResumoTma } from "./cards-resumo-tma";
import { EvolucaoTmaChart } from "./evolucao-tma-chart";
import { TmaPorTemaCard } from "./tma-por-tema-card";

interface AnaliticoTmaSectionProps {
  roster: string[];
  analitico: GestorTmaAnaliticoResult;
  /** Operadores já carregados por getGestorTma (d1_tma) — fonte do card Peso Desigual (qtd_* por bucket), sem query nova. */
  operadores: OperadorTma[];
  nomeFantasia: NomeFantasiaSerial;
}

/**
 * Seção "Analítico" da TMA (/reports/tma) — fundida na própria página, abaixo
 * de GestorTmaSection, MESMO padrão de Tempo-Indisp/Consolidado (não é rota
 * separada). Reaproveita RetencaoHorizontalScroll (compartilhado com
 * Consolidado e Tempo-Indisp) SEM editá-lo — só importado e usado com props,
 * já genérico o bastante (slides: ReactNode[]).
 *
 * GestorTmaSection (tabela principal, popover, polling de 30s) fica FORA
 * desta árvore inteira, acima do trilho na página — nada aqui dentro
 * compartilha estado com ela.
 *
 * 6 slides, ORDEM RENOMEADA/REORDENADA nesta rodada — ATENÇÃO aos dois
 * rótulos parecidos que trocaram de dono: "TMA por Tema" (sem sufixo) agora
 * é o título da TABELA Operador × Bucket (era "Tabela de TMA por
 * Categoria"); o card agregado por equipe (7 linhas, era só "TMA por Tema")
 * virou "TMA por Tema (Gestor)". tma-nav-sidebar.tsx precisa bater
 * exatamente com esta ordem/rótulos — índices recalculados lá, não
 * reaproveitados da rodada anterior.
 *   0. Visão Geral — cards grandes (TMA/Atendidos) + gráfico "Evolução do TMA".
 *   1. Tabela Operador × Bucket (AnaliticoTmaTabela) — título interno "Tabela
 *      de TMA por Tema", rótulo de sidebar "TMA por Tema". ERA o último slide.
 *   2. Card "TMA por Tema (Gestor)" (TmaPorTemaCard, 7 linhas agregadas da
 *      equipe). ERA o 2º slide (posição 1).
 *   3. CardRechamada — mesma posição relativa de antes.
 *   4. CardForaDaCurva — ERA depois de Peso Desigual, agora vem antes dele.
 *   5. CardPesoDesigual — ERA antes de Fora da Curva, agora por último.
 *
 * RetencaoHorizontalScroll recalcula distância/snap em tempo real a partir
 * dos filhos reais do DOM — reordenar o array não exige nenhuma mudança de
 * configuração nele.
 *
 * dynamicHeight={true} continua obrigatório (slides 1, 3 e 4 têm
 * listas/tabela sem limite que crescem conforme o volume do dia/roster).
 *
 * ESTADO VAZIO (hasNoData): réplica EXATA do escopo usado em
 * RetencaoDetalheSection (Consolidado, dashboard/retencao/retencao-detalhe-section.tsx)
 * — quando não há nenhum atendimento no dia (analitico.totalAtendidos === 0,
 * equivalente a "!data || data.visaoGeral.total === 0" de lá), o cabeçalho
 * "Analítico" continua sendo renderizado normalmente, mas o trilho inteiro
 * (RetencaoHorizontalScroll, os 6 slides) é SUBSTITUÍDO por um único card
 * (AguardandoDadosCard, componente já compartilhado — usado também por
 * Tempo-Indisp — importado sem tocar/editar nada do Consolidado). Texto
 * adaptado pro domínio da TMA. GestorTmaSection/TmaTable (fora desta árvore)
 * não são afetados — continuam mostrando "—" linha a linha via roster.
 */
export function AnaliticoTmaSection({
  roster,
  analitico,
  operadores,
  nomeFantasia,
}: AnaliticoTmaSectionProps) {
  const pesoDesigual = calcularPesoDesigual(operadores);
  const hasNoData = analitico.totalAtendidos === 0;

  const cabecalho = (
    <header className="border-border border-b border-dashed pt-2 pb-4 mb-6">
      <h2 className="ds-h2 font-bold">Analítico</h2>
    </header>
  );

  if (hasNoData) {
    return (
      <section>
        {cabecalho}
        <AguardandoDadosCard descricao="Ainda não há atendimentos de TMA reportados hoje pra sua equipe." />
      </section>
    );
  }

  const slides = [
    <div key="cards-e-evolucao" className="flex flex-col gap-6">
      <CardsResumoTma
        tmaMedioPonderado={analitico.tmaMedioPonderado}
        tmaStatus={analitico.tmaStatus}
        totalAtendidos={analitico.totalAtendidos}
      />
      <EvolucaoTmaChart dados={analitico.evolucaoPorHora} thresholdConfig={analitico.thresholdConfig} />
    </div>,
    <AnaliticoTmaTabela key="tabela-operador-bucket" roster={roster} porOperadorPorBucket={analitico.porOperadorPorBucket} />,
    <TmaPorTemaCard key="tma-por-tema-gestor" tmaPorBucketEquipe={analitico.tmaPorBucketEquipe} />,
    <CardRechamada
      key="rechamada"
      clientesDistintos={analitico.rechamada.clientesDistintos}
      clientesRecorrentes={analitico.rechamada.clientesRecorrentes}
      percentual={analitico.rechamada.percentual}
      lista={analitico.rechamada.lista}
    />,
    <CardForaDaCurva
      key="fora-da-curva"
      curtas={analitico.foraDaCurva.curtas}
      longas={analitico.foraDaCurva.longas}
      curtasLista={analitico.foraDaCurva.curtasLista}
      longasLista={analitico.foraDaCurva.longasLista}
    />,
    <CardPesoDesigual key="peso-desigual" operadores={pesoDesigual} nomeFantasia={nomeFantasia} />,
  ];

  return <RetencaoHorizontalScroll header={cabecalho} slides={slides} dynamicHeight />;
}
