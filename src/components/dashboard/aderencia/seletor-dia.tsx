"use client";

import { IconCalendar, IconLoader2 } from "@tabler/icons-react";

interface SeletorDiaProps {
  dias: string[];
  diaSelecionado: string;
  onChange: (dia: string) => void;
  carregando?: boolean;
}

/** "2026-07-31" -> "qui, 31/07/2026". Formata sem `new Date()` no fuso local. */
export function formatarDia(dataRef: string): string {
  const m = dataRef.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dataRef;

  const [, ano, mes, dia] = m;
  // Meio-dia UTC evita que o offset de Brasília jogue a data para o dia
  // anterior só para descobrir o dia da semana.
  const d = new Date(`${dataRef}T12:00:00Z`);
  const semana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  }).format(d);

  return `${semana.replace(".", "")}, ${dia}/${mes}/${ano}`;
}

export function SeletorDia({
  dias,
  diaSelecionado,
  onChange,
  carregando = false,
}: SeletorDiaProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="seletor-dia-aderencia"
        className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
      >
        <IconCalendar size={14} aria-hidden="true" />
        Dia
      </label>

      <div className="relative flex items-center">
        <select
          id="seletor-dia-aderencia"
          value={diaSelecionado}
          disabled={carregando || dias.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="border-border/80 bg-muted/30 text-foreground focus:bg-background focus:ring-primary/30 cursor-pointer rounded-xl border py-1.5 pr-8 pl-3 text-xs font-semibold transition-all focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {dias.length === 0 ? (
            <option value="">Sem dias disponíveis</option>
          ) : (
            dias.map((dia) => (
              <option key={dia} value={dia}>
                {formatarDia(dia)}
              </option>
            ))
          )}
        </select>

        {carregando && (
          <IconLoader2
            size={14}
            className="text-muted-foreground pointer-events-none absolute right-2.5 animate-spin"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
