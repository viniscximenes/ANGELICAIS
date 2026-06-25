"use client";

import { useMemo, useState } from "react";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export function CustomDatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + "T12:00:00");
    return new Date();
  });

  const formattedDisplay = useMemo(() => {
    if (!value) return "Selecione uma data...";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }, [value]);

  const daysGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push(d);
    }
    return cells;
  }, [viewDate]);

  const selectDay = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="relative space-y-1.5 w-full">
      <label className="ds-small text-muted-foreground font-medium block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="ds-small flex h-9 w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-2 text-left text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/50"}>
          {formattedDisplay}
        </span>
        <IconCalendar size={15} className="text-muted-foreground/60" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute left-0 mt-1 z-50 w-64 rounded-lg p-3 shadow-xl"
            style={{
              border: "1px solid var(--border)",
              background: "color-mix(in oklch, var(--card) 95%, black)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <IconChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-foreground">
                {meses[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-muted-foreground/60">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} />;
                }
                const isSelected =
                  value ===
                  `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`h-7 w-7 rounded text-xs transition-colors flex items-center justify-center font-medium cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
