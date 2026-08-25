import { unstable_isUnrecognizedActionError } from "next/navigation";
import { toast } from "sonner";

const RELOAD_DELAY_MS = 3000;

// Módulo compartilhado por todo client bundle: um só aviso mesmo que várias
// Server Actions da mesma página falhem juntas pelo mesmo motivo.
let jaAvisado = false;

/**
 * Trata o `UnrecognizedActionError` do Next.js: acontece quando o cliente
 * ainda referencia uma Server Action de um build anterior (hot reload em
 * dev, ou deploy novo em produção com a aba já aberta) — o servidor não
 * reconhece mais o hash da action e responde 404. Sem esse tratamento, a
 * chamada falha silenciosamente no console e, em pollings, repete a cada
 * ciclo sem nunca se recuperar sozinha.
 *
 * Uso: `catch (err) { if (handleStaleActionError(err)) return; ...tratamento normal... }`
 *
 * @returns true se o erro era esse caso (usuário avisado, reload agendado)
 * — o chamador deve desistir de qualquer retry próprio. false se é outro
 * erro, e o chamador segue com seu tratamento normal.
 */
export function handleStaleActionError(error: unknown): boolean {
  if (!unstable_isUnrecognizedActionError(error)) return false;

  if (!jaAvisado) {
    jaAvisado = true;
    toast.error("A aplicação foi atualizada", {
      description: "Recarregue a página para continuar.",
      duration: RELOAD_DELAY_MS,
      action: {
        label: "Recarregar",
        onClick: () => window.location.reload(),
      },
    });
    setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
  }

  return true;
}
