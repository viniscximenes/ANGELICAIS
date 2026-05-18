"use client";

import { IconLoader2, IconMoon, IconSun } from "@tabler/icons-react";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme, isPending } = useTheme();

  const isDark = theme === "dark";
  const Icon = isDark ? IconSun : IconMoon;
  const label = isDark ? "Tema claro" : "Tema escuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={isPending}
      className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 transition-colors"
      aria-label={
        isDark ? "Alternar para tema claro" : "Alternar para tema escuro"
      }
    >
      {isPending ? (
        <IconLoader2
          size={16}
          className="shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Icon size={16} className="shrink-0" aria-hidden="true" />
      )}
      <span className="ds-mono-sm">{label}</span>
    </button>
  );
}
