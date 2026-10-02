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
import { flushSync } from "react-dom";

import {
  DEFAULT_PALETTE,
  isPaletteId,
  type PaletteId,
} from "@/lib/theme/palettes";
import { updateThemePreferenceAction } from "@/lib/users/actions/update-theme-preference-action";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
  isPending: boolean;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props {
  initialTheme: Theme;
  children: ReactNode;
}

// Paleta ainda não tem coluna no perfil; fica no navegador até existir
// motivo pra persistir no banco.
const PALETTE_STORAGE_KEY = "palette-preference";

// Troca de modo (claro/escuro): o tema novo se revela num círculo que nasce
// do ponto clicado. Troca de paleta: crossfade curto da página inteira.
const THEME_REVEAL_MS = 620;
const PALETTE_FADE_MS = 360;
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type TransitionKind = { type: "reveal"; x: number; y: number } | { type: "fade" };

/**
 * Troca o tema/paleta via View Transitions API: o navegador tira um
 * "snapshot" do estado atual, aplica a mudança num único frame e anima do
 * snapshot pro estado novo — sem cada elemento animar a própria cor em
 * timings diferentes. Sem suporte (ou com movimento reduzido), a troca é
 * instantânea.
 *
 * Durante a troca, .theme-transitioning (globals.css) desliga as transições
 * CSS de todos os elementos, senão o estado novo "ao vivo" ainda estaria
 * animando cores por baixo da máscara.
 */
async function runThemeTransition(update: () => void, kind: TransitionKind) {
  const root = document.documentElement;
  const canAnimate =
    typeof document.startViewTransition === "function" && !prefersReducedMotion();

  root.classList.add("theme-transitioning");

  if (!canAnimate) {
    update();
    requestAnimationFrame(() => root.classList.remove("theme-transitioning"));
    return;
  }

  root.dataset.themeTransition = kind.type;
  try {
    const transition = document.startViewTransition(() => {
      flushSync(update);
    });
    await transition.ready;

    if (kind.type === "reveal") {
      // Raio até o canto mais distante, pra cobrir a tela toda.
      const radius = Math.hypot(
        Math.max(kind.x, window.innerWidth - kind.x),
        Math.max(kind.y, window.innerHeight - kind.y),
      );
      root.animate(
        {
          clipPath: [
            `circle(0px at ${kind.x}px ${kind.y}px)`,
            `circle(${radius}px at ${kind.x}px ${kind.y}px)`,
          ],
        },
        {
          duration: THEME_REVEAL_MS,
          easing: EASE_IN_OUT,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    } else {
      root.animate(
        { opacity: [0, 1] },
        {
          duration: PALETTE_FADE_MS,
          easing: "ease-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    }

    await transition.finished;
  } catch {
    // Transição abortada (ex.: outra troca no meio) — o estado já foi
    // aplicado pelo callback; só limpa as classes abaixo.
  } finally {
    delete root.dataset.themeTransition;
    root.classList.remove("theme-transitioning");
  }
}

export function ThemeProvider({ initialTheme, children }: Props) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Último ponto clicado — origem do círculo de revelação do tema novo.
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () =>
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  // O root layout re-renderiza sem remontar o provider (ex.: /login →
  // redirect pós-login, onde o tema passa do default "dark" para a
  // preferência do perfil). Sem isso o estado ficava preso no valor inicial
  // enquanto o <html> já mostrava o tema do perfil.
  const [syncedInitialTheme, setSyncedInitialTheme] = useState(initialTheme);
  if (initialTheme !== syncedInitialTheme && !isTransitioning) {
    setSyncedInitialTheme(initialTheme);
    setThemeState(initialTheme);
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

  const setPalette = useCallback(
    (next: PaletteId) => {
      if (isTransitioning || next === palette) return;
      setIsTransitioning(true);
      void runThemeTransition(
        () => {
          applyPaletteToDocument(next);
          setPaletteState(next);
        },
        { type: "fade" },
      ).finally(() => setIsTransitioning(false));
      try {
        localStorage.setItem(PALETTE_STORAGE_KEY, next);
      } catch {}
    },
    [palette, isTransitioning],
  );

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (isTransitioning || newTheme === theme) return;

      const previous = theme;
      const origin = lastPointerRef.current ?? { x: window.innerWidth - 80, y: 30 };

      setIsTransitioning(true);
      void runThemeTransition(
        () => {
          applyThemeToDocument(newTheme);
          setThemeState(newTheme);
        },
        { type: "reveal", ...origin },
      ).finally(() => setIsTransitioning(false));

      startTransition(async () => {
        const r = await updateThemePreferenceAction({ theme: newTheme });
        if (!r.success) {
          applyThemeToDocument(previous);
          setThemeState(previous);
          console.error("Falha ao salvar preferência de tema:", r.error);
        }
      });
    },
    [theme, isTransitioning],
  );

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
      }}
    >
      {children}
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
