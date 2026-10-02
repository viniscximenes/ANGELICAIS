"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconMenu2 } from "@tabler/icons-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { UserRole } from "@/lib/auth/get-current-user";
import type { SidebarSection, SidebarUser } from "./sidebar";
import { SidebarNav } from "./sidebar";
import { ThemeMenu } from "./theme-menu";

const ROLE_LABEL: Record<UserRole, string> = {
  GESTOR: "GESTOR",
  ADM: "ADMINISTRADOR",
  COORDENADOR: "COORDENADOR",
};

interface AppHeaderProps {
  user: SidebarUser;
  sections: SidebarSection[];
}

export function AppHeader({ user, sections }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o drawer ao navegar (o clique no link já dispara onNavigate, mas
  // isto cobre navegação por voltar/avançar do navegador).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // GESTOR com is_admin_skill acumula as duas funções — o cabeçalho reflete
  // isso concatenando o label do ADM ao do GESTOR, sem trocar de role.
  const roleLabel =
    user.role === "GESTOR" && user.isAdminSkill
      ? `${ROLE_LABEL.GESTOR} / ${ROLE_LABEL.ADM}`
      : ROLE_LABEL[user.role];

  return (
    <header
      data-nav-theme="zen-linen"
      className="sidebar-zen sticky top-0 z-30 h-[60px] border-b border-[var(--sidebar-border)] bg-[var(--sidebar-nav)]"
    >
      <div className="flex h-[60px] items-center justify-between gap-4 px-6">
        {/* ── Esquerda: hamburger (mobile) + branding ────────── */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir navegação"
            className="text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 lg:hidden"
          >
            <IconMenu2 size={20} stroke={1.75} aria-hidden="true" />
          </button>

          <div className="flex min-w-0 cursor-default flex-col justify-center gap-0.5">
            <span className="text-foreground text-[17px] leading-none font-semibold tracking-[-0.01em]">
              CRM
            </span>
            <span className="text-muted-foreground truncate text-[10px] leading-none font-medium tracking-[0.14em] uppercase">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* ── Direita: tema ──────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3">
          <ThemeMenu />
        </div>
      </div>

      {/* ── Drawer mobile: mesma navegação da sidebar ───────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          data-nav-theme="zen-linen"
          className="w-[280px] bg-[var(--sidebar-nav)] px-4 py-6 sm:max-w-[280px]"
        >
          <SheetTitle className="sr-only">Navegação principal</SheetTitle>
          <SidebarNav
            sections={sections}
            user={user}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </header>
  );
}
