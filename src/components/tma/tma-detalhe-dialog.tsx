"use client";

import { useRef } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ExportPopupPngButton } from "@/components/dashboard/export-popup-png-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deriveNomeOperador } from "@/lib/gestor/derive-nome-operador";
import { formatKpiValue } from "@/lib/kpi/atual/format-kpi-value";
import {
  bucketDaSkill,
  SKILL_BUCKET_LABELS,
  SKILL_BUCKET_ORDER,
  type SkillBucket,
} from "@/lib/tma/skills-retencao";
import type { AtendimentoTma } from "@/lib/tma/get-gestor-tma-atendimentos";
import { useSkillColors } from "./use-skill-colors";
import type { TmaLinha } from "./tma-table";

interface TmaDetalheDialogProps {
  operador: TmaLinha | null;
  atendimentos: AtendimentoTma[];
  onOpenChange: (open: boolean) => void;
}

export function TmaDetalheDialog({ operador, atendimentos, onOpenChange }: TmaDetalheDialogProps) {
  const cores = useSkillColors();
  const pngRef = useRef<HTMLDivElement>(null);

  // 7 buckets (Hotline + Reversão Churn somadas), espelhando as colunas de
  // "queda por skill" da tabela principal — não as 8 skills cruas.
  const porBucket = new Map<SkillBucket, number>();
  for (const at of atendimentos) {
    const bucket = at.skill ? bucketDaSkill(at.skill) : null;
    if (!bucket) continue;
    porBucket.set(bucket, (porBucket.get(bucket) ?? 0) + 1);
  }
  const total = atendimentos.length;
  const donutData = SKILL_BUCKET_ORDER.filter((b) => (porBucket.get(b) ?? 0) > 0).map((bucket) => ({
    bucket,
    label: SKILL_BUCKET_LABELS[bucket],
    qtd: porBucket.get(bucket) ?? 0,
    pct: total > 0 ? ((porBucket.get(bucket) ?? 0) / total) * 100 : 0,
  }));

  // Exceção documentada à convenção geral do site (nome fantasia sempre):
  // este modal de detalhamento por operador mostra o nome REAL (derivado do
  // email, mesma lógica de "revelar nome real" usada no olho das outras
  // tabelas) — inclusive no PNG exportado. Não trocar de volta pra
  // nomeExibicao (fantasia) numa manutenção futura.
  const nomeReal = operador ? deriveNomeOperador(operador.operatorEmail) : "";

  return (
    <Dialog open={operador !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-[960px] bg-background border-border/80 p-6 shadow-2xl">
        {operador && (
          <>
            <ExportPopupPngButton
              contentRef={pngRef}
              filename={`tma_${nomeReal}.png`}
              className="absolute top-2 right-10"
            />

            {/*
              Sem template separado: o PNG captura este mesmo wrapper (via
              pngRef), com background explícito porque o fundo do
              DialogContent fica no ancestral, fora do que é capturado —
              assim a imagem sempre reflete o tema atual (claro/escuro), não
              um tema fixo.
            */}
            <div ref={pngRef} style={{ backgroundColor: "var(--background)" }}>
              <DialogHeader className="border-b border-dashed border-border/60 pb-3">
                <DialogTitle>{nomeReal}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="cursor-default rounded-lg border border-border/80 p-3">
                  <p className="ds-mono-sm text-muted-foreground text-[11px]">TMA</p>
                  <p className="ds-h3 font-semibold">{formatKpiValue(operador.tmaSegundos, "time")}</p>
                </div>
                <div className="cursor-default rounded-lg border border-border/80 p-3">
                  <p className="ds-mono-sm text-muted-foreground text-[11px]">Atendimentos</p>
                  <p className="ds-h3 font-semibold">{operador.qtdAtendimentos}</p>
                </div>
              </div>

              {donutData.length > 0 && (
                <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="qtd"
                          nameKey="label"
                          innerRadius="55%"
                          outerRadius="80%"
                          paddingAngle={2}
                          isAnimationActive
                        >
                          {donutData.map((entry) => (
                            <Cell
                              key={entry.bucket}
                              fill={cores[entry.bucket]}
                              stroke={cores.surface}
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-col justify-center gap-2">
                    {donutData.map((entry) => (
                      <div key={entry.bucket} className="flex items-center gap-2 text-sm">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: cores[entry.bucket] }}
                        />
                        <span className="truncate">{entry.label}</span>
                        <span className="ds-mono-sm font-semibold">{entry.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto pt-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-dashed border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-normal">TMA</th>
                      <th className="py-2 pr-4 font-normal">Skill</th>
                      <th className="py-2 pr-4 font-normal">Telefone do cliente</th>
                      <th className="py-2 pr-4 font-normal">Hora do atendimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atendimentos.map((at, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-2 pr-4 ds-mono-sm">
                          {formatKpiValue(at.duracaoSegundos, "time")}
                        </td>
                        <td className="py-2 pr-4">{at.skill ?? "—"}</td>
                        <td className="py-2 pr-4 ds-mono-sm">{at.telefoneCliente ?? "—"}</td>
                        <td className="py-2 pr-4 ds-mono-sm">{at.hora ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
