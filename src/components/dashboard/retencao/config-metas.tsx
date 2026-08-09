"use client";

import { useState, useEffect } from "react";
import { IconTarget, IconDeviceFloppy } from "@tabler/icons-react";
import { StyledCard } from "@/components/gestor/styled-card";

interface ConfigMetasProps {
  metaGlobal: number;
  themeMetas: Record<string, number>;
  onSave: (global: number, themes: Record<string, number>) => void;
}

export function ConfigMetas({ metaGlobal, themeMetas, onSave }: ConfigMetasProps) {
  const [localGlobal, setLocalGlobal] = useState(metaGlobal);
  const [localThemes, setLocalThemes] = useState<Record<string, number>>(themeMetas);

  useEffect(() => {
    setLocalGlobal(metaGlobal);
  }, [metaGlobal]);

  useEffect(() => {
    setLocalThemes(themeMetas);
  }, [themeMetas]);

  const themesList = [
    { key: "Mot. Financeiro", label: "Mot. Financeiro" },
    { key: "Ins. Atendimento", label: "Ins. Atendimento" },
    { key: "Ins. Serviço", label: "Ins. Serviço" },
    { key: "Mud. Endereço", label: "Mud. Endereço" },
    { key: "Mud. Provedora", label: "Mud. Provedora" },
    { key: "Outros", label: "Outros" },
  ];

  const handleThemeChange = (key: string, val: string) => {
    const num = parseFloat(val);
    setLocalThemes((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  };

  const handleSave = () => {
    onSave(localGlobal, localThemes);
  };

  return (
    <div className="space-y-3">
      {/* ── Título e descrição fora do card ─────────────────────────── */}
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconTarget size={20} className="text-foreground" />
          Configurações de Metas
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Defina as metas da taxa de retenção global (polo) e por tema da sua equipe.
        </p>
      </div>

      <StyledCard className="p-5 space-y-5" withGradient corners="all">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Meta Global */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase block tracking-wider">
              Meta Global (Polo) %
            </label>
            <input
              type="number"
              value={localGlobal}
              onChange={(e) => setLocalGlobal(parseFloat(e.target.value) || 0)}
              className="w-full text-xs bg-muted/20 border border-border/60 hover:border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
              placeholder="Ex: 60"
              min={0}
              max={100}
              step={0.1}
            />
          </div>

          <div className="hidden lg:block lg:col-span-3" />
        </div>

        {/* Metas por Tema */}
        <div className="space-y-3 border-t border-border/30 pt-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Metas por Tema %
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {themesList.map((t) => (
              <div key={t.key} className="space-y-1 bg-muted/20 border border-border/40 rounded-lg p-2.5">
                <span className="text-[11px] text-muted-foreground truncate block font-medium">{t.label}</span>
                <input
                  type="number"
                  value={localThemes[t.key] !== undefined ? localThemes[t.key] : 60}
                  onChange={(e) => handleThemeChange(t.key, e.target.value)}
                  className="w-full text-xs bg-muted/30 border border-border/60 hover:border-border rounded-md p-1.5 text-foreground focus:outline-none focus:border-primary text-center font-mono transition-all"
                  placeholder="60"
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/30">
          <button
            onClick={handleSave}
            className="py-2.5 px-6 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <IconDeviceFloppy size={16} />
            Salvar Metas
          </button>
        </div>
      </StyledCard>
    </div>
  );
}
