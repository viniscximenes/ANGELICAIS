import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { FaviconNavigationBridge } from "@/components/dashboard/favicon-navigation-bridge";
import { HideProgressBarForRoutes } from "@/components/dashboard/hide-progress-bar-for-routes";
import { ProgressBarProvider } from "@/components/dashboard/progress-provider";
import { ThemeProvider } from "@/components/dashboard/theme-provider";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
      className={cn(
        theme === "dark" && "dark",
        "font-sans",
        geist.variable,
        geistMono.variable,
      )}
    >
      <body>
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
