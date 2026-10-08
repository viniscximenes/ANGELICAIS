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
      // aria-pressed: estado pro leitor de tela e gancho do anel de foco
      // (.pagina-padrao button[aria-pressed], globals.css) — igual ao
      // botão do olho do Consolidado.
      aria-pressed={olhoAberto}
      // Nome FIXO pro leitor de tela: o estado já vem do aria-pressed
      // ("Revelar nomes reais, pressionado/não pressionado"). O title segue
      // descrevendo a próxima ação pra quem usa mouse.
      aria-label="Revelar nomes reais"
      title={olhoAberto ? "Mostrar nomes fantasia" : "Revelar nomes reais"}
      // before:-inset-[5px]: área de clique de 24×24px em volta do ícone de
      // 14px, sem mudar o tamanho/posição visual nem o layout do cabeçalho
      // (o pseudo-elemento é absoluto; cabe no py-2.5 da célula).
      className="text-foreground/80 hover:text-foreground transition-colors relative inline-block align-middle ml-1.5 before:absolute before:-inset-[5px] before:content-['']"
    >
      {olhoAberto ? <IconEye size={14} aria-hidden="true" /> : <IconEyeOff size={14} aria-hidden="true" />}
    </button>
  );
}
