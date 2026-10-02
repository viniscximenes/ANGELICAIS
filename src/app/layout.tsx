import type { Metadata } from "next";
import "./globals.css";
// Paletas depois do globals.css (ver src/app/palettes/).
import "./palettes/vercel.css";
import "./palettes/claude-amber.css";
import "./palettes/sage-garden.css";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";

import { FaviconNavigationBridge } from "@/components/dashboard/favicon-navigation-bridge";
import { HideProgressBarForRoutes } from "@/components/dashboard/hide-progress-bar-for-routes";
import { ProgressBarProvider } from "@/components/dashboard/progress-provider";
import { ThemeProvider } from "@/components/dashboard/theme-provider";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DEFAULT_PALETTE, PALETTE_EARLY_SCRIPT } from "@/lib/theme/palettes";
import { FAVICON_EARLY_SCRIPT } from "@/lib/favicon/favicon-early-script";
import { cn } from "@/lib/utils";

// Geist/Geist Mono sem preload: as paletas sobrescrevem --font-sans com a
// Instrument Sans, e o mono só aparece em pontos isolados. Assim, num
// Ctrl+Shift+R (sem cache) a Instrument Sans é o único download de fonte
// disputando o início do carregamento.
const geist = Geist({ subsets: ["latin"], variable: "--font-sans", preload: false });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: false,
});
// Fonte padrão das paletas (Vercel, Claude Amber e Sage Garden) —
// referenciada por --font-sans em cada arquivo de src/app/palettes/.
const zenSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-zen-sans",
  // "block" em vez do padrão "swap": no F5 o texto não pisca com a fonte de
  // fallback (Arial ajustada) antes da Instrument Sans entrar — com a fonte
  // em cache ela já está pronta no 1º paint, sem troca visível.
  display: "block",
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
      // data-palette é trocado pelo PALETTE_EARLY_SCRIPT antes da hidratação.
      suppressHydrationWarning
      className={cn(
        theme === "dark" && "dark",
        "font-sans",
        geist.variable,
        geistMono.variable,
        zenSans.variable,
      )}
    >
      <head>
        {/* <script> cru (não next/script): precisa rodar no parse, antes do
            primeiro paint — ver PALETTE_EARLY_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: PALETTE_EARLY_SCRIPT }} />
      </head>
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
