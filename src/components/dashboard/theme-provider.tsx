"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { updateThemePreferenceAction } from "@/lib/users/actions/update-theme-preference-action";
import { cn } from "@/lib/utils";
import { ThemeTransitionOverlay } from "./theme-transition-overlay";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isPending: boolean;
  isTransitioning: boolean;
  overlayVisible: boolean;
  pendingTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props {
  initialTheme: Theme;
  children: ReactNode;
}

// Pequena folga de segurança depois do repaint (2x rAF), antes de revelar o
// tema novo — cobre páginas com muitos gráficos/SVGs no conteúdo.
const SETTLE_BUFFER_MS = 80;

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function ThemeProvider({ initialTheme, children }: Props) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [pendingTheme, setPendingTheme] = useState<Theme>(initialTheme);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [suppressTransitions, setSuppressTransitions] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Resolvers das promises que esperam os eventos reais de animação do
  // overlay (Framer Motion), em vez de delays arbitrários.
  const overlayEnteredResolveRef = useRef<(() => void) | null>(null);
  const overlayExitedResolveRef = useRef<(() => void) | null>(null);

  const handleOverlayEntered = useCallback(() => {
    overlayEnteredResolveRef.current?.();
    overlayEnteredResolveRef.current = null;
  }, []);

  const handleOverlayExited = useCallback(() => {
    overlayExitedResolveRef.current?.();
    overlayExitedResolveRef.current = null;
  }, []);

  const waitForOverlayEnter = useCallback(() => {
    return new Promise<void>((resolve) => {
      overlayEnteredResolveRef.current = resolve;
    });
  }, []);

  const waitForOverlayExit = useCallback(() => {
    return new Promise<void>((resolve) => {
      overlayExitedResolveRef.current = resolve;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    if (isTransitioning) return;

    const previous = theme;
    const newTheme: Theme = previous === "dark" ? "light" : "dark";

    setPendingTheme(newTheme);
    setIsTransitioning(true);
    // Desliga as transições/animações CSS de todo o conteúdo ANTES do
    // overlay terminar de aparecer, para a troca de cor por baixo do blur
    // ser um "corte seco" (um frame) em vez de cada elemento animar em
    // timings levemente diferentes.
    setSuppressTransitions(true);
    setOverlayVisible(true);

    void (async () => {
      // 1) Espera o overlay estar 100% visível — evento real do Framer
      // Motion (onAnimationComplete), não um delay arbitrário.
      await waitForOverlayEnter();

      // 2) Troca real do tema: com as transições já desligadas, isso é
      // instantâneo, então não importa que ainda esteja "visível" — está
      // tudo coberto pelo overlay de qualquer forma.
      applyThemeToDocument(newTheme);
      setTheme(newTheme);

      startTransition(async () => {
        const r = await updateThemePreferenceAction({ theme: newTheme });
        if (!r.success) {
          applyThemeToDocument(previous);
          setTheme(previous);
          console.error("Falha ao salvar preferência de tema:", r.error);
        }
      });

      // 3) Aguarda o repaint (2x rAF) + folga mínima de segurança.
      await waitForNextPaint();
      await sleep(SETTLE_BUFFER_MS);

      // 4) Reativa as transições normais (hover etc.) ANTES de revelar, e
      // só então inicia o fade-out do overlay.
      setSuppressTransitions(false);
      setOverlayVisible(false);

      await waitForOverlayExit();
      setIsTransitioning(false);
    })();
  }, [theme, isTransitioning, waitForOverlayEnter, waitForOverlayExit]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isPending,
        isTransitioning,
        overlayVisible,
        pendingTheme,
      }}
    >
      <div
        className={cn("contents", suppressTransitions && "theme-transitioning")}
      >
        {children}
      </div>
      <ThemeTransitionOverlay
        onEntered={handleOverlayEntered}
        onExited={handleOverlayExited}
      />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return ctx;
}
