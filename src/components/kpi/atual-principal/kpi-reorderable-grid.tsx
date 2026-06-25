"use client";

import { useEffect, useState } from "react";

import { KpiMediumCard } from "./kpi-medium-card";
import { TxRetencaoHeroCard } from "./tx-retencao-hero-card";
import type { EnrichedKpiValue } from "@/lib/kpi/atual/types";
import type { NeutralKpiValue } from "@/lib/kpi/passado/types";

interface KpiReorderableGridProps {
  kpis: Record<string, EnrichedKpiValue | NeutralKpiValue>;
  userEmail: string;
}

const DEFAULT_ORDER = [
  "tx_retencao_bruta",
  "indisp_total",
  "tma",
  "abs",
  "pedidos",
  "churn",
  "variacao_ticket",
];

export function KpiReorderableGrid({ kpis, userEmail }: KpiReorderableGridProps) {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const storageKey = `kpi_order_${userEmail}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as string[];
          if (Array.isArray(parsed) && parsed.length === DEFAULT_ORDER.length) {
            setOrder(parsed);
          }
        } catch {
          // Fallback to default
        }
      }
    }
  }, [storageKey]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx !== index && dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (draggedIdx === null || draggedIdx === targetIndex) return;

    const newOrder = [...order];
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIndex, 0, removed);

    setOrder(newOrder);
    localStorage.setItem(storageKey, JSON.stringify(newOrder));
    setDraggedIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Helper to render card component based on position
  const renderCard = (slug: string, index: number) => {
    const kpi = kpis[slug];
    if (!kpi) return null;

    const isDragging = draggedIdx === index;
    const isDragOver = dragOverIdx === index;

    const dragHandlers = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
      onDragLeave: handleDragLeave,
      onDrop: (e: React.DragEvent) => handleDrop(e, index),
      onDragEnd: handleDragEnd,
    };

    const containerStyle = {
      opacity: isDragging ? 0.3 : 1,
      cursor: isDragging ? "grabbing" : "grab",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      transform: isDragOver ? "scale(1.015)" : undefined,
      boxShadow: isDragOver ? "0 0 20px rgba(59, 130, 246, 0.25)" : undefined,
      outline: "none",
      borderRadius: index === 0 ? "12px" : "8px",
    };

    const dragClass = "transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] active:cursor-grabbing hover:shadow-2xl";

    if (index === 0) {
      // Hero Slot
      return (
        <div {...dragHandlers} style={containerStyle} className={`w-full ${dragClass}`}>
          <TxRetencaoHeroCard kpi={kpi} />
        </div>
      );
    }

    // Grid Slots (1 to 6)
    return (
      <div {...dragHandlers} style={containerStyle} className={`h-full ${dragClass}`}>
        <KpiMediumCard kpi={kpi} delayIndex={index} />
      </div>
    );
  };

  const heroSlug = order[0];
  const gridSlugs = order.slice(1);

  return (
    <div className="space-y-6">
      {/* Hero Slot Container */}
      {renderCard(heroSlug, 0)}

      {/* Grid Slots Container */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {gridSlugs.map((slug, idx) => (
          <div key={slug} className="h-full">
            {renderCard(slug, idx + 1)}
          </div>
        ))}
      </div>
    </div>
  );
}
