"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBrandHipchat,
  IconCash,
  IconChartBar,
  IconClipboardCheck,
  IconDatabase,
  IconHeadset,
  IconLogout,
  IconMessage2,
  IconSettings,
  IconTargetArrow,
  IconTrendingUp,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { BlurFade } from "@/components/ui/blur-fade";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@/lib/auth/get-current-user";
import { logoutAction } from "@/lib/auth/logout-action";
import type { Permission } from "@/lib/auth/permissions";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * Sub-itens de 3º nível, indexados pelo href do item pai. Só aparecem
 * enquanto a própria rota está aberta — ao sair dela o item some da sidebar
 * e o pai volta a ser um item simples.
 *
 * Fica aqui (e não em sidebar-sections.ts) porque depende do pathname, que
 * só existe no client.
 */
const SUBITENS_CONTEXTUAIS: Record<string, { label: string; href: string }[]> = {
  "/reports/consolidado": [
    { label: "Analítico", href: "/reports/consolidado/analitico" },
  ],
  "/reports/tempo-indisponibilidade": [
    { label: "Analítico", href: "/reports/tempo-indisponibilidade/analitico" },
  ],
};

export type SidebarSection = {
  id: string;
  label: string;
  iconName:
    | "chart"
    | "target"
    | "cash"
    | "clipboard"
    | "database"
    | "settings"
    | "headset"
    | "trending"
    | "message"
    | "chat";
  basePath: string;
  permission: Permission;
  items: { label: string; href: string }[];
  /**
   * Restringe a seção a roles específicas (além da permissão). Útil quando
   * várias roles têm a mesma permissão mas só uma deve ver a seção — ex.: o
   * ADM tem view_gestor_panel, mas só o GESTOR vê "Painel do Gestor".
   */
  onlyRoles?: UserRole[];
  /**
   * Label de divisória exibido ACIMA desta seção — puramente visual, não é
   * um grupo colapsável nem afeta a filtragem por permissão/role.
   */
  divider?: string;
};

/** Dados do usuário exibidos no branding e no rodapé da navegação. */
export type SidebarUser = {
  fullName: string;
  role: UserRole;
};

const ICONS: Record<
  SidebarSection["iconName"],
  ComponentType<{
    size?: number;
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>
> = {
  chart: IconChartBar,
  target: IconTargetArrow,
  cash: IconCash,
  clipboard: IconClipboardCheck,
  database: IconDatabase,
  settings: IconSettings,
  headset: IconHeadset,
  trending: IconTrendingUp,
  message: IconMessage2,
  chat: IconBrandHipchat,
};

interface SidebarNavProps {
  sections: SidebarSection[];
  user: SidebarUser;
  /** Chamado ao clicar num link — usado pelo drawer mobile para fechar. */
  onNavigate?: () => void;
}

/**
 * Conteúdo da navegação (branding + seções + rodapé). Compartilhado entre a
 * sidebar fixa do desktop e o drawer mobile do header, para que os dois nunca
 * saiam de sincronia.
 */
export function SidebarNav({ sections, user, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* ── Seções ───────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {sections.map((section, index) => {
          const Icon = ICONS[section.iconName];
          const isActiveSection = pathname.startsWith(section.basePath);
          const firstHref = section.items[0]?.href ?? section.basePath;

          return (
            <BlurFade key={section.id} delay={0.05 * index} inView>
              {section.divider && (
                <div
                  aria-hidden="true"
                  className={`border-muted-foreground/20 mb-1.5 border-t border-dashed px-3 pt-2 ${
                    // Sem branding acima, a divisória da 1ª seção não precisa
                    // de respiro no topo — senão sobra um vão morto.
                    index === 0 ? "mt-0 border-t-0 pt-0" : "mt-4"
                  }`}
                >
                  <span className="text-muted-foreground/50 text-[10px] font-semibold tracking-[0.2em] uppercase">
                    {section.divider}
                  </span>
                </div>
              )}

              <Link
                href={firstHref}
                onClick={onNavigate}
                aria-expanded={isActiveSection}
                aria-current={isActiveSection ? "page" : undefined}
                className={`sidebar-main-link hover:bg-muted/50 hover:text-foreground flex items-center gap-3 rounded-md border-l-2 px-3 py-2 transition-colors duration-150 ${
                  isActiveSection
                    ? "border-primary bg-[var(--elevation-1-bg)] text-foreground"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="ds-body font-medium">{section.label}</span>
              </Link>

              <AnimatePresence initial={false}>
                {isActiveSection && section.items.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="mt-0.5 space-y-0.5">
                      {section.items.map((item) => {
                        const isActiveItem = pathname === item.href;
                        const subsContextuais = (
                          SUBITENS_CONTEXTUAIS[item.href] ?? []
                        ).filter((sub) => pathname.startsWith(sub.href));

                        return (
                          <div key={item.href}>
                            <Link
                              href={item.href}
                              onClick={onNavigate}
                              aria-current={isActiveItem ? "page" : undefined}
                              className={`hover:bg-muted/50 hover:text-foreground relative flex items-center rounded-md py-1.5 pr-3 pl-9 transition-colors duration-150 ${
                                isActiveItem
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isActiveItem && (
                                <span
                                  aria-hidden="true"
                                  className="bg-foreground/60 absolute top-1/2 left-[24px] h-4 w-[3px] -translate-y-1/2 rounded-full dark:bg-gradient-to-b dark:from-emerald-400 dark:to-emerald-700"
                                />
                              )}
                              <span className="ds-small">{item.label}</span>
                            </Link>

                            <AnimatePresence initial={false}>
                              {subsContextuais.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{
                                    duration: 0.25,
                                    ease: EASE_OUT_EXPO,
                                  }}
                                  style={{ overflow: "hidden" }}
                                >
                                  <div className="mt-0.5 space-y-0.5">
                                    {subsContextuais.map((sub) => {
                                      const isActiveSub = pathname === sub.href;
                                      return (
                                        <Link
                                          key={sub.href}
                                          href={sub.href}
                                          onClick={onNavigate}
                                          aria-current={
                                            isActiveSub ? "page" : undefined
                                          }
                                          className={`hover:bg-muted/50 hover:text-foreground relative flex items-center rounded-md py-1.5 pr-3 pl-14 transition-colors duration-150 ${
                                            isActiveSub
                                              ? "text-foreground"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {isActiveSub && (
                                            <span
                                              aria-hidden="true"
                                              className="bg-foreground/60 absolute top-1/2 left-[44px] h-4 w-[3px] -translate-y-1/2 rounded-full dark:bg-gradient-to-b dark:from-emerald-400 dark:to-emerald-700"
                                            />
                                          )}
                                          <span className="ds-small">
                                            {sub.label}
                                          </span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </BlurFade>
          );
        })}
      </div>

      {/* ── Rodapé: usuário + logout ─────────────────────────── */}
      <div className="border-border mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <span
          className="ds-small text-muted-foreground min-w-0 flex-1 truncate px-1"
          title={user.fullName}
        >
          {user.fullName}
        </span>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <form action={logoutAction} className="shrink-0">
                <button
                  type="submit"
                  aria-label="Sair"
                  className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors duration-150"
                >
                  <IconLogout size={16} aria-hidden="true" />
                </button>
              </form>
            </TooltipTrigger>
            <TooltipContent side="top">Sair</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface SidebarProps {
  sections: SidebarSection[];
  user: SidebarUser;
}

/**
 * Sidebar fixa do desktop. Abaixo de `lg` ela some — a mesma navegação é
 * servida pelo drawer do header (ver app-header.tsx).
 */
export function Sidebar({ sections, user }: SidebarProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-[60px] hidden h-[calc(100vh-60px)] w-[240px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] px-4 pt-3 pb-4 lg:flex dark:border-r-0 dark:bg-zinc-950 dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]"
    >
      <SidebarNav sections={sections} user={user} />
    </nav>
  );
}
