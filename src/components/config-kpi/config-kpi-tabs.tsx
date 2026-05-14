"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { id: "principais", label: "Principais" },
  { id: "secundarios", label: "Secundários" },
  { id: "mapeamento", label: "Mapeamento" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ConfigKpiTabsProps {
  principais: ReactNode;
  secundarios: ReactNode;
  mapeamento: ReactNode;
}

export function ConfigKpiTabs({
  principais,
  secundarios,
  mapeamento,
}: ConfigKpiTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("principais");

  const content: Record<TabId, ReactNode> = {
    principais,
    secundarios,
    mapeamento,
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
