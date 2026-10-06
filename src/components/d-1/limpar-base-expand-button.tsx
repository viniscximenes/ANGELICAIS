"use client";

import { IconLoader2, IconTrash } from "@tabler/icons-react";

/**
 * Botão "Limpar Base" com a animação do Uiverse.io (by vinodjangid07): no
 * hover ele alarga numa pílula, a lixeira cresce e desce pra fora de vista e
 * o texto "Limpar Base" cai de cima pro centro. Adaptado à altura e aos
 * cantos dos controles da página e às cores do tema. Estilos em
 * globals.css (.limpar-base-expand, seção "Padrão visual") — usado em
 * /s/reports/consolidado e /s/reports/tempo-indisponibilidade.
 *
 * Um clique limpa a base (a pressão contínua foi removida a pedido).
 */
export function LimparBaseExpandButton({
  onConfirm,
  pending,
}: {
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      className="limpar-base-expand"
      // Sem `title`: o tooltip nativo do navegador aparecia no hover, por
      // cima da animação (removido a pedido). aria-label mantém o nome pra
      // leitor de tela.
      aria-label="Limpar base"
      data-pending={pending || undefined}
      disabled={pending}
      onClick={onConfirm}
    >
      <span aria-hidden="true" className="limpar-base-expand__texto">
        {pending ? "Limpando..." : "Limpar Base"}
      </span>
      <span aria-hidden="true" className="limpar-base-expand__icone">
        {pending ? <IconLoader2 size={15} className="animate-spin" /> : <IconTrash size={15} />}
      </span>
    </button>
  );
}
