"use client";

import { useIdleRefresh } from "@/lib/hooks/use-idle-refresh";

/**
 * Componente invisível que apenas ativa o auto-refresh por inatividade.
 * Renderiza null.
 */
export function IdleRefreshWatcher() {
  useIdleRefresh();
  return null;
}
