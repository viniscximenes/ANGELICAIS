"use client";

import { useEffect, useRef } from "react";

import { useNotificacoesCanto } from "@/components/notificacoes-canto/notificacoes-canto-provider";

interface ComparativoPopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Convite pontual (1x por gestor por dia) para ver o comparativo entre
 * equipes, disparado no primeiro report do dia em /reports/consolidado.
 *
 * Toda a lógica de negócio (registro de exibição, 1x/dia, timezone) continua
 * no chamador (upload-dropzone.tsx). Aqui só mudou "como decidir se posso
 * aparecer agora": em vez de se renderizar sozinho no canto, este componente
 * delega ao NotificacoesCantoProvider, que garante um único aviso no canto
 * inferior esquerdo por vez e dá prioridade ao comparativo sobre o de KPI.
 *
 * Não renderiza nada — o card é desenhado pelo provider.
 */
export function ComparativoPopupDialog({
  open,
  onOpenChange,
}: ComparativoPopupDialogProps) {
  const { mostrarComparativo, esconderComparativo } = useNotificacoesCanto();

  // onOpenChange costuma ser uma arrow inline no chamador — guarda em ref pra
  // não reexecutar o efeito (e piscar o card) a cada render.
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;
    mostrarComparativo({ onFechar: () => onOpenChangeRef.current(false) });
    return () => esconderComparativo();
  }, [open, mostrarComparativo, esconderComparativo]);

  return null;
}
