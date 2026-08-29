import { StyledCard } from "@/components/gestor/styled-card";

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
 */
export function IdentificacaoBloco({ meta }: { meta: IdentificacaoMeta }) {
  const linhas: { label: string; valor: string }[] = [
    { label: "Operador", valor: meta.operador },
    { label: "Período", valor: `${meta.periodoLabel} · ${meta.intervalo}` },
    { label: "Meses com dado", valor: String(meta.mesesCount) },
    { label: "Gerado por", valor: meta.gestorNome },
    { label: "Gerado em", valor: meta.geradoEm },
  ];

  return (
    <StyledCard className="p-5" withGradient corners="all">
      <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        Relatório de performance histórica
      </p>
      <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {linhas.map((l) => (
          <div
            key={l.label}
            className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/40 py-1.5"
          >
            <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
              {l.label}
            </span>
            <span className="ds-mono-sm text-foreground text-right text-xs font-medium">
              {l.valor}
            </span>
          </div>
        ))}
      </div>
    </StyledCard>
  );
}
