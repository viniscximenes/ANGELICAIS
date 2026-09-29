import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";

export type IdentificacaoMeta = {
  operador: string;
  periodoLabel: string;
  intervalo: string;
  mesesCount: number;
  gestorNome: string;
  geradoEm: string;
};

/**
 * Cabeçalho de identificação do relatório — dados + metadados de geração
 * (para auditoria, já que pode embasar decisão de RH). Sem nenhum texto
 * avaliativo/opinativo, só fatos.
 *
 * O controle de troca de operador NÃO mora aqui (uma tentativa anterior
 * colocou um link "Trocar" nesta linha — revertido): ele volta a viver no
 * cabeçalho da página (analise-operadores-section.tsx), como um "chip" bem
 * posicionado ao lado do período, condicionado a existir operador
 * selecionado — nunca ao mesmo tempo que o botão "Selecionar operador" do
 * estado vazio, então nunca duplica.
 */
export function IdentificacaoBloco({ meta }: { meta: IdentificacaoMeta }) {
  const linhas: { label: string; valor: string }[] = [
    { label: "Operador", valor: meta.operador },
    { label: "Período", valor: `${meta.periodoLabel} · ${meta.intervalo}` },
    { label: "Meses com dados", valor: String(meta.mesesCount) },
    { label: "Gerado por", valor: meta.gestorNome },
    { label: "Gerado em", valor: meta.geradoEm },
  ];

  return (
    // Container = KpiFrame (mesmas cantoneiras da tabela de /kpi/operadores,
    // "fork local de StyledCard" — ver comentário no próprio arquivo, NÃO
    // editado). Só padding + cantoneiras: sem a borda/fundo/sombra extra que
    // StyledCard soma por baixo (o Card do shadcn com border+shadow+
    // gradiente), que a tabela de referência não tem.
    // p-3 (padrão do KpiFrame): faixa de título a 12px das cantoneiras, mesma
    // distância do cabeçalho da tabela de /kpi/operadores.
    <KpiFrame>
      {/* Faixa com o visual do cabeçalho da tabela de /kpi/operadores
          (.kpi-evolucao-titulo-head em kpi-evolucao.css). */}
      <p className="kpi-evolucao-titulo-head ds-body px-3 py-2.5 font-bold tracking-wide uppercase">
        Relatório de performance histórica
      </p>
      <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 px-3 pb-2 sm:grid-cols-2">
        {linhas.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/40 py-1.5"
          >
            <span className="font-sans text-muted-foreground text-[11px] tracking-wide uppercase">
              {l.label}
            </span>
            {/*
              Valor: fonte sans + tabular-nums, não mais .ds-mono-sm
              (var(--font-mono) global — nenhuma rota migrada usa mais fonte
              mono; /kpi/operadores também derrubou JetBrains Mono e usa só a
              --font-sans da rota, com tabular-nums pros números alinharem).
            */}
            <span className="font-sans text-foreground text-right text-sm font-medium tabular-nums">
              {l.valor}
            </span>
          </div>
        ))}
      </div>
    </KpiFrame>
  );
}
