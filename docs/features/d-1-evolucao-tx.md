# D-1 — Evolução da TX da Equipe

## Objetivo

Adicionar ao D-1 Consolidado um sistema automático de **snapshot da TX da 
equipe** ao longo do dia. Cada upload de CSV gera um ponto na linha do 
tempo; um gráfico abaixo da tabela mostra a evolução em tempo quase real.

O snapshot é **automático e silencioso** — o ADM não clica em "salvar". 
Quando o histórico é colado no Teams, gestora e operadores veem **a 
evolução da TX no dia**, não só o número final.

Histórico **diário** (reinicia toda madrugada). Sem custo de manutenção 
para o ADM.

## Princípios

- **Automático**: snapshot acontece junto do upload do CSV
- **Anti-ruído**: substitui snapshots criados nos últimos 10 minutos (não duplica)
- **Reset diário**: histórico do dia anterior é apagado às 00:05 BR
- **PNG conjunto**: ao copiar imagem, tabela + gráfico vão juntos em um único PNG
- **Gráfico adaptativo**: segue o tema atual do usuário (dark ou light)

## Modelo de dados

### Tabela `d1_evolucao_tx`

```sql
create table d1_evolucao_tx (
  id uuid primary key default gen_random_uuid(),
  tx_value numeric(5, 2) not null,           -- TX da equipe, ex: 64.30
  report_time text not null,                  -- HH:MM (ex: "14:40")
  created_at timestamptz not null default now()
);

create index d1_evolucao_tx_created_at_idx on d1_evolucao_tx(created_at desc);
```

Sem RLS — todos os usuários autenticados leem o histórico do dia. Apenas 
o backend (com service role) escreve.

### Limpeza automática via pg_cron

```sql
-- Habilita pg_cron (Supabase Dashboard → Database → Extensions → pg_cron)

-- Job: apaga snapshots de dias anteriores às 03:05 UTC (= 00:05 BR)
select cron.schedule(
  'limpar-evolucao-tx-diaria',
  '5 3 * * *',
  $$
    delete from d1_evolucao_tx 
    where created_at < (now() at time zone 'America/Sao_Paulo')::date
  $$
);
```

Histórico fica visível só do dia atual. Custa zero, sem cron externo.

## Fluxo

### Quando o ADM cola CSV em `/d-1/consolidado`

1. Sistema processa o CSV normalmente (já existe)
2. Envia pro Google Sheets via API (já existe)
3. Aguarda Sheets recalcular fórmulas (já existe)
4. **[NOVO]** Lê a TX consolidada da equipe (célula J2 ou similar)
5. **[NOVO]** Snapshot lógica anti-duplicação:
   - Busca o snapshot mais recente do dia
   - Se foi criado nos **últimos 10 minutos** → atualiza (UPDATE) tx_value e report_time
   - Se foi criado há **mais de 10 minutos** → cria novo (INSERT)
   - Se não há nenhum snapshot hoje → cria novo
6. Página recarrega — gráfico atualiza

### report_time e exatidão

- Sistema captura o horário **exato** do momento do upload (HH:MM em horário BR)
- Sem arredondamento — se cola às 14:23, ponto é 14:23
- Honesto com o fluxo real do operador

## Gráfico de evolução

### Localização

- **Abaixo de TUDO** no D-1 Consolidado (full-width, após o par tabela+dropzone)
- Container `elevation-1`, padding generoso
- Mesma largura do par tabela+dropzone (ou um pouco mais largo se ficar melhor visualmente)

### Tipo

Gráfico de linha (Recharts):
- Eixo X: report_time (HH:MM)
- Eixo Y: TX (0–100%)
- 1 linha apenas — TX da equipe (sem operadores individuais)
- Pontos visíveis em cada snapshot
- Label discreto em cada ponto com o valor da TX (ex: "64.3%")
- SEM label de hora flutuando em cima dos pontos (hora vai no eixo X)

### Cores (3 zonas — meta dupla)

| Faixa | Cor |
|---|---|
| TX < 60% | `var(--danger)` (vermelho) |
| 60% ≤ TX < 66% | `var(--warning)` (amarelo) |
| TX ≥ 66% | `var(--success)` (verde) |

**Aplicação visual:**
- **Pontos** (círculos sobre a linha): cor sólida conforme a faixa
- **Segmentos da linha**: gradiente — cor do ponto de origem → cor do ponto de destino
- Se tudo está em uma única faixa, linha sólida na cor

### Comportamento

- Atualiza automaticamente após upload de CSV (revalidatePath)
- Animação de entrada: linha "desenha" da esquerda pra direita (duração 800ms)
- Sem hover/tooltip — labels diretos cumprem o papel (PNG-friendly)
- Eixo Y começa em 0% e vai até 100% (escala fixa pra comparação ser justa)
- Se houver apenas 1 ponto, mostra só o ponto (sem linha)

### Estado vazio

Quando ainda não há nenhum snapshot no dia (antes do primeiro upload):

```
┌────────────────────────────────────────────┐
│                                              │
│        Sem dados ainda hoje.                │
│   O gráfico aparecerá após o primeiro       │
│       upload de CSV consolidado.            │
│                                              │
└────────────────────────────────────────────┘
```

## PNG conjunto (Copiar como imagem)

### Comportamento atual

Hoje o botão "Copiar como imagem" gera **um PNG da tabela**, junto com 
texto formatado (REPORT CONSOLIDADO + bloco URGENTE).

### Novo comportamento

Gerar **um único PNG** que contém:

1. Tabela compacta (atual)
2. Gráfico de evolução (novo)

Empilhados verticalmente, sem espaço extra entre eles.

### Implementação técnica

Hoje `domToPng(target)` captura apenas o nó da tabela. Mudar para capturar 
um wrapper que inclui ambos:

```tsx
<div ref={wrapperRef}>
  <EquipeTable ... />
  <EvolucaoGrafico ... />
</div>
```

E `domToPng(wrapperRef.current)` exporta tudo junto.

### Caso o gráfico esteja vazio

Se não há snapshots hoje (estado vazio), **não incluir o gráfico no PNG** 
— exporta só a tabela. Empty state ficaria estranho na imagem.

## Funções de leitura

### `src/lib/d1/evolucao/get-evolucao-tx-hoje.ts`

```typescript
export async function getEvolucaoTxHoje(): Promise<EvolucaoSnapshot[]> {
  // Retorna snapshots do dia atual ordenados por report_time
}
```

### Tipo

```typescript
export type EvolucaoSnapshot = {
  id: string;
  txValue: number;          // 64.30
  reportTime: string;       // "14:40"
  createdAt: string;
};
```

## Server action

### `src/lib/d1/evolucao/actions/save-evolucao-action.ts`

Chamada internamente pelo fluxo de upload do CSV (não exposta como botão).

```typescript
"use server";

export async function saveEvolucaoTxAction(
  txValue: number,
): Promise<{ success: boolean; error?: string }> {
  // 1. Valida que é ADM (manage_system)
  // 2. Calcula report_time (HH:MM BR atual)
  // 3. Busca último snapshot do dia
  // 4. Decide UPDATE (se < 10min) ou INSERT (se >= 10min ou não existe)
  // 5. Executa
  // 6. revalidatePath("/d-1/consolidado")
}
```

## Componentes

### `src/components/d-1/evolucao/evolucao-grafico.tsx`

Wrapper que orquestra o gráfico:
- Recebe lista de snapshots como prop
- Calcula cor de cada ponto/segmento conforme TX
- Renderiza Recharts LineChart
- Empty state quando array vazio

### `src/components/d-1/evolucao/evolucao-line-chart.tsx`

Componente Recharts isolado:
- Recebe data formatada
- Configura eixos, pontos, linha
- Função `getColorForTx(tx: number)` aplica as 3 zonas

### Integração no fluxo do upload

O componente que processa o CSV (provavelmente em `src/components/d-1/csv-dropzone.tsx` 
ou similar) deve chamar `saveEvolucaoTxAction(txDaEquipe)` após sucesso 
do upload do Sheets.

## Helper de cor

### `src/lib/d1/evolucao/get-color-for-tx.ts`

```typescript
export function getColorForTx(tx: number): "danger" | "warning" | "success" {
  if (tx < 60) return "danger";
  if (tx < 66) return "warning";
  return "success";
}

export function getColorCssVar(tx: number): string {
  const zone = getColorForTx(tx);
  return `var(--${zone})`;
}
```

## Estados

### Loading inicial
- Skeleton do gráfico (retângulo com shimmer)

### Salvando snapshot
- Sem indicador visual extra — já existe o feedback do upload do CSV

### Erro ao salvar snapshot
- Log no console
- Toast vermelho discreto "Evolução não salva — visualização ainda funciona"
- NÃO bloqueia o upload (snapshot é complementar)

### Vazio
- Mensagem amigável no lugar do gráfico

## Animações

- Entrada do gráfico: linha desenha de esquerda pra direita (Recharts `animationDuration={800}`)
- Pontos aparecem com pequeno delay após a linha (stagger)

## Acessibilidade

- Gráfico tem `<title>` e `<desc>` no SVG explicando os dados
- Tabela equivalente (sr-only) com mesmos dados pra screen readers

## Responsividade

- **Desktop:** gráfico full-width abaixo do par tabela+dropzone
- **Tablet:** mesma largura, altura proporcional
- **Mobile:** gráfico ocupa 100% da largura, altura reduzida

## Observações importantes

- **Anti-duplicação 10min** evita gráfico sujo quando ADM cola CSV errado e refaz
- **Reset 00:05 BR** garante histórico sempre limpo do dia atual
- **Snapshot só com manage_system** — operadores não podem manipular
- **Falha silenciosa**: se Supabase estiver fora, upload do CSV não quebra
- **Sem cron externo** — pg_cron do próprio Supabase resolve a limpeza

## Versão

1.0 — criada antes da implementação.