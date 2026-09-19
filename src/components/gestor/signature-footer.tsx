/**
 * Assinatura discreta no rodapé de /reports/consolidado — reaproveita a
 * linguagem visual das cantoneiras do StyledCard (ver CardDecorator em
 * styled-card.tsx), só com 2 vértices (superior-esquerdo e inferior-direito)
 * em vez dos 4, pra marcar "moldura" sem parecer mais um card de dado.
 */
export function SignatureFooter() {
  return (
    <div className="flex justify-center pt-6 pb-8">
      <div className="group relative inline-flex items-center px-5 py-2.5">
        <span
          aria-hidden="true"
          className="border-muted-foreground/40 group-hover:border-primary absolute top-0 left-0 size-2.5 border-t-2 border-l-2 transition-colors duration-[350ms] ease-out"
        />
        <span
          aria-hidden="true"
          className="border-muted-foreground/40 group-hover:border-primary absolute right-0 bottom-0 size-2.5 border-r-2 border-b-2 transition-colors duration-[350ms] ease-out"
        />
        <span className="text-muted-foreground group-hover:text-foreground ds-mono-sm text-[11px] tracking-[0.15em] uppercase transition-colors duration-[350ms] ease-out">
          Criado por Caio Ximenes
        </span>
      </div>
    </div>
  );
}
