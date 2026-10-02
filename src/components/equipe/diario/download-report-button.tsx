"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { capturarComoPng } from "@/lib/utils/capturar-como-png";

interface DownloadReportButtonProps {
  dia: string;
  operador: string;
  tema: string;
  getTexto: () => string;
  fontVariableClassName: string;
}

/*
 * Imagem do report no formato de uma linha de planilha (Excel), para anexo
 * ao RH: grade cinza, cabeçalho de colunas A–D e numeração de linhas.
 * Sempre em tema claro, independente do tema do site — é um documento.
 */
const EXCEL_FONT = 'Calibri, Carlito, "Segoe UI", Arial, sans-serif';
const EXCEL_GRADE = "#D4D4D4";
const EXCEL_MOLDURA_BG = "#F3F3F3";
const EXCEL_MOLDURA_TEXTO = "#616161";

const celulaBase: CSSProperties = {
  border: `1px solid ${EXCEL_GRADE}`,
  padding: "6px 10px",
  color: "#000000",
  verticalAlign: "middle",
};

const celulaMoldura: CSSProperties = {
  ...celulaBase,
  background: EXCEL_MOLDURA_BG,
  color: EXCEL_MOLDURA_TEXTO,
  padding: "3px 8px",
  fontSize: "12px",
  textAlign: "center",
};

const celulaCabecalho: CSSProperties = {
  ...celulaBase,
  background: "#F2F2F2",
  fontWeight: 700,
  textAlign: "center",
  whiteSpace: "nowrap",
};

function nomeArquivo(operador: string, dia: string, tema: string) {
  const limpar = (valor: string) =>
    valor
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  return `report-${limpar(operador)}-${limpar(dia)}-${limpar(tema)}.png`;
}

export function DownloadReportButton({
  dia,
  operador,
  tema,
  getTexto,
  fontVariableClassName,
}: DownloadReportButtonProps) {
  // Texto congelado no clique: o template só é montado durante a captura.
  const [textoCaptura, setTextoCaptura] = useState<string | null>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const gerando = textoCaptura !== null;

  useEffect(() => {
    if (textoCaptura === null || !templateRef.current) return;
    const alvo = templateRef.current;
    let cancelado = false;

    (async () => {
      try {
        const dataUrl = await capturarComoPng(alvo, { padding: 0 });
        if (cancelado) return;
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = nomeArquivo(operador, dia, tema);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        if (!cancelado) {
          toast.error("Não foi possível gerar a imagem do report", {
            className: "operacao-diario-toast",
          });
        }
      } finally {
        if (!cancelado) setTextoCaptura(null);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [textoCaptura, operador, dia, tema]);

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                if (!gerando) setTextoCaptura(getTexto());
              }}
              disabled={gerando}
              aria-busy={gerando}
              aria-label="Baixar imagem do report"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border/80 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {gerando ? (
                <IconLoader2
                  size={15}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <IconDownload size={15} aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={7}
            className={`operacao-diario-portal ${fontVariableClassName}`}
          >
            Baixar imagem
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {gerando && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", top: "-99999px", left: "-99999px" }}
        >
          <div
            ref={templateRef}
            style={{
              background: "#FFFFFF",
              fontFamily: EXCEL_FONT,
              fontSize: "15px",
              lineHeight: 1.35,
              letterSpacing: "normal",
              display: "inline-block",
            }}
          >
            <table
              style={{
                borderCollapse: "collapse",
                tableLayout: "auto",
                background: "#FFFFFF",
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...celulaMoldura, width: "36px" }} />
                  <th style={celulaMoldura}>A</th>
                  <th style={celulaMoldura}>B</th>
                  <th style={celulaMoldura}>C</th>
                  <th style={celulaMoldura}>D</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={celulaMoldura}>1</td>
                  <td style={celulaCabecalho}>DIA</td>
                  <td style={celulaCabecalho}>OPERADOR</td>
                  <td style={celulaCabecalho}>TEMA</td>
                  <td style={celulaCabecalho}>REPORT</td>
                </tr>
                <tr>
                  <td style={celulaMoldura}>2</td>
                  <td
                    style={{
                      ...celulaBase,
                      whiteSpace: "nowrap",
                      textAlign: "center",
                    }}
                  >
                    {dia}
                  </td>
                  <td style={{ ...celulaBase, whiteSpace: "nowrap" }}>
                    {operador}
                  </td>
                  <td style={{ ...celulaBase, whiteSpace: "nowrap" }}>
                    {tema}
                  </td>
                  <td
                    style={{
                      ...celulaBase,
                      width: "560px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {textoCaptura}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
