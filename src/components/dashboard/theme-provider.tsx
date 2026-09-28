"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  DEFAULT_PALETTE,
  isPaletteId,
  type PaletteId,
} from "@/lib/theme/palettes";
import { updateThemePreferenceAction } from "@/lib/users/actions/update-theme-preference-action";
import { cn } from "@/lib/utils";
import { ThemeTransitionOverlay } from "./theme-transition-overlay";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
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

// Paleta ainda não tem coluna no perfil (só existe Zen Linen); fica no
// navegador até existir uma segunda opção que justifique persistir no banco.
const PALETTE_STORAGE_KEY = "palette-preference";

function applyPaletteToDocument(palette: PaletteId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", palette);
}

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
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);
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

  // O root layout re-renderiza sem remontar o provider (ex.: /login →
  // redirect pós-login, onde o tema passa do default "dark" para a
  // preferência do perfil). Sem isso o estado ficava preso no valor inicial
  // enquanto o <html> já mostrava o tema do perfil.
  const [syncedInitialTheme, setSyncedInitialTheme] = useState(initialTheme);
  if (initialTheme !== syncedInitialTheme && !isTransitioning) {
    setSyncedInitialTheme(initialTheme);
    setThemeState(initialTheme);
    setPendingTheme(initialTheme);
  }

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(PALETTE_STORAGE_KEY);
    } catch {}
    const initial = isPaletteId(stored) ? stored : DEFAULT_PALETTE;
    setPaletteState(initial);
    applyPaletteToDocument(initial);
  }, []);

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next);
    applyPaletteToDocument(next);
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, next);
    } catch {}
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    if (isTransitioning || newTheme === theme) return;

    const previous = theme;

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
      setThemeState(newTheme);

      startTransition(async () => {
        const r = await updateThemePreferenceAction({ theme: newTheme });
        if (!r.success) {
          applyThemeToDocument(previous);
          setThemeState(previous);
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

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        palette,
        setPalette,
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
