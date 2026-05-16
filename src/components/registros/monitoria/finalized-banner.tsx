import { IconCheck } from "@tabler/icons-react";

interface Props {
  finalizedAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function FinalizedBanner({ finalizedAt }: Props) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-3"
      style={{
        background: "color-mix(in oklch, var(--success) 10%, transparent)",
        border: "1px solid color-mix(in oklch, var(--success) 30%, transparent)",
      }}
    >
      <IconCheck
        size={18}
        style={{ color: "var(--success)" }}
        aria-hidden="true"
      />
      <p className="ds-body" style={{ color: "var(--success)" }}>
        Monitoria finalizada em {formatDate(finalizedAt)}
      </p>
    </div>
  );
}
