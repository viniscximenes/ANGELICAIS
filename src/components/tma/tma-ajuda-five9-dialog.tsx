"use client";

import { useState } from "react";
import { IconHelpCircle } from "@tabler/icons-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PASSOS = [
  {
    texto:
      'No Five9 dashboard, ir em "Custom Reports", apertar Ctrl+F e buscar por "Ramon" — isso leva até o grupo "Bases dados Five9 (ramon.rodrigues@vipbrtelecom.com)". Localizar a base "Report Voz - TMA" e clicar nela.',
    imagem: "/tma-ajuda/01.png",
  },
  {
    texto:
      'Em "Time Frame", selecionar o dia desejado nos campos Start e End — ou, para o dia atual, clicar em "Date Range" → Interval → "Today". Depois, clicar em "Run Report".',
    imagem: "/tma-ajuda/02.png",
  },
  {
    texto:
      'Ao carregar, clicar em "Export Details". No card que aparece, selecionar "Values separated by semicolon" e clicar em "OK".',
    imagem: "/tma-ajuda/03.png",
  },
  {
    texto:
      'Na parte superior vai aparecer um botão de Download — clicar nele baixa o CSV. Depois é só anexar esse arquivo na aba de anexo do site (o card "Anexar Base").',
    imagem: "/tma-ajuda/04.png",
  },
];

export function TmaAjudaFive9Dialog() {
  const [open, setOpen] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Como exportar a base do Five9"
          aria-label="Como exportar a base do Five9"
          className="text-muted-foreground/60 hover:text-muted-foreground inline-flex items-center transition-colors"
        >
          <IconHelpCircle size={15} aria-hidden="true" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-tema sm:max-w-[640px] bg-background border-border/80 p-6 shadow-2xl">
        <DialogHeader className="border-b border-dashed border-border/60 pb-3">
          <DialogTitle>Como exportar a base do Five9</DialogTitle>
        </DialogHeader>

        <div
          className="ds-small mt-4 space-y-1 rounded-md p-3"
          style={{
            color: "var(--warning)",
            background: "var(--warning-bg)",
            border: "1px solid var(--warning-border)",
          }}
        >
          <p>
            <strong>Baixe sempre os dados de apenas 1 dia por vez.</strong> Arquivos com mais de 1
            dia somado podem gerar TMA incorreto.
          </p>
          <p>
            Mantenha o dashboard do Five9 em <strong>inglês</strong> para evitar divergência com os
            nomes de campo usados aqui.
          </p>
        </div>

        <ol className="mt-4 space-y-5">
          {PASSOS.map((passo, i) => (
            <li key={i} className="space-y-2">
              <p className="ds-body flex gap-2">
                <span className="ds-mono-sm text-muted-foreground shrink-0 font-semibold">
                  {i + 1}.
                </span>
                <span>{passo.texto}</span>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- captura real do Five9, tamanho variável */}
              <img
                src={passo.imagem}
                alt={`Passo ${i + 1}`}
                onClick={() => setZoomSrc(passo.imagem)}
                title="Clique para ampliar"
                className="w-full cursor-zoom-in rounded-md border border-border/80 transition-opacity hover:opacity-90"
              />
            </li>
          ))}
        </ol>
      </DialogContent>

      {/*
        Dialog ANINHADO (não um portal manual) — o Radix empilha camadas
        "dismissable" corretamente: um clique fora fecha só a camada mais
        externa aberta no momento (o zoom), sem propagar e fechar o painel
        de ajuda por trás junto. Um overlay/portal solto por fora do Radix
        não teria esse isolamento (o clique seria visto como "fora" dos DOIS
        dialogs ao mesmo tempo).
      */}
      <Dialog open={zoomSrc !== null} onOpenChange={(o) => !o && setZoomSrc(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[95vw] sm:max-w-[95vw] border-none bg-transparent p-0 shadow-none"
        >
          {zoomSrc && (
            /* eslint-disable-next-line @next/next/no-img-element -- lightbox da mesma captura real do Five9 */
            <img
              src={zoomSrc}
              alt="Passo ampliado"
              className="mx-auto max-h-[85vh] w-auto max-w-full cursor-zoom-out rounded-md shadow-2xl"
              onClick={() => setZoomSrc(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
