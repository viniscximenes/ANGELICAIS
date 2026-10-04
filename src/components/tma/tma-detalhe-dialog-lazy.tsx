"use client";

import dynamic from "next/dynamic";

/**
 * TmaDetalheDialog carregado sob demanda. O dialog (e o recharts que ele usa)
 * fica fechado no carregamento da página, então sai do bundle inicial e é
 * baixado logo depois da hidratação, em paralelo — sem mudar nada no uso.
 */
export const TmaDetalheDialog = dynamic(
  () => import("./tma-detalhe-dialog").then((m) => m.TmaDetalheDialog),
  { ssr: false },
);
