"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { updateThemePreferenceAction } from "@/lib/users/actions/update-theme-preference-action";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isPending: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props {
  initialTheme: Theme;
  children: ReactNode;
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ initialTheme, children }: Props) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [isPending, startTransition] = useTransition();

  const toggleTheme = useCallback(() => {
    const previous = theme;
    const newTheme: Theme = previous === "dark" ? "light" : "dark";

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
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isPending }}>
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
