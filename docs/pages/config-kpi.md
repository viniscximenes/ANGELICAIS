# Configurações — KPI

## Objetivo

Permitir ao administrador (ADM) configurar todos os parâmetros 
necessários para o funcionamento do módulo KPI: definir metas dos 
KPIs principais e secundários, e gerenciar os nomes dos cabeçalhos 
que o sistema procura na planilha do planejamento ao receber dados 
via colagem (Ctrl+V).

A página é a **fundação** do sistema KPI — sem ela cadastrada, as 
páginas `/bases/kpi` (colar dados) e `/kpi/painel` (visualizar) não 
funcionam.

## Rota

`/config/kpi`

## Quem acessa

- **ADM** — único role com acesso (permissão `manage_system`)
- **OP / AUX / GESTOR** — redirecionados para `/d-1/consolidado` ou `/gestor/d-1`

## Lista de KPIs do sistema

### Principais (7) — aparecem nos 7 cards grandes do painel do operador

| # | Nome interno | Tipo | Direção | Coloração |
|---|---|---|---|---|
| 1 | Tx. Retenção Bruta (%) | percentual | maior é melhor | 3 faixas (config) |
| 2 | Pedidos | número | maior é melhor | binário (meta da coluna) |
| 3 | Churn | número | menor é melhor | binário (meta da coluna) |
| 4 | % Variação Ticket | percentual (sempre negativo) | mais próximo de 0 | sem cor |
| 5 | TMA | tempo HH:MM:SS | menor é melhor | binário (config) |
| 6 | ABS (%) | percentual | menor é melhor | binário (config) |
| 7 | Indisp Total (%) | percentual | menor é melhor | binário (config) |

**Metas iniciais (configuráveis):**
- Tx. Retenção Bruta: vermelho < 57% / amarelo 57-66% / verde > 66%
- TMA: verde ≤ 12:11
- ABS: verde ≤ 5%
- Indisp Total: verde ≤ 14,5%

**Pedidos e Churn:** meta não é configurável aqui — vem de duas colunas específicas da planilha do operador (`Forecast Pedidos Mês` e `Forecast Churn Mês`). O sistema lê essas colunas no momento da colagem e compara linha a linha.

### Secundários (9) — aparecem na tab "secundários" do painel

| # | Nome interno | Tipo | Direção | Coloração |
|---|---|---|---|---|
| 1 | Tx. Retenção Líquida 15d (%) | percentual | maior é melhor | binário (config) |
| 2 | Atendidas | número | maior é melhor | sem cor |
| 3 | Transfer (%) | percentual | menor é melhor | binário (config) |
| 4 | Short Call (%) | percentual | menor é melhor | binário (config) |
| 5 | Rechamada D+7 (%) | percentual | menor é melhor | binário (config) |
| 6 | CSAT | número | maior é melhor | sem cor |
| 7 | NR17 (%) | percentual | sem regra | sem cor |
| 8 | Pessoal (%) | percentual | sem regra | sem cor |
| 9 | Outras Pausas (%) | percentual | sem regra | sem cor |

**Metas iniciais (configuráveis):**
- Transfer: verde ≤ 3%
- Short Call: verde ≤ 2%
- Rechamada D+7: verde ≤ 19%

### KPIs com observações especiais

- **Nomes com quebra de linha na planilha:** "Tx. Retenção Bruta (%)", "Tx. Retenção Líquida 15d (%)", "% Variação Ticket", "Rechamada D+7 (%)". O parser ao ler o cabeçalho deve **normalizar quebras de linha** (substituir `\n` por espaço) antes de comparar com os nomes cadastrados.

- **Texto livre:** o sistema também armazena (mas não exibe nesta v1) os valores das colunas `Colaborador` (email), `Gestor`, e `Status` (ativo/férias/desligado/licença) — guardados para uso futuro em histórico.

## Modelo de dados

### Tabela `kpi_definitions` (Supabase)

Linha por KPI configurado. Todas as definições já existentes são "seeded" no banco — o ADM apenas edita.

```sql
create table kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                  -- identificador interno: "tx_retencao_bruta"
  display_name text not null,                 -- "Tx. Retenção Bruta (%)"
  group_type text not null check (group_type in ('principal', 'secundario')),
  display_order int not null,                 -- ordem dentro do grupo
  value_type text not null check (value_type in ('percent', 'number', 'time', 'percent_negative')),
  direction text not null check (direction in ('higher_better', 'lower_better', 'closer_to_zero', 'none')),
  coloring_type text not null check (coloring_type in ('three_tier', 'binary', 'none', 'per_row')),
  -- Thresholds: usados conforme coloring_type
  threshold_red numeric,                      -- limite vermelho (binary ou three_tier)
  threshold_yellow numeric,                   -- limite amarelo (three_tier apenas)
  threshold_green numeric,                    -- limite verde (three_tier apenas; binary usa threshold_red)
  -- Para coloring_type 'per_row' (Pedidos, Churn): nome das colunas que contêm a meta
  meta_column_name text,                      -- ex: "Forecast Pedidos Mês"
  expected_header text not null,              -- cabeçalho atual cadastrado (vivo, atualizável)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index kpi_definitions_group_order_idx on kpi_definitions(group_type, display_order);
```

**RLS:**
```sql
alter table kpi_definitions enable row level security;

-- Leitura: qualquer usuário autenticado (OP precisa pra ver metas)
create policy "Authenticated users can read kpi definitions"
  on kpi_definitions for select
  to authenticated
  using (true);

-- Edição: apenas ADM
create policy "ADM can update kpi definitions"
  on kpi_definitions for update
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'ADM'
  );
```

### Tipos TypeScript

```typescript
export type KpiGroupType = "principal" | "secundario";
export type KpiValueType = "percent" | "number" | "time" | "percent_negative";
export type KpiDirection = "higher_better" | "lower_better" | "closer_to_zero" | "none";
export type KpiColoringType = "three_tier" | "binary" | "none" | "per_row";

export type KpiDefinition = {
  id: string;
  slug: string;
  displayName: string;
  groupType: KpiGroupType;
  displayOrder: number;
  valueType: KpiValueType;
  direction: KpiDirection;
  coloringType: KpiColoringType;
  thresholdRed: number | null;
  thresholdYellow: number | null;
  thresholdGreen: number | null;
  metaColumnName: string | null;
  expectedHeader: string;
};
```

## Estrutura visual

### Header
- Título "Configurações" + subtítulo "/ KPI"

### Tabs
Três abas, navegação client-side:
1. **PRINCIPAIS** (default)
2. **SECUNDÁRIOS**
3. **MAPEAMENTO**

Mesmo estilo das tabs do `/d-1` (pílulas com cor violeta na ativa).

### Aba PRINCIPAIS

Lista de 7 KPIs (mesma ordem da tabela acima), cada um renderizado como **linha rica** dentro de um wrapper `elevation-1`. Não é tabela tradicional porque cada KPI tem campos diferentes.

**Estrutura de cada linha:**

```
┌───────────────────────────────────────────────────────────────┐
│ 01 · Tx. Retenção Bruta (%)                          [ícone]  │
│ tipo: percentual  •  maior é melhor                            │
│                                                                │
│ Coloração: 3 faixas                                            │
│ 🔴 abaixo de  [ 57.0 ]%      ←  vermelho                       │
│ 🟡 entre  57.0%  e  [ 66.0 ]%   amarelo                        │
│ 🟢 acima de  66.0%               verde                         │
│                                                                │
│                                              [Salvar]          │
└───────────────────────────────────────────────────────────────┘
```

**Para KPIs binários (TMA, ABS, Indisp Total) e secundários binários:**

```
┌───────────────────────────────────────────────────────────────┐
│ 05 · TMA                                              [ícone]  │
│ tipo: tempo HH:MM:SS  •  menor é melhor                        │
│                                                                │
│ Coloração: binária                                             │
│ 🟢 verde se valor ≤  [ 12:11 ]                                 │
│ 🔴 vermelho caso contrário                                     │
│                                                                │
│                                              [Salvar]          │
└───────────────────────────────────────────────────────────────┘
```

**Para Pedidos e Churn:**

```
┌───────────────────────────────────────────────────────────────┐
│ 02 · Pedidos                                          [ícone]  │
│ tipo: número  •  maior é melhor                                │
│                                                                │
│ Meta por linha (vem da planilha)                               │
│ Coluna usada como meta: "Forecast Pedidos Mês"                 │
│                                                                │
│ (nada editável aqui — a coloração compara linha a linha)       │
└───────────────────────────────────────────────────────────────┘
```

**Para % Variação Ticket e KPIs "sem cor":**

```
┌───────────────────────────────────────────────────────────────┐
│ 04 · % Variação Ticket                                [ícone]  │
│ tipo: percentual (sempre negativo)  •  mais próximo de 0       │
│                                                                │
│ Sem coloração                                                  │
│ Apenas exibido como valor numérico nos cards.                  │
└───────────────────────────────────────────────────────────────┘
```

**Botão "Salvar" por linha:** clicar valida os inputs e persiste só essa definição.

### Aba SECUNDÁRIOS

Mesma estrutura da aba PRINCIPAIS, com os 9 KPIs secundários.

### Aba MAPEAMENTO

Lista de TODOS os 16 KPIs (principais + secundários), em ordem. Cada linha mostra:

```
┌───────────────────────────────────────────────────────────────┐
│  Tx. Retenção Bruta (%)                                        │
│  Cabeçalho esperado:                                           │
│  [ Tx. Retenção                                               ] │
│  [ Bruta (%)                                                  ] │
│                                              [Salvar]          │
└───────────────────────────────────────────────────────────────┘
```

**Por que dois campos de input?**

Vários cabeçalhos da planilha do planejamento vêm com quebra de linha embutida. O input precisa permitir editar exatamente como aparece (multilinha). Recomenda-se um `<textarea>` em vez de `<input>`.

**Validação:**
- Se o ADM apagar todo o conteúdo do campo, mostrar erro "cabeçalho obrigatório"
- Quando salvar, o sistema normaliza o cabeçalho (trim + lowercase) para comparações futuras

## Fluxos principais

### Inicialização (seeding) dos KPIs

Os 16 KPIs já vêm pré-cadastrados no banco via SQL migration (rodada uma única vez). O ADM nunca cria/remove um KPI pela UI — apenas edita as definições existentes.

**Por que não permitir criar/remover via UI:** os 16 KPIs estão hardcoded no resto do sistema (visualização, parsing). Adicionar um novo exige código novo. Mantém a UI simples e segura.

Se no futuro precisar de um KPI 17, faz via migration SQL + commit no código.

### Edição de meta

1. ADM acessa `/config/kpi`
2. Clica na aba desejada (PRINCIPAIS ou SECUNDÁRIOS)
3. Edita os campos da linha do KPI
4. Clica em "Salvar"
5. Server action valida e atualiza `kpi_definitions` via Supabase
6. Toast verde "Salvo"

**Sem confirmação modal** — edição de meta é operação leve e reversível (basta editar de novo).

### Edição de cabeçalho (Mapeamento)

1. ADM acessa aba MAPEAMENTO
2. Edita o textarea do cabeçalho esperado
3. Clica em "Salvar"
4. Sistema atualiza `expected_header` no banco
5. Próxima vez que o ADM colar dados em `/bases/kpi`, o sistema vai procurar pelo novo nome

### Integração com `/bases/kpi`

Quando o ADM cola dados em `/bases/kpi`:
1. Sistema lê primeira linha (cabeçalhos)
2. Para cada KPI em `kpi_definitions`, procura `expected_header` na linha (normalizado)
3. **Se acha:** mapeia coluna → KPI
4. **Se não acha:** marca KPI como "não encontrado"
5. Mostra modal: "Não achei estes KPIs: [lista]. Edite o cabeçalho esperado pra cada um:"
6. ADM edita os campos no modal e clica "Tentar de novo"
7. Sistema relê o cabeçalho com os nomes novos
8. Se tudo OK, salva os dados. Se ainda faltar, repete o modal.

Os nomes editados no modal são **persistidos** automaticamente em `kpi_definitions` (mesma efeito de editar pela aba MAPEAMENTO).

## Decisões técnicas

### Por que não permitir criar/remover KPIs via UI?

Cada KPI tem características próprias hardcoded no front (tipo de input, validação, formato de exibição nos cards do painel). Permitir "criar do nada" exige construir um sistema genérico complexo — over-engineering pro caso. Mantém-se enxuto.

### Por que `coloring_type` em vez de inferir da `direction`?

Direção e coloração não são a mesma coisa:
- `higher_better` pode ser `none` (CSAT não tem cor)
- `lower_better` pode ser `three_tier` (Tx Retenção Bruta tem 3 faixas)
- `per_row` é um modo especial pra Pedidos e Churn

Separar deixa explícito e permite mudanças futuras (ex: dar coloração ao CSAT depois) sem refatorar.

### Por que threshold como `numeric` no banco?

Vários thresholds são percentuais (57.0), mas TMA é tempo (12:11). Armazenar tudo como `numeric` exige conversão:
- Percentuais: armazenar 57.0 representa 57%
- Tempos: armazenar **segundos totais** (12:11 = 731s). UI converte na exibição.

Alternativa rejeitada: coluna `text` com formato variável. Pior pra queries.

### Salvar por linha ou em lote?

Salvar **por linha**. Razões:
- ADM tipicamente edita um KPI por vez
- Permite feedback imediato ("Salvo")
- Evita risco de perder edições se a página crashar antes do salvamento final

### Por que `<textarea>` no Mapeamento?

Cabeçalhos da planilha podem ter `\n` embutido. Um `<input>` single-line não permite digitar/preservar quebras. Textarea com `rows={2}` resolve.

## Pontos de atenção

### Validação de input

- **Thresholds percentuais:** entre -100 e 100 (suporta % negativos)
- **Thresholds de tempo:** formato HH:MM:SS, regex `^\d{1,2}:\d{2}:\d{2}$`
- **Mapeamento:** não pode ser string vazia. Mínimo 1 caractere visível depois do trim.

### Concorrência

Se dois ADMs editarem ao mesmo tempo (raro mas possível), última escrita ganha (last-write-wins). Sem locks otimistas nesta v1.

### Permissão dupla (UI + server)

- UI: redirect se role !== ADM
- Server action: valida `can(role, "manage_system")` antes de qualquer UPDATE

### Sobre KPIs sem coloração nem direção (NR17, Pessoal, Outras Pausas)

Esses KPIs aparecem nos cards do painel apenas como **valor informativo**, sem destaque colorido. A configuração deles na aba SECUNDÁRIOS mostra:

```
06 · NR17 (%)
tipo: percentual  •  direção: nenhuma
Coloração: nenhuma
Apenas exibido como valor.
```

Sem campos editáveis. A linha existe na UI apenas pra completude — o ADM vê todos os KPIs em um lugar.

### Quebra de linha nos nomes

A normalização de cabeçalho pro mapeamento usa:
```typescript
function normalizeHeader(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")  // quebra de linha → espaço
    .replace(/\s+/g, " ")       // múltiplos espaços → um só
    .trim()
    .toLowerCase();
}
```

Cabeçalho cadastrado e cabeçalho colado passam pela mesma função antes de comparar.

## Estados

### Loading
Skeleton das 16 linhas (estrutura cinza com shimmer).

### Erro
- **Falha de leitura do banco:** card central "Erro ao carregar configurações. Tentar novamente."
- **Falha ao salvar:** toast vermelho "Não foi possível salvar"

### Sucesso
Toast verde "Salvo" após cada salvamento. Sem reload da página.

## Animações de entrada

Tabs aparecem em fade-up no carregamento.
Linhas dos KPIs em stagger leve (cada uma 0.05s de delay).

## Acessibilidade

- Tabs com `role="tablist"` e `role="tab"` (mesmo padrão das tabs do D-1)
- Inputs com `<label>` associado
- Botão "Salvar" com `aria-busy` durante o save
- Foco visível em todos os elementos interativos

## Responsividade

- **Desktop (≥ 1024px):** layout completo, sidebar visível
- **Tablet (640-1023px):** linhas se ajustam, inputs ocupam linha cheia
- **Mobile (< 640px):** mesmo do tablet (sem comportamento especial)

## Observações

- Esta é a **primeira página** com escrita real em Supabase pra dados não-auth. Estabelece o padrão pras próximas (`/bases/kpi`, `/kpi/painel`).
- A página é a **única fonte da verdade** dos KPIs do sistema. Tudo que rodar depois (mapeamento, parsing, exibição) depende dela.
- Reaproveitar `Tabs` ou criar nova versão? Decisão na implementação. Se o componente `D1Tabs` for genérico o suficiente, dá pra parametrizar.

## Versão

1.0 — criada antes da implementação da tabela `kpi_definitions` no Supabase.