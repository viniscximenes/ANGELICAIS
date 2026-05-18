"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { id: "principal", label: "Principais", href: "/kpi/passado-principal" },
  { id: "secundario", label: "Secundários", href: "/kpi/passado-secundario" },
] as const;

export function KpiPassadoTabs() {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      className="elevation-1 inline-flex gap-1 rounded-md p-1"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
