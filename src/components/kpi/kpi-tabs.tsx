"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { id: "principal", label: "Principais", href: "/kpi/atual-principal" },
  { id: "secundario", label: "Secundários", href: "/kpi/atual-secundario" },
] as const;

export function KpiTabs() {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      className="inline-flex gap-1 rounded-lg p-1 bg-zinc-950/50 border border-white/5"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={`ds-small rounded-md px-4 py-1.5 transition-all duration-200 font-medium text-xs ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-zinc-900/40"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
