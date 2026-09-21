"use client";

import { IconEye, IconEyeOff } from "@tabler/icons-react";

interface OlhoToggleButtonProps {
  olhoAberto: boolean;
  onToggle: () => void;
}

/**
 * Botão de alternar nome fantasia/real no cabeçalho de tabela — extraído do
 * markup inline usado em GestorEquipeSection (consolidado) pra reaproveitar
 * em outras tabelas do mesmo padrão, sem duplicar valores.
 *
 * inline-block (NÃO flex) de propósito: participa do fluxo de texto normal
 * da célula (logo depois do label), pra ser centralizado JUNTO com o texto
 * pelo text-align:center herdado da célula — um wrapper flex ao redor do
 * label+botão desloca o CONJUNTO do centro real usado pelas células de
 * dado abaixo (só texto, sem flex). Ver comentário original em
 * equipe-table.tsx (causa raiz do desalinhamento do header "Operador").
 */
export function OlhoToggleButton({ olhoAberto, onToggle }: OlhoToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
      className="text-foreground/80 hover:text-foreground transition-colors inline-block align-middle ml-1.5"
    >
      {olhoAberto ? <IconEye size={14} /> : <IconEyeOff size={14} />}
    </button>
  );
}
