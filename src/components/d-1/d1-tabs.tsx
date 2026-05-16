"use client";

import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { id: "consolidado", label: "Consolidado", href: "/d-1/consolidado" },
  { id: "tempo-logado", label: "Tempo Logado", href: "/d-1/tempo-logado" },
  {
    id: "indisponibilidade",
    label: "Indisponibilidade",
    href: "/d-1/indisponibilidade",
  },
] as const;

export function D1Tabs() {
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
