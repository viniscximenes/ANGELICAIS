import type { Metadata } from "next";
import "./globals.css";
// Paletas depois do globals.css. Hoje só Zen Linen (ver palettes/zen-linen.css).
import "./palettes/zen-linen.css";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";

import { FaviconNavigationBridge } from "@/components/dashboard/favicon-navigation-bridge";
import { HideProgressBarForRoutes } from "@/components/dashboard/hide-progress-bar-for-routes";
import { ProgressBarProvider } from "@/components/dashboard/progress-provider";
import { ThemeProvider } from "@/components/dashboard/theme-provider";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DEFAULT_PALETTE } from "@/lib/theme/palettes";
import { FAVICON_EARLY_SCRIPT } from "@/lib/favicon/favicon-early-script";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
// Fonte da paleta Zen Linen — referenciada por --font-sans em
// palettes/zen-linen.css.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
});

export const metadata: Metadata = {
  title: "meu-projeto",
  description: "Scaffolding inicial",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const theme = user?.profile.themePreference ?? "dark";

  return (
    <html
      lang="pt-BR"
      data-theme={theme}
      data-palette={DEFAULT_PALETTE}
      className={cn(
        theme === "dark" && "dark",
        "font-sans",
        geist.variable,
        geistMono.variable,
        zenSans.variable,
      )}
    >
      <body>
        {/* beforeInteractive: injetado no <head> e executado durante o parse
            do HTML, antes do bundle React carregar/hidratar — ver
            favicon-early-script.ts pro porquê. Next.js exige que scripts
            beforeInteractive fiquem no root layout. */}
        <Script id="favicon-early" strategy="beforeInteractive">
          {FAVICON_EARLY_SCRIPT}
        </Script>
        <FaviconNavigationBridge />
        <HideProgressBarForRoutes />
        <ProgressBarProvider>
          <LenisProvider>
            <ThemeProvider initialTheme={theme}>
              {children}
              <Toaster
                position="bottom-right"
                theme={theme}
                toastOptions={{
                  style: {
                    background: "var(--elevation-2-bg)",
                    border: "1px solid var(--elevation-2-border)",
                    color: "var(--foreground)",
                  },
                }}
              />
            </ThemeProvider>
          </LenisProvider>
        </ProgressBarProvider>
      </body>
    </html>
  );
}
