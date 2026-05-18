"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function getCurrentMesRef(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}`;
}

function getPreviousMesRef(): string {
  const current = getCurrentMesRef();
  const [y, m] = current.split("-").map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  return `${prevY}-${String(prevM).padStart(2, "0")}`;
}

function formatMonthLabel(mesRef: string): string {
  const [year, month] = mesRef.split("-");
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[parseInt(month) - 1]} ${year}`;
}

interface Props {
  currentMonth: string;
}

export function DiarioMonthTabs({ currentMonth }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentRef = getCurrentMesRef();
  const previousRef = getPreviousMesRef();

  function buildHref(month: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="space-y-2">
      <div
        role="tablist"
        className="elevation-1 inline-flex gap-1 rounded-md p-1"
      >
        <Link
          href={buildHref(currentRef)}
          role="tab"
          aria-selected={currentMonth === currentRef}
          className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
            currentMonth === currentRef
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mês Atual
        </Link>
        <Link
          href={buildHref(previousRef)}
          role="tab"
          aria-selected={currentMonth === previousRef}
          className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
            currentMonth === previousRef
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mês Passado
        </Link>
      </div>
      <p className="ds-mono-sm text-muted-foreground">
        {formatMonthLabel(currentMonth)}
      </p>
    </div>
  );
}
