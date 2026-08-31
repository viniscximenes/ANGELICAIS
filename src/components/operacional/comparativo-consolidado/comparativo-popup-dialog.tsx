"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { StyledCard } from "@/components/gestor/styled-card";

interface ComparativoPopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * Convite pontual (1x por gestor por dia) para ver o comparativo entre
 * equipes, disparado no primeiro report do dia em /reports/consolidado.
 *
 * Não-modal: card fixo no canto inferior esquerdo, sem overlay/blur — o
 * conteúdo por trás segue visível e interativo. Fechar sem clicar em "Ver
 * comparativo" já conta como exibido (o registro é feito na server action
 * antes deste card abrir; fechar aqui não desfaz nada).
 */
export function ComparativoPopupDialog({ open, onOpenChange }: ComparativoPopupDialogProps) {
  const router = useRouter();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: -16, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -16, y: 8 }}
          transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
          className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm"
          role="dialog"
          aria-label="Comparativo com outras equipes"
        >
          <StyledCard className="p-4 space-y-3" withGradient corners="all">
            <div className="space-y-1">
              <h2 className="ds-h3 text-foreground font-semibold">
                Comparativo com outras equipes
              </h2>
              <p className="ds-small text-muted-foreground">
                Dá uma olhada em como sua equipe está em relação às outras hoje.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Agora não
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/operacao/comparativo-consolidado")}
              >
                Ver comparativo
              </Button>
            </div>
          </StyledCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
