import type { KbAnexoTipo } from "./types";

// Sem imports de servidor aqui de propósito — este módulo é usado tanto no
// cliente (validação antes de enviar) quanto no servidor (uploadAnexo).

export const KB_ANEXO_TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB
export const KB_ANEXO_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

const EXTENSAO_PARA_TIPO: Record<string, KbAnexoTipo> = {
  pdf: "pdf",
  png: "imagem",
  jpg: "imagem",
  jpeg: "imagem",
  webp: "imagem",
};

export function detectarAnexoTipo(nomeArquivo: string): KbAnexoTipo | null {
  const ext = nomeArquivo.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSAO_PARA_TIPO[ext] ?? null;
}

export function validarAnexo(
  file: File,
): { valido: true } | { valido: false; erro: string } {
  const tipo = detectarAnexoTipo(file.name);
  if (!tipo) {
    return {
      valido: false,
      erro: "Formato não suportado. Use PDF, PNG, JPG, JPEG ou WEBP.",
    };
  }
  if (file.size > KB_ANEXO_TAMANHO_MAXIMO_BYTES) {
    return { valido: false, erro: "Arquivo maior que 10MB." };
  }
  return { valido: true };
}
