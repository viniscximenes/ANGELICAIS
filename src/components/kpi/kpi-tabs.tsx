"use client";

import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { id: "principal", label: "Principais", href: "/kpi/atual-principal" },
  { id: "secundario", label: "Secundários", href: "/kpi/atual-secundario" },
] as const;

export function KpiTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="tablist"
      className="elevation-1 inline-flex gap-1 rounded-md p-1"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => router.push(tab.href)}
            onMouseEnter={() => router.prefetch(tab.href)}
            className={`ds-small rounded-md px-4 py-1.5 transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
