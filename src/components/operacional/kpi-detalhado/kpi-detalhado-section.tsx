"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconFilterFilled,
  IconSearch,
  IconSelector,
} from "@tabler/icons-react";

import { KpiFrame } from "@/app/(dashboard)/kpi/operadores/_components/kpi-frame";
import { celulaApresentacao } from "@/app/(dashboard)/kpi/operadores/_lib/celula-apresentacao";
import { formatKpiValueLocal } from "@/app/(dashboard)/kpi/operadores/_lib/format-kpi-value-local";
import { StyledCard } from "@/components/gestor/styled-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { KpiDetalhadoData } from "@/lib/kpi/detalhado/get-kpi-detalhado";
import { formatDateBR } from "@/lib/utils/format-datetime-br";
import { cn } from "@/lib/utils";

type SortDir = "desc" | "asc";
type SortState = { slug: string; dir: SortDir } | null;

// Peso do título "Detalhado Polo" — mesmo valor/mesmo motivo de
// TITULO_WEIGHT_CLASS em kpi-equipe-section.tsx (Instrument Sans, isolado
// aqui pra poder trocar rápido pra "font-medium" se 600 ficar pesado
// demais). Não importado de lá porque não é exportado (função/consts locais
// daquele arquivo, que não pode mudar).
const TITULO_WEIGHT_CLASS = "font-semibold";

/** Separador "·" do subtítulo — cópia do mesmo componente local usado em
 *  kpi-equipe-section.tsx/kpi-gestor-section.tsx (não exportado de lá). */
function SubtituloSeparador() {
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{
        marginInline: "0.5rem",
        color: "color-mix(in srgb, var(--muted-foreground) 60%, transparent)",
      }}
    >
      ·
    </span>
  );
}

// Larguras fixas das duas primeiras colunas (sticky) — usadas tanto no
// offset `left` quanto no cálculo de minWidth da tabela.
const COL_OPERADOR_W = 150;
const COL_GESTOR_W = 210;
// "Status" acompanha o scroll horizontal (não é sticky) — só Operador e
// Gestor ficam congelados.
const COL_STATUS_W = 140;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Ciclo de ordenação de uma coluna de KPI, a cada clique no header:
 *   aleatório (null) → decrescente → crescente → aleatório → ...
 * Só uma coluna fica ativa por vez: clicar em outra zera a anterior.
 * (A coluna "Gestor" NÃO usa isto — ela abre um filtro, não ordena.)
 */
function proximoSort(atual: SortState, slug: string): SortState {
  if (!atual || atual.slug !== slug) return { slug, dir: "desc" };
  if (atual.dir === "desc") return { slug, dir: "asc" };
  return null;
}

function SortIcon({ ativo, dir }: { ativo: boolean; dir: SortDir | null }) {
  if (!ativo || dir === null) {
    return (
      <IconSelector
        size={14}
        className="ml-1 inline-block align-middle opacity-40"
        aria-hidden="true"
      />
    );
  }
  return dir === "asc" ? (
    <IconChevronUp
      size={14}
      className="text-primary ml-1 inline-block align-middle"
      aria-hidden="true"
    />
  ) : (
    <IconChevronDown
      size={14}
      className="text-primary ml-1 inline-block align-middle"
      aria-hidden="true"
    />
  );
}

interface KpiDetalhadoSectionProps {
  dados: KpiDetalhadoData;
}

export function KpiDetalhadoSection({ dados }: KpiDetalhadoSectionProps) {
  const { colunas, linhas, dataCorte, gestores } = dados;

  const [busca, setBusca] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [gestorFiltro, setGestorFiltro] = useState<string | null>(null);
  const [filtroAberto, setFiltroAberto] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // "Último clique foi dentro do container da tabela?" — decide se as setas
  // rolam a tabela ou a página.
  const cliqueDentroRef = useRef(false);

  const gestorFiltroNome = gestorFiltro
    ? (gestores.find((g) => g.id === gestorFiltro)?.nome ?? null)
    : null;

  // ── Setas do teclado: rolam SÓ a tabela quando o foco está nela, SÓ a
  // página quando não está. Nunca as duas. Não interfere em inputs.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const cont = scrollRef.current;
      cliqueDentroRef.current = !!cont && cont.contains(e.target as Node);
    }

    function onKeyDown(e: KeyboardEvent) {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(e.key)) return;

      const ae = document.activeElement as HTMLElement | null;
      const digitando =
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable);
      if (digitando) return; // deixa o cursor de texto se mover nativamente

      const cont = scrollRef.current;
      const alvo: HTMLElement | Window =
        cliqueDentroRef.current && cont ? cont : window;

      const passoV = 120;
      const passoH = 160;
      const delta =
        e.key === "ArrowUp"
          ? { top: -passoV, left: 0 }
          : e.key === "ArrowDown"
            ? { top: passoV, left: 0 }
            : e.key === "ArrowLeft"
              ? { top: 0, left: -passoH }
              : { top: 0, left: passoH };

      // A página não rola horizontalmente — ignora ←/→ quando o alvo é a
      // janela, pra não engolir a tecla à toa.
      if (alvo === window && delta.left !== 0) return;

      e.preventDefault();
      alvo.scrollBy({ ...delta, behavior: "smooth" });
    }

    document.addEventListener("mousedown", onDocMouseDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const linhasFiltradas = useMemo(() => {
    const termo = normalizar(busca);
    return linhas.filter((l) => {
      if (gestorFiltro && l.gestorId !== gestorFiltro) return false;
      if (termo && !normalizar(l.nome).includes(termo)) return false;
      return true;
    });
  }, [linhas, busca, gestorFiltro]);

  const linhasOrdenadas = useMemo(() => {
    if (!sort) return linhasFiltradas;
    const idx = colunas.findIndex((c) => c.slug === sort.slug);
    if (idx === -1) return linhasFiltradas;
    return [...linhasFiltradas].sort((a, b) => {
      const va = a.celulas[idx]?.valor ?? null;
      const vb = b.celulas[idx]?.valor ?? null;
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sort.dir === "desc" ? vb - va : va - vb;
    });
  }, [linhasFiltradas, sort, colunas]);

  const minWidth =
    COL_OPERADOR_W + COL_GESTOR_W + COL_STATUS_W + colunas.length * 116;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="min-w-0 space-y-4"
    >
      {/*
        Cabeçalho — mesma estrutura de /kpi/operadores e /kpi/gestor
        (kpi-equipe-section.tsx / kpi-gestor-section.tsx): h1 + linha de
        contexto (aqui: gestor filtrado · data de corte, já que esta página
        não tem "gestor logado" — é a visão de todos os polos) + segunda
        linha com o controle que noutras páginas é o MesSelector. Esta
        página não tem toggle de mês, então a busca por nome ocupa a MESMA
        posição (a "linha do seletor de mês + ações" das outras duas). O
        filtro por gestor continua no header da coluna "Gestor" da tabela
        (inalterado). "Painel do Gestor"/"Operação" e a contagem
        "N operadores" saíram — texto herdado que não tinha equivalente nas
        páginas de referência.
      */}
      <div>
        <div className="pt-4">
          <h1
            className={cn(
              "font-sans text-3xl tracking-tight text-foreground md:text-4xl",
              TITULO_WEIGHT_CLASS,
            )}
          >
            Detalhado Polo
          </h1>
          <p className="font-sans text-muted-foreground pt-3 text-sm font-normal">
            {gestorFiltroNome ?? "Todos os gestores"}
            {dataCorte && (
              <>
                <SubtituloSeparador />
                {`Dados até ${formatDateBR(dataCorte).slice(0, 5)}`}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 pb-4">
          <div className="relative">
            <IconSearch
              size={15}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar operador..."
              aria-label="Buscar operador"
              className="font-sans text-foreground placeholder:text-muted-foreground h-8 w-64 rounded-[var(--radius)] border border-[var(--seg-track-border)] bg-[var(--seg-track)] py-1.5 pr-3 pl-9 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 relative min-w-0">
        {linhas.length === 0 ? (
          <StyledCard withGradient className="p-8 text-center">
            <p className="font-sans text-muted-foreground text-sm">
              Nenhum operador com dados no período.
            </p>
          </StyledCard>
        ) : (
          /*
            Card = KpiFrame (mesmas cantoneiras de /kpi/operadores, "fork
            local de StyledCard" — ver comentário no próprio arquivo, não
            editado). SEM rolagem vertical própria: o card cresce até a
            altura natural da tabela inteira (todas as linhas visíveis), e
            quem rola verticalmente é só a PÁGINA — pedido explícito, ao
            contrário do ajuste anterior (que prendia a altura em 72vh).
            `min-w-0` no container pai acima e aqui: sem isso, o <table> com
            minWidth fixo empurra a largura do próprio flex/grid ancestral
            em vez de ficar contido pelo `overflow-x-auto` (causa do "sair
            da página" resolvida na etapa anterior, continua valendo).

            Rolagem horizontal: só a nativa do container (`scrollbar-tema`,
            `overflow-x-auto`), com o mesmo scroll fluido do navegador. Uma
            barra "flutuante" sincronizada foi tentada numa sessão anterior
            pra facilitar o alcance com a tabela sem limite de altura, mas
            gerava duas barras visíveis ao mesmo tempo e uma rolagem menos
            lisa — removida a pedido, mantendo só a barra nativa do card.
          */
          <KpiFrame className="min-w-0">
            <div
              ref={scrollRef}
              className="scrollbar-tema overflow-x-auto rounded-[var(--radius)] border border-border"
            >
              <table
                className="w-full border-collapse text-sm"
                style={{ minWidth }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th
                      scope="col"
                      className="font-sans text-muted-foreground sticky top-0 left-0 z-30 bg-[var(--background)] px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none"
                      style={{ width: COL_OPERADOR_W, minWidth: COL_OPERADOR_W }}
                    >
                      Operador
                    </th>

                    {/* Coluna "Gestor": sem equivalente em /kpi/operadores
                        (lá a equipe já é de um gestor só). O HEADER INTEIRO é
                        a área de clique do filtro (não só o ícone) — mantido,
                        é a função que não pode se perder. Não cicla
                        ordenação, mesmo padrão de antes. */}
                    <th
                      scope="col"
                      className="font-sans text-muted-foreground sticky top-0 z-30 bg-[var(--background)] p-0 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none"
                      style={{
                        left: COL_OPERADOR_W,
                        width: COL_GESTOR_W,
                        minWidth: COL_GESTOR_W,
                      }}
                    >
                      <Popover open={filtroAberto} onOpenChange={setFiltroAberto}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title="Filtrar por gestor"
                            className={cn(
                              "hover:text-foreground flex w-full cursor-pointer items-center justify-center gap-1.5 px-3 py-2.5 uppercase transition-colors",
                              gestorFiltro && "text-primary",
                            )}
                          >
                            <span>Gestor</span>
                            {gestorFiltro ? (
                              <IconFilterFilled
                                size={13}
                                className="text-primary shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <IconFilter
                                size={13}
                                className="shrink-0 opacity-60"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-64 p-1.5"
                          data-page="kpi-detalhado-polo"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setGestorFiltro(null);
                              setFiltroAberto(false);
                            }}
                            className={cn(
                              "hover:bg-muted/60 flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm normal-case transition-colors",
                              !gestorFiltro && "text-primary font-medium",
                            )}
                          >
                            Todos os gestores
                          </button>
                          <div className="bg-border/60 my-1 h-px" />
                          <div className="scrollbar-tema max-h-64 overflow-y-auto">
                            {gestores.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  setGestorFiltro(g.id);
                                  setFiltroAberto(false);
                                }}
                                className={cn(
                                  "hover:bg-muted/60 flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm normal-case transition-colors",
                                  gestorFiltro === g.id &&
                                    "text-primary font-medium",
                                )}
                              >
                                {g.nome}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </th>

                    {/* Status: sem equivalente em /kpi/operadores. Só
                        exibição, não entra no ciclo de ordenação. */}
                    <th
                      scope="col"
                      className="font-sans text-muted-foreground bg-[var(--background)] px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none"
                      style={{ width: COL_STATUS_W, minWidth: COL_STATUS_W }}
                    >
                      Status
                    </th>

                    {colunas.map((c) => {
                      const ativo = sort?.slug === c.slug;
                      return (
                        <th
                          key={c.slug}
                          scope="col"
                          aria-sort={
                            ativo ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"
                          }
                          tabIndex={0}
                          onClick={() =>
                            setSort((prev) => proximoSort(prev, c.slug))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSort((prev) => proximoSort(prev, c.slug));
                            }
                          }}
                          title="Clique para ordenar (aleatório → ↓ → ↑)"
                          className={cn(
                            "font-sans px-3 py-2.5 text-center text-[13px] font-semibold tracking-[0.04em] whitespace-nowrap uppercase select-none",
                            "hover:text-foreground cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                            ativo ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {c.label}
                          <SortIcon ativo={ativo} dir={sort?.dir ?? null} />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {linhasOrdenadas.map((linha, i) => (
                    <tr
                      key={linha.email}
                      className="group hover:bg-accent transition-colors duration-150 motion-reduce:transition-none"
                      style={{
                        borderBottom:
                          i < linhasOrdenadas.length - 1
                            ? "1px solid color-mix(in srgb, var(--border) 60%, transparent)"
                            : undefined,
                      }}
                    >
                      <td
                        className="font-sans text-foreground sticky left-0 z-10 bg-[var(--background)] group-hover:bg-accent transition-colors duration-150 motion-reduce:transition-none px-3 py-2 text-center font-medium whitespace-nowrap"
                        style={{ width: COL_OPERADOR_W, minWidth: COL_OPERADOR_W }}
                      >
                        {linha.nome}
                      </td>
                      <td
                        className="font-sans text-muted-foreground sticky z-10 bg-[var(--background)] group-hover:bg-accent transition-colors duration-150 motion-reduce:transition-none px-3 py-2 text-center whitespace-nowrap"
                        style={{
                          left: COL_OPERADOR_W,
                          width: COL_GESTOR_W,
                          minWidth: COL_GESTOR_W,
                        }}
                      >
                        {linha.gestorNome}
                      </td>
                      <td
                        className="font-sans text-muted-foreground px-3 py-2 text-center whitespace-nowrap"
                        style={{ width: COL_STATUS_W, minWidth: COL_STATUS_W }}
                      >
                        {linha.statusLabel}
                      </td>
                      {linha.celulas.map((cel) => {
                        const { style, srOnlyLabel } = celulaApresentacao(
                          cel.status,
                          cel.valor === null,
                          false,
                        );
                        return (
                          <td
                            key={cel.slug}
                            className="font-sans px-3 py-2 text-center whitespace-nowrap"
                            style={{ ...style, fontVariantNumeric: "tabular-nums" }}
                          >
                            {cel.valor === null ? (
                              cel.valorTexto ? (
                                <span>{cel.valorTexto}</span>
                              ) : (
                                <span className="text-muted-foreground">N/D</span>
                              )
                            ) : (
                              <>
                                {formatKpiValueLocal(cel.valor, cel.valueType)}
                                {srOnlyLabel && <span className="sr-only"> ({srOnlyLabel})</span>}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {linhasOrdenadas.length === 0 && (
                    <tr>
                      <td
                        colSpan={colunas.length + 3}
                        className="font-sans text-muted-foreground px-4 py-8 text-center text-sm"
                      >
                        Nenhum operador corresponde aos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </KpiFrame>
        )}
      </div>
    </motion.section>
  );
}
