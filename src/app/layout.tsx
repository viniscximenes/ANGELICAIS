import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { Toaster } from "sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  title: "meu-projeto",
  description: "Scaffolding inicial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("dark font-sans", geist.variable, geistMono.variable)}>
      <body>
        <LenisProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "var(--elevation-2-bg)",
                border: "1px solid var(--elevation-2-border)",
                color: "var(--foreground)",
              },
            }}
          />
        </LenisProvider>
      </body>
    </html>
  );
}
