import { StyledCard } from "@/components/gestor/styled-card";

interface Props {
  /** Default "Aguardando dados do dia" — MESMO texto do estado vazio do consolidado (retencao-detalhe-section.tsx). */
  titulo?: string;
  descricao: string;
}

/**
 * Estado "sem dados do dia" — MESMA apresentação visual do placeholder
 * "Aguardando dados do dia" de /reports/consolidado
 * (retencao-detalhe-section.tsx): StyledCard com gradiente, mini "gráfico
 * de barras" decorativo em CSS puro (6 divs com alturas fixas,
 * aria-hidden) com um "?" sobreposto, título + descrição.
 *
 * Extraído aqui como componente PRÓPRIO (não movido/importado de dentro de
 * retencao-detalhe-section.tsx) porque lá o JSX vive inline, não exportado
 * — extrair DE LÁ exigiria editar um arquivo do consolidado, proibido
 * nesta tarefa. O JSX/classes/tokens abaixo são uma cópia literal do
 * original (mesmo texto de título por padrão, mesmas classes, mesmas
 * alturas de barra), então visualmente idêntico; só a descrição é
 * parametrizada (o texto do consolidado é específico de "atendimentos de
 * retenção", não faz sentido pra tempo logado/indisponibilidade).
 */
export function AguardandoDadosCard({ titulo = "Aguardando dados do dia", descricao }: Props) {
  return (
    <StyledCard
      withGradient
      className="flex min-h-[350px] flex-col items-center justify-center gap-5 p-10 text-center"
    >
      <div className="relative flex h-16 items-end gap-2" aria-hidden="true">
        {[35, 60, 25, 75, 45, 55].map((altura, idx) => (
          <div
            key={idx}
            className="bg-muted-foreground/15 w-3 rounded-t-sm"
            style={{ height: `${altura}%` }}
          />
        ))}
        <span className="ds-display text-muted-foreground/40 absolute inset-0 flex items-center justify-center text-3xl font-bold">
          ?
        </span>
      </div>

      <div className="max-w-sm space-y-1.5">
        <h3 className="ds-h3 text-foreground font-semibold">{titulo}</h3>
        <p className="ds-body text-muted-foreground text-sm">{descricao}</p>
      </div>
    </StyledCard>
  );
}
