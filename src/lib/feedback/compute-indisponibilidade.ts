export type DiaInputIndisp = {
  indisp: string | null;
  nr17: string | null;
  part: string | null;
  outras: string | null;
};

export type DiaComputadoIndisp = {
  indisp: string;
  nr17: string;
  part: string;
  outras: string;
};

export type IndispComputado = {
  dias: DiaComputadoIndisp[];       // índices 0-5 = seg-sáb
  consolidado: DiaComputadoIndisp;  // médias das 4 colunas
  diasFormatados: string[];         // ["Segunda · DD/MM", ...]
  periodo: string;                  // "DD/MM a DD/MM"
};

const DIAS_NOMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

// Parseia número PT-BR: "5" → 5, "12,5" → 12.5 (valor cheio, sem divisão).
function parseNum(s: string | null): number | null {
  if (!s || s.trim() === "") return null;
  const n = parseFloat(s.trim().replace(",", "."));
  return isNaN(n) ? null : n;
}

// Média dos valores não-nulos, 1 casa decimal, vírgula PT-BR, + "%".
function mediaColuna(nums: (number | null)[]): string {
  const valores = nums.filter((v): v is number => v !== null);
  if (valores.length === 0) return "—";
  const avg = valores.reduce((s, v) => s + v, 0) / valores.length;
  return avg.toFixed(1).replace(".", ",") + "%";
}

function formatDDMM(month: number, day: number): string {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function addDays(y: number, mo: number, d: number, n: number) {
  const dt = new Date(y, mo - 1, d + n);
  return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() };
}

export function computeIndisponibilidade(
  inputs: DiaInputIndisp[],
  segundaFeira: string | null,
): IndispComputado {
  let diasFormatados: string[] = DIAS_NOMES.map((n) => n);
  let periodo = "";

  if (segundaFeira && segundaFeira.length === 10) {
    const [y, mo, d] = segundaFeira.split("-").map(Number);
    diasFormatados = DIAS_NOMES.map((nome, i) => {
      const dt = addDays(y, mo, d, i);
      return `${nome} · ${formatDDMM(dt.mo, dt.d)}`;
    });
    const sab = addDays(y, mo, d, 5);
    periodo = `${formatDDMM(mo, d)} a ${formatDDMM(sab.mo, sab.d)}`;
  }

  const padded: DiaInputIndisp[] = Array.from(
    { length: 6 },
    (_, i) => inputs[i] ?? { indisp: null, nr17: null, part: null, outras: null },
  );

  // Calcula Indisp. Total por dia = NR17 + Particular + Outras
  const diasCalculados = padded.map((d) => {
    const nr17Val = parseNum(d.nr17);
    const partVal = parseNum(d.part);
    const outrasVal = parseNum(d.outras);

    let indispVal: number | null = null;
    if (nr17Val !== null || partVal !== null || outrasVal !== null) {
      indispVal = (nr17Val ?? 0) + (partVal ?? 0) + (outrasVal ?? 0);
    }

    return {
      indisp: indispVal,
      nr17: nr17Val,
      part: partVal,
      outras: outrasVal,
    };
  });

  const dias: DiaComputadoIndisp[] = diasCalculados.map((d) => ({
    indisp: d.indisp !== null ? d.indisp.toString().replace(".", ",") + "%" : "—",
    nr17: d.nr17 !== null ? d.nr17.toString().replace(".", ",") + "%" : "—",
    part: d.part !== null ? d.part.toString().replace(".", ",") + "%" : "—",
    outras: d.outras !== null ? d.outras.toString().replace(".", ",") + "%" : "—",
  }));

  return {
    dias,
    consolidado: {
      indisp: mediaColuna(diasCalculados.map((d) => d.indisp)),
      nr17: mediaColuna(diasCalculados.map((d) => d.nr17)),
      part: mediaColuna(diasCalculados.map((d) => d.part)),
      outras: mediaColuna(diasCalculados.map((d) => d.outras)),
    },
    diasFormatados,
    periodo,
  };
}
