"use client";

import { useState, useEffect } from "react";
import { IconTarget, IconDeviceFloppy } from "@tabler/icons-react";

interface ConfigMetasProps {
  metaGlobal: number;
  themeMetas: Record<string, number>;
  onSave: (global: number, themes: Record<string, number>) => void;
}

export function ConfigMetas({ metaGlobal, themeMetas, onSave }: ConfigMetasProps) {
  const [localGlobal, setLocalGlobal] = useState(metaGlobal);
  const [localThemes, setLocalThemes] = useState<Record<string, number>>(themeMetas);

  // Sync with prop updates
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
    <div className="elevation-1 bg-card border border-border/60 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="ds-h3 font-semibold text-foreground flex items-center gap-2">
          <IconTarget size={20} className="text-foreground" />
          Configurações de Metas
        </h3>
        <p className="ds-small text-muted-foreground mt-1">
          Defina as metas da taxa de retenção global (polo) e de cada tema.
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Meta Global */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase block">Meta Global (Polo) %</label>
          <input
            type="number"
            value={localGlobal}
            onChange={(e) => setLocalGlobal(parseFloat(e.target.value) || 0)}
            className="w-full text-xs bg-zinc-900 border border-white/10 hover:border-white/20 rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            placeholder="Ex: 60"
            min={0}
            max={100}
            step={0.1}
          />
        </div>

        {/* Linha separadora */}
        <div className="border-t border-white/5 my-2" />

        {/* Metas por Tema */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Metas por Tema %</span>
          <div className="grid grid-cols-1 gap-2">
            {themesList.map((t) => (
              <div key={t.key} className="flex justify-between items-center gap-2">
                <span className="text-xs text-muted-foreground truncate">{t.label}</span>
                <input
                  type="number"
                  value={localThemes[t.key] !== undefined ? localThemes[t.key] : 60}
                  onChange={(e) => handleThemeChange(t.key, e.target.value)}
                  className="w-20 text-xs bg-zinc-900 border border-white/10 hover:border-white/20 rounded-lg p-1.5 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center font-mono transition-all"
                  placeholder="60"
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-2 py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/95 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <IconDeviceFloppy size={16} />
          Salvar Metas
        </button>
      </div>
    </div>
  );
}
