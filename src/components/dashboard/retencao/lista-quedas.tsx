"use client";

import { useState } from "react";
import { IconAlertTriangle, IconTrendingDown, IconCircleCheck, IconX } from "@tabler/icons-react";
import type { QuedaComContribuicao } from "@/lib/retencao/actions";

interface ListaQuedasProps {
  quedas: QuedaComContribuicao[];
}

export function ListaQuedas({ quedas }: ListaQuedasProps) {
  const [selectedQueda, setSelectedQueda] = useState<QuedaComContribuicao | null>(null);

  return (
    <div className="elevation-1 border border-border/60 bg-card rounded-xl p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconTrendingDown size={22} className="text-danger" />
          Historico De Quedas
        </h3>
        {quedas.length > 0 && (
          <p className="ds-small text-muted-foreground text-xs">
            Clique para ver os detalhes e motivos da queda de taxa nesses horarios.
          </p>
        )}
      </div>

      {quedas.length === 0 ? (
        <div className="flex items-center gap-3 border border-success/30 bg-success/5 rounded-lg p-4">
          <IconCircleCheck size={20} className="text-success shrink-0" />
          <p className="ds-small text-muted-foreground text-xs">
            Nenhuma queda de taxa de retenção superior a <strong>2%</strong> foi identificada de uma hora para a outra neste turno.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            {quedas.map((q) => (
              <div 
                key={q.hora}
                onClick={() => setSelectedQueda(q)}
                className="border border-border/40 bg-muted/10 rounded-lg overflow-hidden transition-all duration-200 p-4 cursor-pointer hover:bg-muted/20 select-none hover:border-danger/30 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <IconAlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
                  <div>
                    <p className="ds-small font-semibold text-foreground text-xs">
                      Das {q.labelAnterior} para as {q.label}
                    </p>
                    <p className="ds-small text-muted-foreground text-[11px] leading-relaxed mt-0.5">
                      Queda de <span className="text-danger font-semibold">-{q.quedaPontos}%</span> (de {(q.txAnterior * 100).toFixed(0)}% para {(q.txAtual * 100).toFixed(0)}% de retenção).
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono font-medium px-2 py-0.5 bg-muted/40 rounded border border-border/10 shrink-0">
                  Ver detalhes
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Pop-up / Modal Detalhado da Queda */}
      {selectedQueda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-xl max-w-2xl w-full p-7 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 relative">
            {/* Botão de Fechar */}
            <button
              onClick={() => setSelectedQueda(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-10"
              title="Fechar"
            >
              <IconX size={18} />
            </button>

            {/* Cabeçalho */}
            <div className="space-y-2 pb-4 shrink-0">
              <h3 className="ds-h2 font-bold text-foreground flex items-center gap-2">
                <IconAlertTriangle size={22} className="text-foreground" />
                Detalhamento da Queda
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed pr-6">
                Transição de {selectedQueda.labelAnterior} para {selectedQueda.label}. A taxa consolidada despencou em <strong className="text-danger font-bold">-{selectedQueda.quedaPontos}%</strong>, fixando-se em {(selectedQueda.txAtual * 100).toFixed(0)}%.
              </p>
            </div>

            {/* Divisor */}
            <div className="h-px bg-white/10 shrink-0 mb-4" />

            {/* Corpo com Grid (com scroll interno e estilo bonito de scrollbar) */}
            <div className="grid gap-6 sm:grid-cols-2 text-xs overflow-y-auto pr-2 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
              {/* Queda por Motivo */}
              <div className="space-y-3">
                <h4 className="ds-mono-sm font-semibold uppercase tracking-wider text-[10px] text-muted-foreground border-b border-border/20 pb-1.5">
                  Queda por motivo
                </h4>
                {selectedQueda.porMotivo.length === 0 ? (
                  <p className="text-muted-foreground text-[11px] italic py-2">Sem motivos específicos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedQueda.porMotivo.map((item) => (
                      <div 
                        key={item.nome} 
                        className="bg-zinc-950/40 border border-white/5 rounded-lg p-3 flex justify-between items-center transition-all hover:bg-zinc-950/60"
                      >
                        <span className="text-foreground font-semibold truncate max-w-[50%]">{item.nome}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-muted-foreground font-mono text-[10px]">
                            taxa: <span className={item.tx !== null && item.tx < 0.6 ? "text-danger font-bold" : "text-success font-bold"}>{item.tx !== null ? `${Math.round(item.tx * 100)}%` : "—"}</span>
                          </span>
                          <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 bg-white/5 rounded border border-white/5 font-mono shrink-0">
                            {item.cancelados} cancelados
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Operadores Envolvidos */}
              <div className="space-y-3">
                <h4 className="ds-mono-sm font-semibold uppercase tracking-wider text-[10px] text-muted-foreground border-b border-border/20 pb-1.5">
                  Operadores Envolvidos
                </h4>
                {selectedQueda.porOperador.length === 0 ? (
                  <p className="text-muted-foreground text-[11px] italic py-2">Sem operadores específicos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedQueda.porOperador.map((item) => (
                      <div 
                        key={item.nome} 
                        className="bg-zinc-950/40 border border-white/5 rounded-lg p-3 flex justify-between items-center transition-all hover:bg-zinc-950/60"
                      >
                        <span className="text-foreground font-semibold truncate max-w-[50%]">{item.nome}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-muted-foreground font-mono text-[10px]">
                            taxa: <span className={item.tx !== null && item.tx < 0.6 ? "text-danger font-bold" : "text-success font-bold"}>{item.tx !== null ? `${Math.round(item.tx * 100)}%` : "—"}</span>
                          </span>
                          <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 bg-white/5 rounded border border-white/5 font-mono shrink-0">
                            {item.cancelados} cancelados
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
