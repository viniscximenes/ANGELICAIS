"use client";

import type { ArgumentoItem } from "@/lib/retencao/get-efetividade-argumento";

interface EfetividadeArgumentoCardProps {
  argumentos: ArgumentoItem[];
  /** Ver comentário equivalente em tabela-temas.tsx — mesmo padrão de dimensionamento no trilho. */
  scrollInterno?: boolean;
}

/**
 * `primeiro_nivel` no banco vem como "FaceID" (sem espaço). Aqui só ajustamos
 * a EXIBIÇÃO para "Face ID", igual ao texto usado no card "Impacto do Face ID
 * no Resultado" — o dado (`item.categoria`) continua intacto, usado como key.
 */
function formatCategoria(categoria: string): string {
  return categoria === "FaceID" ? "Face ID" : categoria;
}

/**
 * Volume de contratos retidos por técnica de negociação (`primeiro_nivel`).
 * Layout espelha tabela-temas.tsx (StyledCard + tabela, mesmo padrão de
 * scroll interno no trilho horizontal).
 *
 * Mostra só VOLUME, não "Tx de Retenção por técnica" — `primeiro_nivel`
 * nunca aparece preenchido em cancelamentos (100% null nos dados reais), sem
 * denominador consistente pra uma taxa (ver get-efetividade-argumento.ts).
 */
export function EfetividadeArgumentoCard({
  argumentos,
  scrollInterno = false,
}: EfetividadeArgumentoCardProps) {
  return (
    <div className={scrollInterno ? "flex h-full flex-col space-y-3" : "space-y-3"}>
      <div className={scrollInterno ? "shrink-0" : undefined}>
        <h3 className="ds-h3 font-semibold text-foreground">
          Taxa por cada perfilação
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Contratos retidos em cada perfilação usada na negociação e quanto cada uma representa
          do total de retidos.
        </p>
      </div>

      <div
        className={scrollInterno ? "max-h-full overflow-y-auto scrollbar-tema" : "overflow-hidden"}
      >
        {/* scrollInterno: sem o overflow-x-auto interno — senão o cabeçalho
            fixo (sticky) prende nele e não acompanha a rolagem do card. */}
        <div className={scrollInterno ? undefined : "overflow-x-auto"}>
          {/* data-tabela-perfilacao: cabeçalho no visual da tabela principal
              (reports-consolidado.css, junto com as demais tabelas).
              data-cabecalho-fixo: cabeçalho sticky ao rolar. */}
          <table data-tabela-perfilacao data-cabecalho-fixo className="w-full text-left border-collapse">
            <thead>
              <tr className="ds-body text-muted-foreground uppercase tracking-wide font-bold select-none border-b border-border/40 bg-muted/40">
                <th className="py-2.5 px-4 whitespace-nowrap">Técnica</th>
                <th className="py-2.5 px-4 text-center w-[110px] whitespace-nowrap">
                  Retidos
                </th>
                <th className="py-2.5 px-4 text-center w-[130px] whitespace-nowrap">
                  % do Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {argumentos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 px-4 text-center text-muted-foreground text-xs">
                    Nenhum contrato retido hoje.
                  </td>
                </tr>
              ) : (
                argumentos.map((item) => (
                  // Sem hover: a linha não é clicável.
                  <tr key={item.categoria}>
                    {/* Mesma hierarquia das demais tabelas do Analítico:
                        nome text-sm medium, números em peso normal. */}
                    <td className="py-3 px-4 align-middle ds-body text-sm font-medium text-foreground whitespace-nowrap">
                      {formatCategoria(item.categoria)}
                    </td>
                    <td className="py-3 px-4 text-center align-middle ds-mono-sm text-sm !font-normal text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {item.quantidade.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-center align-middle ds-mono-sm text-sm !font-normal text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {(item.percentualDoTotal * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
