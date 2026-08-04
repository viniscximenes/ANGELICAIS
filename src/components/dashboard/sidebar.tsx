"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCash,
  IconChartBar,
  IconClipboardCheck,
  IconDatabase,
  IconHeadset,
  IconMessage2,
  IconSettings,
  IconTargetArrow,
  IconTrendingUp,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import type { UserRole } from "@/lib/auth/get-current-user";
import type { Permission } from "@/lib/auth/permissions";

import { ThemeToggle } from "./theme-toggle";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

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
    | "message";
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
};

interface SidebarProps {
  sections: SidebarSection[];
}

export function Sidebar({ sections }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-[60px] flex h-[calc(100vh-60px)] flex-col overflow-y-auto px-4 py-6"
      style={{
        width: "240px",
        borderRight: "1px solid var(--border)",
        background: "var(--background)",
      }}
    >
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = ICONS[section.iconName];
          const isActiveSection = pathname.startsWith(section.basePath);
          const firstHref = section.items[0]?.href ?? section.basePath;

          return (
            <div key={section.id}>
              {section.divider && (
                <div
                  aria-hidden="true"
                  className="mb-3 pt-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <span className="px-3 text-xs tracking-wider text-muted-foreground uppercase">
                    {section.divider}
                  </span>
                </div>
              )}
              <Link
                href={firstHref}
                aria-expanded={isActiveSection}
                aria-current={isActiveSection ? "page" : undefined}
                className="flex items-center gap-3 rounded-md transition-colors"
                style={{
                  padding: "10px 12px",
                  background: isActiveSection
                    ? "var(--elevation-1-bg)"
                    : "transparent",
                  color: isActiveSection
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                }}
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
                    <div className="mt-1 space-y-0.5">
                      {section.items.map((item) => {
                        const isActiveItem = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActiveItem ? "page" : undefined}
                            className="relative flex items-center rounded-md transition-colors"
                            style={{
                              padding: "8px 12px 8px 36px",
                              color: isActiveItem
                                ? "var(--foreground)"
                                : "var(--muted-foreground)",
                            }}
                          >
                            {isActiveItem && (
                              <div
                                aria-hidden="true"
                                className="absolute top-1/2 left-[24px] -translate-y-1/2"
                                style={{
                                  width: "2px",
                                  height: "16px",
                                  background: "var(--primary)",
                                  borderRadius: "1px",
                                }}
                              />
                            )}
                            <span className="ds-small">{item.label}</span>
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

      <div
        className="mt-auto space-y-1 pt-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <ThemeToggle />
      </div>
    </nav>
  );
}
