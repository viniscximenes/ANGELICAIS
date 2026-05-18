# REGISTROS — Diário de Bordo

## Objetivo

Painel de registro de ocorrências operacionais ao longo do mês. ADM 
registra todos os casos durante o mês corrente. AUX (e futuramente 
GESTOR) leem registros para contestação de RV e outras análises 
no fim do mês.

A página guarda 2 meses (atual + passado) e apaga automaticamente o 
mais antigo ao virar o mês.

## Rota

`/registros/diario`

## Quem acessa

- **ADM** — registra e visualiza tudo
- **AUX** — visualiza apenas registros onde é o operador alvo (somente leitura, sem botão "Adicionar")
- **GESTOR** — futuro (página separada e mais complexa, fora do escopo desta versão)
- **OP** — sem acesso (redirecionado)

## Lógica de negócio

### Tipos de caso

| Caso | Significado | Tempo |
|---|---|---|
| **Pausa Autorizada** | Gestão autorizou o operador a entrar em pausa específica fora do esperado. No fechamento, esse tempo é descontado do indisp total. | Obrigatório |
| **Fora de Jornada** | Operador não conseguiu completar 06:20:00 por erro de PA. ADM digita o tempo logado real (ex: 05:56:34); sistema calcula o delta (00:23:26) automaticamente. | Obrigatório (tempo logado) |
| **Geral** | Sistema da empresa caiu de forma geral, ou lentidão. Pode ou não ter tempo. | Opcional |
| **Outros** | Registros sem necessidade de contestação (chegou tarde mas completou jornada, problema resolvido, etc). Foco na descrição. | Opcional |

### Jornada padrão

Todo operador é considerado com jornada de **06:20:00** (06h20min00s) diária. 
Valor fixo no código — não configurável por enquanto.

### Cálculo de delta para Fora de Jornada

```
delta = "06:20:00" - tempo_logado_input
```

Exemplo: ADM digita tempo logado `05:56:34` → sistema calcula e armazena:
- `tempo_logado_real`: `05:56:34` (5h56min34s)
- `tempo_a_justificar`: `00:23:26` (23min26s)

Se ADM digitar `06:20:00` ou mais, o delta é `00:00:00` (sem tempo a justificar).

### Operadores ativos

Lista de operadores selecionáveis no formulário de criação: **todos os 
profiles com role OP, AUX ou ADM** (excluindo GESTOR). Mesma lógica 
da monitoria.

### GLPI

Campo opcional em **todos** os tipos de caso. Texto livre 
(ex: "GLPI-12345").

### Descrição

Texto livre, **obrigatório em todos os casos**. É o campo principal 
para contestação. Preserva quebras de linha (`white-space: pre-wrap`).

### Retenção automática

- Sistema mantém apenas **mês atual + mês anterior**.
- Quando vira o mês (ex: vira para Junho), o mês mais antigo (Abril) 
  é apagado automaticamente.
- A limpeza acontece **ao criar um novo registro**: antes de inserir, 
  o sistema verifica se há mais de 2 meses únicos no banco e apaga 
  o excedente.
- Sem botão manual.

## Modelo de dados

### Tabela `diario_registros`

```sql
create table diario_registros (
  id uuid primary key default gen_random_uuid(),
  
  -- Operador alvo
  operator_email text not null,
  
  -- Classificação
  caso text not null check (caso in (
    'pausa_autorizada',
    'fora_jornada',
    'geral',
    'outros'
  )),
  
  -- Data do ocorrido (sempre dentro do mês atual no momento do registro)
  data_ocorrido date not null,
  
  -- Tempos (todos em segundos para facilitar somas)
  -- Para Pausa Autorizada: tempo da pausa
  -- Para Fora de Jornada: tempo_logado_segundos = tempo logado real;
  --                       tempo_a_justificar_segundos = delta calculado (06:20:00 - tempo_logado)
  -- Para Geral: tempo do problema (pode ser null)
  -- Para Outros: pode ser null
  tempo_logado_segundos int,           -- usado apenas em fora_jornada
  tempo_a_justificar_segundos int,     -- usado apenas em fora_jornada (calculado pelo sistema)
  tempo_segundos int,                  -- usado em pausa_autorizada, geral, outros
  
  -- Código GLPI (opcional)
  glpi text,
  
  -- Descrição obrigatória
  descricao text not null,
  
  -- Auditoria
  created_at timestamptz default now(),
  created_by uuid not null references profiles(id),
  updated_at timestamptz default now()
);

create index diario_registros_operator_idx on diario_registros(operator_email);
create index diario_registros_data_idx on diario_registros(data_ocorrido);
create index diario_registros_caso_idx on diario_registros(caso);
```

**Por que campos separados de tempo?** Em `fora_jornada` o ADM digita 
o **tempo logado** (input) e o sistema calcula o **delta** automaticamente. 
Manter ambos no banco permite reconstituir o que foi digitado vs o que 
foi calculado.

### RLS

```sql
alter table diario_registros enable row level security;

-- Leitura: ADM vê tudo
create policy "ADM read all diario"
  on diario_registros for select
  to authenticated
  using ((select is_adm()));

-- Leitura: AUX vê apenas onde é o operador alvo
create policy "AUX read own diario"
  on diario_registros for select
  to authenticated
  using (
    operator_email = (
      select email_corporativo from profiles where id = (select auth.uid())
    )
  );

-- Insert: apenas ADM
create policy "ADM insert diario"
  on diario_registros for insert
  to authenticated
  with check ((select is_adm()));

-- Update: apenas ADM
create policy "ADM update diario"
  on diario_registros for update
  to authenticated
  using ((select is_adm()))
  with check ((select is_adm()));

-- Delete: apenas ADM
create policy "ADM delete diario"
  on diario_registros for delete
  to authenticated
  using ((select is_adm()));
```

## Estrutura visual

### Header

```
Registros / Diário de Bordo
```

### Tabs superiores (mês atual / mês passado)

```
[Mês Atual]  [Mês Passado]
```

Mesma padrão visual das tabs do KPI. Mês padrão = atual.

### Layout ADM

**Topo da página (botão de ação à direita):**

```
Diário de Bordo                              [+ Novo registro]
```

**Conteúdo:** lista de operadores ativos. Cada operador é um card 
clicável com:
- Nome do operador
- Quantidade de registros no mês selecionado
- Distribuição rápida por caso (ex: "3 Pausa · 1 Fora · 2 Geral")
- Chevron à direita

Ordenação: por nome alfabético.

Clicar no operador → abre `/registros/diario/[operator_email]?month=YYYY-MM`

### Layout AUX

Mesmo layout, **sem** o botão "+ Novo registro". Lista de operadores 
contém **apenas o próprio operador** (auto-filtrado pelo RLS).

### Modal de criação (ADM)

```
┌─────────────────────────────────────────────────────────────┐
│  Novo registro                                                │
│                                                                │
│  Operador:        [ Dropdown — todos OP/AUX/ADM ▼ ]           │
│  Caso:            [ Dropdown — 4 opções ▼ ]                    │
│  Data:            [ DD/MM/YYYY — apenas mês corrente ]         │
│                                                                │
│  ─── Campos variáveis conforme caso selecionado ───            │
│                                                                │
│  [Pausa Autorizada]                                            │
│  Tempo da pausa:  [ HH:MM:SS ]                                 │
│                                                                │
│  [Fora de Jornada]                                             │
│  Tempo logado:    [ HH:MM:SS ]                                 │
│  Tempo a justificar (calculado):  00:23:26                     │
│                                                                │
│  [Geral]                                                       │
│  Tempo do problema:  [ HH:MM:SS — opcional ]                   │
│                                                                │
│  [Outros]                                                      │
│  (sem campo de tempo)                                          │
│                                                                │
│  ─── Campos comuns ───                                         │
│                                                                │
│  Código GLPI:     [ texto — opcional ]                         │
│                                                                │
│  Descrição:                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  (textarea grande, preserva quebras de linha)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
│                              [ Cancelar ]  [ Criar registro ]  │
└─────────────────────────────────────────────────────────────┘
```

**Validações:**
- Operador obrigatório
- Caso obrigatório
- Data obrigatória, dentro do mês corrente
- Tempo obrigatório em Pausa Autorizada e Fora de Jornada
- Tempo opcional (pode estar vazio) em Geral e Outros
- GLPI opcional sempre
- Descrição obrigatória sempre
- Formato HH:MM:SS para tempos (input com máscara ou input separado por unidade)

### Página do operador `/registros/diario/[operator_email]`

```
← Voltar para lista

Diário de [Nome do Operador]
operator@alloha.com · Maio/2026

[Tabs Mês Atual / Mês Passado — mesmo estado]

┌─ Registro #1 ──────────────────────────────────────────────┐
│  Pausa Autorizada · 14/05/2026 · 00:15:00                    │
│  GLPI: —                                                       │
│                                                                │
│  Descrição:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Operador autorizado a fazer pausa de 15 minutos por    │ │
│  │  consulta médica.                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Copiar descrição]                  [Editar]  [Apagar]       │
└────────────────────────────────────────────────────────────┘

┌─ Registro #2 ──────────────────────────────────────────────┐
│  Fora de Jornada · 12/05/2026                                 │
│  Tempo logado: 05:56:34 · A justificar: 00:23:26              │
│  GLPI: GLPI-12345                                              │
│                                                                │
│  Descrição:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PA do operador travou às 09:15 e só voltou às 09:40,    │ │
│  │  com perda de 25 minutos de jornada.                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Copiar descrição]                  [Editar]  [Apagar]       │
└────────────────────────────────────────────────────────────┘
```

- Ordenação: **mais recente primeiro** (data desc, depois created_at desc)
- Lista plana (sem agrupamento por caso)
- Cada registro é um card com:
  - Badge do caso (cor diferente por tipo)
  - Data
  - Tempo (formato conforme tipo de caso)
  - GLPI (se houver)
  - Descrição (com `white-space: pre-wrap`)
  - Botão "Copiar descrição"
  - Botões "Editar" e "Apagar" (apenas ADM)
- Empty state: "Sem registros para este operador neste mês."

### Cores dos badges por caso

| Caso | Cor |
|---|---|
| Pausa Autorizada | warning (laranja/amarelo) |
| Fora de Jornada | danger (vermelho) |
| Geral | primary (roxo) |
| Outros | muted-foreground (cinza) |

### Botão "Copiar descrição"

Copia **apenas o texto da descrição** (sem header, sem data, sem tempo).

Preserva quebras de linha originais. Sem formatação adicional.

Comportamento visual: igual ao do botão de copiar da monitoria (toast 
"Copiado", check verde por 2s).

### Edição/exclusão (apenas ADM)

- **Editar:** abre o mesmo modal de criação preenchido com os dados 
  atuais. ADM ajusta e salva.
- **Apagar:** `confirm()` nativo: "Apagar este registro? Esta ação não 
  pode ser desfeita." → delete.

## Fluxos principais

### ADM cria registro

1. ADM clica em "+ Novo registro" (na lista geral ou na página do operador)
2. Modal abre
3. ADM seleciona operador, caso, data
4. Campos variáveis aparecem conforme caso
5. ADM preenche tempo (se aplicável), GLPI (opcional), descrição
6. Sistema valida
7. Se for `fora_jornada`: sistema calcula `tempo_a_justificar` antes de salvar
8. Sistema aplica retenção (se já tinha 2 meses únicos, apaga o mais antigo)
9. Salva no banco
10. Toast "Registro criado"
11. Lista atualiza

### AUX consulta

1. AUX entra em `/registros/diario`
2. Vê a si próprio na lista (auto-filtrado pelo RLS)
3. Clica no nome
4. Vê os registros do próprio mês
5. Pode mudar para mês passado nas tabs
6. Pode copiar descrições (mas não editar/apagar)

### Virada de mês (automática)

1. ADM cria registro novo em Junho
2. Sistema vê que tem dados de Abril, Maio, Junho (3 meses)
3. Apaga todos os registros de Abril
4. Insere o novo
5. Toast normal de sucesso

## Server actions

Criar em `src/lib/diario/actions/`:

- `create-diario-action.ts` — Cria novo registro (ADM only)
- `update-diario-action.ts` — Edita um registro (ADM only)
- `delete-diario-action.ts` — Apaga (ADM only)

Funções de leitura em `src/lib/diario/`:

- `get-operators-with-counts.ts` — Lista de operadores com contagem de registros no mês
- `get-diario-for-operator.ts` — Registros de um operador em um mês
- `get-diario-by-id.ts` — Detalhe único (pra edição)
- `apply-retention.ts` — Helper que apaga mês mais antigo se passar de 2

## Helpers

Criar em `src/lib/diario/`:

- `time-format.ts` — Funções `formatSecondsAsHHMMSS(s)`, 
  `parseHHMMSSToSeconds(str)`, `calcDeltaFromJornada(tempoLogadoSegundos)` 
  com JORNADA_SEGUNDOS = 22800 (6h20m em segundos)
- `caso-labels.ts` — Map de slug → label e cor

## Componentes

`src/components/registros/diario/`:

- `diario-tabs.tsx` — Tabs Mês Atual / Mês Passado
- `diario-operators-list.tsx` — Lista de operadores com contagens
- `diario-operator-row.tsx` — Linha individual da lista
- `diario-records-list.tsx` — Lista de registros de um operador
- `diario-record-card.tsx` — Card individual de um registro
- `new-diario-modal.tsx` — Modal de criação
- `diario-time-input.tsx` — Input de HH:MM:SS (3 inputs separados ou máscara)
- `caso-badge.tsx` — Badge colorido por caso
- `delete-diario-button.tsx` — Botão de apagar com confirmação
- `copy-description-button.tsx` — Botão de copiar descrição

## Sidebar

Adicionar sub-item à seção "Registros" existente:

```
📂 Registros
   Monitoria
   Diário de Bordo  ← novo
```

Visível para ADM e AUX (mesma permissão `view_monitoria` ou criar 
nova `view_diario` — decidir na implementação).

## Estados

### Loading
- Lista de operadores: skeleton de cards
- Lista de registros: skeleton de cards
- Modal: spinner no botão

### Erro
- Falha de leitura: card central "Erro ao carregar"
- Falha ao salvar: toast vermelho

### Vazio
- Lista geral sem registros no mês: "Nenhum registro neste mês ainda."
- Operador sem registros: "Sem registros para [Nome] neste mês."

## Animações

- PageTransition no carregamento
- Modal com fade + scale
- Lista de operadores e registros em stagger leve

## Acessibilidade

- Modal com `role="dialog"` e foco gerenciado
- Tabs com `role="tablist"` e `aria-selected`
- Inputs de tempo com `aria-label` claro
- Botões de copiar com `aria-label` e estado de feedback

## Responsividade

- **Desktop:** layout completo, cards lado a lado em colunas
- **Tablet:** cards em coluna única
- **Mobile:** cards empilhados, modal full-screen

## Observações importantes

- Retenção é automática, sem botão manual
- AUX vê apenas o que é dele
- Edição preserva data e operador (não troca em edit)
- Jornada de 06:20:00 é fixa por enquanto
- Não há integração com Excel/API — gestora copia manualmente

## Versão

1.0 — criada antes da implementação.