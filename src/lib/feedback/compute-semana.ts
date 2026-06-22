export type DiaInput = {
  retido: number | null;
  cancelado: number | null;
};

export type DiaComputado = {
  tx: string;
  ret: string;
  canc: string;
  ped: string;
  temDados: boolean;
};

export type SemanaComputada = {
  dias: DiaComputado[];       // índices 0-5 = seg-sáb
  consolidado: DiaComputado;
  diasFormatados: string[];   // ["Segunda · DD/MM", ...]
  periodo: string;            // "DD/MM a DD/MM"
};

const DIAS_NOMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

const DIAS_SEMANA_EXTENSO = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
] as const;

function formatTx(v: number): string {
  return v.toFixed(1).replace(".", ",") + "%";
}

function formatInt(v: number): string {
  return v < 10 ? "0" + v : String(v);
}

function formatDDMM(month: number, day: number): string {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function addDaysToDate(
  year: number,
  month: number,
  day: number,
  n: number,
): { year: number; month: number; day: number } {
  const d = new Date(year, month - 1, day + n);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function computeDia(inp: DiaInput): DiaComputado {
  if (inp.retido === null && inp.cancelado === null) {
    return { tx: "—", ret: "—", canc: "—", ped: "—", temDados: false };
  }
  const ret = inp.retido ?? 0;
  const canc = inp.cancelado ?? 0;
  const ped = ret + canc;
  const tx = ped > 0 ? (ret / ped) * 100 : 0;
  return {
    tx: formatTx(tx),
    ret: formatInt(ret),
    canc: formatInt(canc),
    ped: formatInt(ped),
    temDados: true,
  };
}

/**
 * Calcula os valores de cada dia e o consolidado da semana.
 *
 * @param inputs - Array de 6 elementos (seg-sáb); entrada parcial é permitida.
 * @param segundaFeira - "YYYY-MM-DD" da segunda-feira do período, ou null/vazio.
 */
export function computeSemana(
  inputs: DiaInput[],
  segundaFeira: string | null,
): SemanaComputada {
  // Datas dos 6 dias
  let diasFormatados: string[] = DIAS_NOMES.map((n) => n);
  let periodo = "";

  if (segundaFeira && segundaFeira.length === 10) {
    const [y, m, d] = segundaFeira.split("-").map(Number);
    diasFormatados = DIAS_NOMES.map((nome, i) => {
      const dt = addDaysToDate(y, m, d, i);
      return `${nome} · ${formatDDMM(dt.month, dt.day)}`;
    });
    const sab = addDaysToDate(y, m, d, 5);
    periodo = `${formatDDMM(m, d)} a ${formatDDMM(sab.month, sab.day)}`;
  }

  // Calcular por dia (garantir array de 6)
  const diasPadded: DiaInput[] = Array.from({ length: 6 }, (_, i) => inputs[i] ?? { retido: null, cancelado: null });
  const dias = diasPadded.map(computeDia);

  // Consolidado: soma dos dias com dados
  const comDados = inputs.filter((d) => d.retido !== null || d.cancelado !== null);
  if (comDados.length === 0) {
    return {
      dias,
      consolidado: { tx: "—", ret: "—", canc: "—", ped: "—", temDados: false },
      diasFormatados,
      periodo,
    };
  }

  const retTotal = comDados.reduce((s, d) => s + (d.retido ?? 0), 0);
  const cancTotal = comDados.reduce((s, d) => s + (d.cancelado ?? 0), 0);
  const pedTotal = retTotal + cancTotal;
  const txTotal = pedTotal > 0 ? (retTotal / pedTotal) * 100 : 0;

  return {
    dias,
    consolidado: {
      tx: formatTx(txTotal),
      ret: formatInt(retTotal),
      canc: formatInt(cancTotal),
      ped: formatInt(pedTotal),
      temDados: true,
    },
    diasFormatados,
    periodo,
  };
}

/**
 * Formata uma data "YYYY-MM-DD" como "Dia-da-semana, DD/MM/AAAA" em PT-BR.
 * Ex: "2026-06-19" → "Sexta-feira, 19/06/2026"
 */
export function formatDataFeedback(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const diaSemana = DIAS_SEMANA_EXTENSO[d.getDay()];
  return `${diaSemana}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
