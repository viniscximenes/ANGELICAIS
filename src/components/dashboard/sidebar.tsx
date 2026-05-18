"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCash,
  IconChartBar,
  IconClipboardCheck,
  IconDatabase,
  IconSettings,
  IconTargetArrow,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

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
    | "settings";
  basePath: string;
  permission: Permission;
  items: { label: string; href: string }[];
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
