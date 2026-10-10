import { dataRefHojeBR } from "@/lib/d1-db/parse";
import { getRosterOperadoresGestorOuErro } from "@/lib/d1-db/get-roster-gestor";
import { bucketDaSkill, zeroSkillBuckets, type SkillBucket } from "@/lib/tma/skills-retencao";
import { calcularEvolucaoTmaPorHora, type TmaHoraData } from "./get-gestor-tma-evolucao-hora";
import { horaCurta } from "./format-tma";
import { getRechamadaPoloTma } from "./get-rechamada-polo-tma";
import { lerAtendimentosTma } from "./ler-atendimentos-tma";
import { getTmaThresholdConfig, statusTmaDe, type TmaStatus, type TmaThresholdConfig } from "./tma-status";

const LIMIAR_CURTA_SEGUNDOS = 30;
const LIMIAR_LONGA_SEGUNDOS = 1800;

export type RechamadaItem = {
  telefoneCliente: string;
  emailLocalPrimeiro: string;
  /** "HH:MM" do 1º atendimento daquele telefone no dia. */
  horaPrimeiro: string;
  emailLocalSegundo: string;
  /** "HH:MM" do 2º atendimento daquele telefone no dia (a primeira vez que o cliente voltou a ligar). */
  horaSegundo: string;
};

export type ForaDaCurvaItem = {
  emailLocal: string;
  telefoneCliente: string;
  /** "HH:MM" real do atendimento (não um bucket). */
  hora: string;
  duracaoSegundos: number;
};

export type GestorTmaAnaliticoResult = {
  /** Média PONDERADA pelo volume: soma de duracao_segundos ÷ contagem total de atendimentos (não é a média das médias por operador). null se não houver nenhum atendimento na base atual. */
  tmaMedioPonderado: number | null;
  /** Status do card TMA (success/danger/neutral) — MESMO threshold/direção que colore a tabela principal (getTmaThresholdConfig/statusTmaDe, tma-status.ts), aplicado sobre tmaMedioPonderado. */
  tmaStatus: TmaStatus;
  /** Contagem total de atendimentos do gestor na base atual — MESMA fonte (d1_tma_atendimentos) do card TMA, pra nunca divergir entre si. */
  totalAtendidos: number;
  /** Roster completo do gestor → TMA médio (segundos) por skill bucket. Operador ou bucket sem nenhum atendimento: null (célula "—" na tabela). */
  porOperadorPorBucket: Map<string, Record<SkillBucket, number | null>>;
  /** TMA médio de EQUIPE por bucket (agregado entre TODOS os operadores, não por operador) — usado pelo card "TMA por Tema". Bucket sem nenhum atendimento na equipe inteira: null. */
  tmaPorBucketEquipe: Record<SkillBucket, number | null>;
  /** Evolução do TMA por bucket de hora (14 buckets, mesma régua do Consolidado) — usado pelo gráfico "Evolução do TMA". */
  evolucaoPorHora: TmaHoraData[];
  /**
   * Rechamada: clientes (telefone) que ligaram mais de uma vez no dia.
   *
   * Decisão do usuário: `lista` mostra telefone e horário de cada cliente
   * (antes só havia a contagem, para não expor dado individual). O nome em
   * `emailLocal*` é o e-mail LITERAL (parte local, minúsculo), não o nome
   * fantasia — mesma exceção do tooltip de EvolucaoTmaChart.
   *
   * Escopo (getRechamadaPoloTma): `lista` cruza o POLO inteiro — conta quando
   * a 1ª ligação do telefone foi atendida por esta equipe, mesmo que a
   * seguinte tenha caído em outra (a fila/skill roteia entre equipes).
   * `clientesDistintos` é só da própria equipe (denominador: "quantos
   * clientes minha equipe atendeu hoje"); `clientesRecorrentes` é
   * `lista.length` (numerador, cruzando equipes).
   */
  rechamada: {
    clientesDistintos: number;
    clientesRecorrentes: number;
    /** 0-100. null se não houver nenhum cliente na base atual. */
    percentual: number | null;
    /** Lista COMPLETA (sem limite/truncamento) — 1º atendimento → 2º atendimento daquele telefone no dia, ordenada pelo horário do 1º. */
    lista: RechamadaItem[];
  };
  /**
   * "Fora da curva" — limiar fixo (<30s curta, >1800s longa).
   *
   * Decisão do usuário: `curtasLista`/`longasLista` mostram telefone e
   * horário de cada chamada (antes só havia a contagem). Mesma exceção de
   * nome literal (e-mail) da Rechamada, acima.
   */
  foraDaCurva: {
    curtas: number;
    longas: number;
    /** Lista COMPLETA das curtas, da mais extrema (menor duração) pra menos. */
    curtasLista: ForaDaCurvaItem[];
    /** Lista COMPLETA das longas, da mais extrema (maior duração) pra menos. */
    longasLista: ForaDaCurvaItem[];
  };
  /** Threshold/direção efetivos do TMA (getTmaThresholdConfig) — exposto pra EvolucaoTmaChart não precisar buscar de novo. */
  thresholdConfig: TmaThresholdConfig;
  /**
   * true quando alguma leitura falhou (atendimentos, rechamada do polo,
   * roster ou meta). Os demais campos vêm vazios e a seção mostra o estado
   * de erro, não "Aguardando dados do dia".
   */
  erro: boolean;
};

/**
 * Dados do Analítico da TMA (/s/reports/tma-peso): 2 cards grandes (TMA/Atendidos) +
 * card "TMA por Tema" + gráfico "Evolução do TMA" + cards de Rechamada, Peso
 * Desigual (calculado à parte, ver calcular-peso-desigual.ts, a partir de
 * d1_tma via getGestorTma — não deste arquivo) e Fora da Curva + tabela
 * Operador × skill bucket. A maior parte vem de UMA query em
 * d1_tma_atendimentos filtrada por gestor_id (não usa d1_tma, a tabela
 * principal da TMA, justamente pra os cards nunca poderem divergir por
 * fonte diferente) — EXCETO a lista de Rechamada (rechamada.lista), que
 * precisa de uma SEGUNDA query sem filtro de gestor_id (getRechamadaPoloTma,
 * polo inteiro) pra cruzar equipes; ver comentário no campo `rechamada`
 * abaixo e em get-rechamada-polo-tma.ts. Roster completo (mesma fonte de
 * getGestorTma), não só quem tem atendimento — operador sem nenhum
 * atendimento aparece com tudo null/"—". Sem polling próprio: chamada na
 * carga da página (page.tsx) e de novo por refreshAnaliticoTmaAction quando
 * a tabela avisa que a versão da base mudou.
 */
export async function getGestorTmaAnalitico(gestorId: string): Promise<GestorTmaAnaliticoResult> {
  const dataRef = dataRefHojeBR();

  type Linha = {
    operator_email: string;
    skill: string | null;
    duracao_segundos: number;
    hora: string | null;
    telefone_cliente: string | null;
  };

  const [rows, roster, thresholdConfigLido, rechamadaPolo] = await Promise.all([
    // Paginado (lerAtendimentosTma): sem isso o PostgREST cortaria em 1000
    // linhas em silêncio. Erro: null → estado de erro (abaixo).
    lerAtendimentosTma<Linha>(
      (supabase) =>
        supabase
          .from("d1_tma_atendimentos")
          .select("operator_email, skill, duracao_segundos, hora, telefone_cliente")
          .eq("gestor_id", gestorId),
      dataRef,
      "get-gestor-tma-analitico",
    ).catch((err: unknown) => {
      console.error("[get-gestor-tma-analitico] erro:", err instanceof Error ? err.message : err);
      return null;
    }),
    getRosterOperadoresGestorOuErro(gestorId).catch(() => null),
    getTmaThresholdConfig(gestorId),
    // SEM filtro de gestor_id — precisa do polo inteiro pra cruzar equipes. Ver comentário em get-rechamada-polo-tma.ts.
    getRechamadaPoloTma(gestorId, dataRef),
  ]);

  const { erro: erroThreshold, ...thresholdConfig } = thresholdConfigLido;

  // Erro de banco: estado de erro na seção, e não "Aguardando dados do dia"
  // (antes qualquer falha virava zero atendimentos).
  if (rows === null || roster === null || rechamadaPolo === null || erroThreshold) {
    return {
      tmaMedioPonderado: null,
      tmaStatus: "neutral",
      totalAtendidos: 0,
      porOperadorPorBucket: new Map(),
      tmaPorBucketEquipe: {} as Record<SkillBucket, number | null>,
      evolucaoPorHora: [],
      rechamada: { clientesDistintos: 0, clientesRecorrentes: 0, percentual: null, lista: [] },
      foraDaCurva: { curtas: 0, longas: 0, curtasLista: [], longasLista: [] },
      thresholdConfig,
      erro: true,
    };
  }

  const atendimentos = rows;

  const totalAtendidos = atendimentos.length;
  const somaDuracao = atendimentos.reduce((soma, at) => soma + at.duracao_segundos, 0);
  const tmaMedioPonderado = totalAtendidos > 0 ? somaDuracao / totalAtendidos : null;
  const tmaStatus = statusTmaDe(tmaMedioPonderado, thresholdConfig);

  // Acumuladores por operador+bucket (soma/contagem de duracao_segundos) —
  // usados tanto pra tabela (por operador) quanto, somados entre operadores,
  // pro card "TMA por Tema" (equipe) — sem query nova, é o mesmo dado já
  // carregado acima, só agregado numa dimensão a mais.
  const somaPorOperadorBucket = new Map<string, Record<SkillBucket, number>>();
  const qtdPorOperadorBucket = new Map<string, Record<SkillBucket, number>>();
  const somaEquipePorBucket = zeroSkillBuckets();
  const qtdEquipePorBucket = zeroSkillBuckets();

  function acumuladorDe(mapa: Map<string, Record<SkillBucket, number>>, email: string): Record<SkillBucket, number> {
    const existente = mapa.get(email);
    if (existente) return existente;
    const novo = zeroSkillBuckets();
    mapa.set(email, novo);
    return novo;
  }

  for (const at of atendimentos) {
    const bucket = at.skill ? bucketDaSkill(at.skill) : null;
    if (!bucket) continue; // skill fora das 7 de retenção (ou nula) — não entra na tabela por bucket.

    const email = at.operator_email.trim().toLowerCase();
    const soma = acumuladorDe(somaPorOperadorBucket, email);
    const qtd = acumuladorDe(qtdPorOperadorBucket, email);
    soma[bucket] += at.duracao_segundos;
    qtd[bucket] += 1;

    somaEquipePorBucket[bucket] += at.duracao_segundos;
    qtdEquipePorBucket[bucket] += 1;
  }

  // Roster completo (não só quem tem atendimento) — operador sem nenhuma
  // linha em d1_tma_atendimentos hoje entra com todos os buckets null.
  const porOperadorPorBucket = new Map<string, Record<SkillBucket, number | null>>();
  for (const email of roster) {
    const soma = somaPorOperadorBucket.get(email);
    const qtd = qtdPorOperadorBucket.get(email);

    const linha = {} as Record<SkillBucket, number | null>;
    for (const bucket of Object.keys(zeroSkillBuckets()) as SkillBucket[]) {
      const q = qtd?.[bucket] ?? 0;
      linha[bucket] = q > 0 ? (soma?.[bucket] ?? 0) / q : null;
    }
    porOperadorPorBucket.set(email, linha);
  }

  const tmaPorBucketEquipe = {} as Record<SkillBucket, number | null>;
  for (const bucket of Object.keys(zeroSkillBuckets()) as SkillBucket[]) {
    const q = qtdEquipePorBucket[bucket];
    tmaPorBucketEquipe[bucket] = q > 0 ? somaEquipePorBucket[bucket] / q : null;
  }

  const evolucaoPorHora = calcularEvolucaoTmaPorHora(atendimentos, thresholdConfig);

  // clientesDistintos continua no escopo de sempre (só telefones que
  // passaram pela própria equipe) — em memória, dos MESMOS rows já
  // buscados acima, sem query nova. clientesRecorrentes/lista agora vêm de
  // rechamadaPolo (buscado em paralelo no Promise.all acima, polo inteiro).
  const telefonesDaEquipe = new Set<string>();
  for (const at of atendimentos) {
    if (at.telefone_cliente) telefonesDaEquipe.add(at.telefone_cliente);
  }
  const clientesDistintos = telefonesDaEquipe.size;
  const clientesRecorrentes = rechamadaPolo.length;

  const rechamada = {
    clientesDistintos,
    clientesRecorrentes,
    percentual: clientesDistintos > 0 ? (clientesRecorrentes / clientesDistintos) * 100 : null,
    lista: rechamadaPolo,
  };

  // Fora da curva: limiar fixo (<30s curta, >1800s longa) — mesmos rows, sem query nova.
  // Listas COMPLETAS (sem limite), mais extrema primeiro.
  function paraItem(at: (typeof atendimentos)[number]): ForaDaCurvaItem {
    return {
      emailLocal: at.operator_email.split("@")[0] ?? at.operator_email,
      telefoneCliente: at.telefone_cliente ?? "—",
      hora: horaCurta(at.hora),
      duracaoSegundos: at.duracao_segundos,
    };
  }
  const curtasLista = atendimentos
    .filter((at) => at.duracao_segundos < LIMIAR_CURTA_SEGUNDOS)
    .sort((a, b) => a.duracao_segundos - b.duracao_segundos)
    .map(paraItem);
  const longasLista = atendimentos
    .filter((at) => at.duracao_segundos > LIMIAR_LONGA_SEGUNDOS)
    .sort((a, b) => b.duracao_segundos - a.duracao_segundos)
    .map(paraItem);

  const foraDaCurva = {
    curtas: curtasLista.length,
    longas: longasLista.length,
    curtasLista,
    longasLista,
  };

  return {
    tmaMedioPonderado,
    tmaStatus,
    totalAtendidos,
    porOperadorPorBucket,
    tmaPorBucketEquipe,
    evolucaoPorHora,
    rechamada,
    foraDaCurva,
    thresholdConfig,
    erro: false,
  };
}
