/**
 * Título de seção (ex.: "Analítico") com a divisória ao lado: um traço
 * curto em cima e um longo embaixo, até a borda direita, na cor do texto
 * do report (muted-foreground) a 55% — o traço sólido de 2px na cor cheia
 * parecia bem mais claro que as letras finas do texto.
 *
 * `mb-6` no próprio header (não no pai): o cabeçalho também é renderizado
 * DENTRO da área pinada do trilho (prop `header` de
 * RetencaoHorizontalScroll), onde o espaçamento do pai não chega.
 */
export function CabecalhoSecao({ titulo }: { titulo: string }) {
  return (
    <header className="pt-2 pb-4 mb-6 flex items-center gap-4">
      <h2 className="font-sans shrink-0 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {titulo}
      </h2>
      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="block h-0.5 w-24 bg-muted-foreground/55" />
        <span className="block h-0.5 w-full bg-muted-foreground/55" />
      </div>
    </header>
  );
}
