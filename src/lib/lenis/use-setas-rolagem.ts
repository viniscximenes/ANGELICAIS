"use client";

import { useEffect } from "react";

import { getLenisInstance } from "./lenis-instance";

// Camadas "donas" das setas do teclado (ver handleKeyDown).
const SELETOR_CAMADA_ABERTA =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"], [data-radix-popper-content-wrapper]';
const SELETOR_CAMADA_ABERTA_DOC =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]';

/**
 * Setas Cima/Baixo rolam a página (120px).
 *
 * Usa lenis.scrollTo (não window.scrollBy nativo): o Lenis controla o
 * scroll da página via RAF próprio (LenisProvider). Scroll nativo com
 * behavior:"smooth" por fora dele deixa o alvo interno do Lenis
 * (`animatedScroll`) dessincronizado — no wheel/touch seguinte ele "puxa" a
 * página de volta. Passar pelo Lenis mantém os dois em sincronia (e evita
 * pular um trecho do trilho horizontal pinado pelo ScrollTrigger).
 */
export function useSetasRolagem() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      // Outro componente já tratou a tecla, ou é atalho com modificador.
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const active = document.activeElement as HTMLElement | null;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable);
      if (isInput) return;

      // Foco dentro de popover/dialog/menu/lista: as setas são deles. E com
      // um dialog/popover aberto (foco pode ter ficado no body), também não
      // rola a página por baixo dele.
      if (active?.closest(SELETOR_CAMADA_ABERTA) || document.querySelector(SELETOR_CAMADA_ABERTA_DOC)) {
        return;
      }

      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 120 : -120;
      const lenis = getLenisInstance();
      if (lenis) {
        lenis.scrollTo(lenis.animatedScroll + delta, { duration: 0.4 });
      } else {
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
