"use client";

import { useEffect } from "react";

import { startFaviconLoading, stopFaviconLoading } from "./favicon-loading";

/**
 * Liga o favicon animado ("carregando") enquanto `active` for true — pra
 * qualquer fluxo do site (upload/importação de base, etc.). Um `useEffect`
 * simples: entra em `active`, chama start; sai (inclusive troca pra
 * false, desmontagem do componente ou ERRO — o cleanup roda sempre,
 * mesmo se o estado virou false por causa de um catch) chama stop. O
 * controlador é global e conta referências, então usar este hook em vários
 * componentes ao mesmo tempo (ex. navegação de página + upload de base) é
 * seguro — o favicon só volta ao normal quando todo mundo tiver soltado.
 */
export function useFaviconLoading(active: boolean) {
  useEffect(() => {
    if (!active) return;
    startFaviconLoading();
    return () => stopFaviconLoading();
  }, [active]);
}
