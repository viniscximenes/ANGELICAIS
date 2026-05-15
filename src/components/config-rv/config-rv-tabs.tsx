"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { id: "regras", label: "Regras" },
  { id: "aplicar", label: "Aplicar Deflator" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ConfigRvTabsProps {
  regras: ReactNode;
  aplicarDeflator: ReactNode;
}

export function ConfigRvTabs({ regras, aplicarDeflator }: ConfigRvTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("regras");

  const content: Record<TabId, ReactNode> = {
    regras,
    aplicar: aplicarDeflator,
  };

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        className="elevation-1 inline-flex gap-1 rounded-md p-1"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
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

      <div>{content[activeTab]}</div>
    </div>
  );
}
