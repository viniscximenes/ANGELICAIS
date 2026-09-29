"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChartBar,
  IconDatabase,
  IconHeadset,
  IconLogout,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import { BlurFade } from "@/components/ui/blur-fade";
import { LineSidebar, type LineSidebarItem } from "@/components/ui/line-sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@/lib/auth/get-current-user";
import { logoutAction } from "@/lib/auth/logout-action";
import type { Permission } from "@/lib/auth/permissions";
import { formatNomeProprio } from "@/lib/gestor/derive-nome-operador";

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
  "/reports/tempo-indisponibilidade": [
    { label: "Analítico", href: "/reports/tempo-indisponibilidade/analitico" },
  ],
};

/**
 * Itens do TreeNav de uma seção: os itens fixos + os sub-itens contextuais
 * (só enquanto a rota deles está aberta) logo abaixo do pai — o LineSidebar
 * é uma lista plana, então o 3º nível entra como mais uma linha.
 */
function itensDaSecao(section: SidebarSection, pathname: string): LineSidebarItem[] {
  return section.items.flatMap((item) => [
    item,
    ...(SUBITENS_CONTEXTUAIS[item.href] ?? []).filter((sub) =>
      pathname.startsWith(sub.href),
    ),
  ]);
}

/** Item ativo: igualdade exata com o pathname (mesma regra de antes). */
function indiceAtivo(itens: LineSidebarItem[], pathname: string): number | null {
  const idx = itens.findIndex((i) => i.href === pathname);
  return idx >= 0 ? idx : null;
}

export type SidebarSection = {
  id: string;
  label: string;
  iconName: "chart" | "database" | "settings" | "headset" | "users";
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
  /** GESTOR que também acumula acesso administrativo — ver sidebar-sections.ts. */
  isAdminSkill: boolean;
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
  database: IconDatabase,
  settings: IconSettings,
  headset: IconHeadset,
  users: IconUsers,
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
          const itens = itensDaSecao(section, pathname);

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
                className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-150 ${
                  isActiveSection
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
                    {/*
                      Sub-itens como LineSidebar (React Bits): marcadores em
                      linha + ticks, rótulo desliza/escurece por proximidade
                      do cursor e fica destacado no item ativo. Medidas
                      reduzidas pra caber nos 240px da sidebar; cores pelos
                      tokens da paleta (claro/escuro).
                    */}
                    <LineSidebar
                      className="line-sidebar--compact ml-1"
                      items={itens}
                      activeIndex={indiceAtivo(itens, pathname)}
                      linkComponent={Link}
                      onItemClick={onNavigate ? () => onNavigate() : undefined}
                      accentColor="var(--foreground)"
                      textColor="var(--muted-foreground)"
                      markerColor="color-mix(in srgb, var(--muted-foreground) 45%, transparent)"
                      showIndex
                      showMarker
                      proximityRadius={40}
                      maxShift={8}
                      falloff="smooth"
                      markerLength={18}
                      markerGap={10}
                      tickScale={0.5}
                      scaleTick
                      itemGap={10}
                      fontSize={0.8125}
                      smoothing={100}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </BlurFade>
          );
        })}
      </div>

      {/* ── Rodapé: usuário + logout ─────────────────────────── */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--sidebar-border)] pt-3">
        <span
          className="ds-small text-muted-foreground min-w-0 flex-1 truncate px-1"
          title={formatNomeProprio(user.fullName)}
        >
          {formatNomeProprio(user.fullName)}
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
            <TooltipContent side="top" data-nav-theme="zen-linen">
              Sair
            </TooltipContent>
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
      data-nav-theme="zen-linen"
      className="sticky top-[60px] hidden h-[calc(100vh-60px)] w-[240px] shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] px-4 pt-3 pb-4 lg:flex"
    >
      <SidebarNav sections={sections} user={user} />
    </nav>
  );
}
