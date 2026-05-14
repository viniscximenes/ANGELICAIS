# BASES — KPI

## Objetivo

Permitir ao administrador (ADM) colar dados de KPI exportados da planilha do planejamento (via Ctrl+V) e armazenar esses dados como snapshot mensal acumulado. O sistema usa a configuração de `kpi_definitions` para identificar quais colunas extrair, ignora os operadores não cadastrados em `profiles`, e mantém histórico dos últimos 12 meses (apaga o mais antigo automaticamente ao chegar um mês novo).

Esta página é a fonte de alimentação dos dados que aparecem em `/kpi/painel`.

## Rota

`/bases/kpi`

## Quem acessa

- **ADM** — único role com acesso (permissão `manage_base`)
- **AUX** — também tem `manage_base`, então também acessa
- **OP / GESTOR** — redirecionados

## Lógica de negócio

### O que é um "snapshot mensal acumulado"

Ao contrário do D-1 (que é o dado do dia anterior), o KPI representa o **acumulado do mês até o momento da colagem**. 

Exemplo:
- Dia 12 de Maio: ADM cola, valores representam de 1 a 11 de maio
- Dia 13 de Maio: ADM cola, valores representam de 1 a 12 de maio (sobrescreve dia 12)
- Dia 1 de Junho: ADM cola, agora começa Junho (Maio fica fechado pelo último valor)

### Quem é considerado "operador" no sistema

A planilha do planejamento contém TODOS os operadores da empresa (~147). O sistema:

1. Identifica o operador pela coluna **Colaborador** (espera o email corporativo `@alloha.com`)
2. **Salva todos** no banco, mesmo que ainda não estejam cadastrados em `profiles`
3. O painel `/kpi/painel` mostra apenas operadores cadastrados em `profiles`
4. Quando um operador novo é adicionado em `profiles`, ele passa a aparecer no painel **com histórico retroativo** (se houver dados de meses passados)

### Período do snapshot (data de corte)

Cada snapshot tem uma **data de referência** que indica até quando os dados são válidos. Por padrão, o sistema usa a data de **ontem** (D-1), mas o ADM pode escolher outra data no momento da colagem.

Exemplo:
- ADM cola em 14 de maio → data padrão sugerida: 13 de maio
- ADM pode editar para qualquer data válida (geralmente dentro do mês corrente)
- A data é salva junto com o snapshot

### Sobrescrita de dados

A cada colagem para o **mesmo mês**, os dados anteriores daquele mês são sobrescritos. A chave única é `(operador, mes_ref, kpi_slug)`. Não há histórico diário — só o último valor colado vale.

### Retenção de histórico

O sistema mantém os **últimos 12 meses**. Quando um mês novo é detectado (que ainda não existe no banco), o sistema:

1. Verifica quantos meses únicos existem
2. Se passou de 12, identifica o **mais antigo** e o apaga
3. Insere o novo mês

A regra é aplicada na server action de salvar, não em trigger do banco.

## Modelo de dados

### Tabela `kpi_monthly_snapshots`

Armazena valores numéricos E metadados de texto (gestor, status) na mesma estrutura, usando duas colunas distintas conforme o tipo do dado.

```sql
create table kpi_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  operator_email text not null,                -- "samyrha.fenix@alloha.com" (case-insensitive na app)
  mes_ref date not null,                        -- primeiro dia do mês: 2026-05-01
  data_corte date not null,                     -- até quando o dado é válido: 2026-05-13
  kpi_slug text not null,                       -- "tx_retencao_bruta", "meta_gestor", etc.
  valor_numerico numeric,                       -- usado quando o KPI é numérico
  valor_texto text,                             -- usado quando é metadado de texto (status, gestor)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(operator_email, mes_ref, kpi_slug)
);

create index kpi_snapshots_mes_idx on kpi_monthly_snapshots(mes_ref);
create index kpi_snapshots_email_idx on kpi_monthly_snapshots(operator_email);
create index kpi_snapshots_slug_idx on kpi_monthly_snapshots(kpi_slug);

-- RLS
alter table kpi_monthly_snapshots enable row level security;

create policy "Authenticated can read kpi snapshots"
  on kpi_monthly_snapshots for select
  to authenticated
  using (true);

create policy "ADM and AUX can insert kpi snapshots"
  on kpi_monthly_snapshots for insert
  to authenticated
  with check (
    (select role from profiles where id = auth.uid()) in ('ADM', 'AUX')
  );

create policy "ADM and AUX can update kpi snapshots"
  on kpi_monthly_snapshots for update
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) in ('ADM', 'AUX')
  );

create policy "ADM and AUX can delete kpi snapshots"
  on kpi_monthly_snapshots for delete
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) in ('ADM', 'AUX')
  );
```

### Metadados especiais

Para os 4 metadados (gestor, status, monitoria, feedbacks), o sistema usa slugs reservados:

| Slug | Tipo | Coluna usada |
|---|---|---|
| `meta_gestor` | texto | `valor_texto` |
| `meta_status` | texto | `valor_texto` |
| `meta_monitoria` | numérico | `valor_numerico` |
| `meta_feedbacks` | numérico | `valor_numerico` |

Esses slugs não aparecem em `kpi_definitions` (eles são tratados como "auxiliares"). A lista de metadados a capturar é fixa no código.

### Colunas auxiliares de meta (Forecast)

Os valores das colunas `Forecast Pedidos Mês` e `Forecast Churn Mês` são salvos com slugs reservados:

| Slug | Origem |
|---|---|
| `forecast_pedidos` | Coluna "Forecast Pedidos Mês" |
| `forecast_churn` | Coluna "Forecast Churn Mês" |

Esses são usados pelo painel para calcular a coloração `per_row` de Pedidos e Churn.

### Total de slugs salvos por operador por mês

- 7 principais
- 9 secundários
- 2 forecasts
- 4 metadados

Total: **22 linhas por operador por mês**.

## Estrutura visual

### Header
- Título "Bases" + subtítulo "/ KPI"
- Microcopy: "Cole os dados exportados da planilha do planejamento."

### Bloco 1 — Configuração do snapshot

```
┌──────────────────────────────────────────────────────────┐
│  Mês de referência:      [ Maio / 2026  ▼ ]              │
│  Dados até o dia:        [  13/05/2026   ]                │
└──────────────────────────────────────────────────────────┘
```

**Mês de referência:**
- Dropdown com últimos 12 meses + mês atual
- Default: mês atual
- Se o ADM selecionar mês passado, mostra alerta amarelo: "Você está editando um mês passado. Os dados atuais desse mês serão sobrescritos."

**Dados até o dia:**
- Input date
- Default: ontem (D-1)
- Range válido: do dia 1 do mês selecionado até hoje
- Se o ADM mudar o mês, este campo é reajustado pro último dia válido daquele mês

### Bloco 2 — Área de colagem

```
┌──────────────────────────────────────────────────────────┐
│  📋 Cole os dados aqui (Ctrl+V)                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  (textarea grande, monospace)                      │  │
│  │                                                    │  │
│  │                                                    │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Inclua o cabeçalho da planilha junto com os dados.     │
│                                                          │
│                              [ Processar dados ]         │
└──────────────────────────────────────────────────────────┘
```

A textarea aceita texto separado por TAB (formato nativo do Excel/Sheets ao copiar) ou por vírgula (CSV).

### Bloco 3 — Resultado do processamento

Aparece **abaixo** após o ADM clicar em "Processar dados":

**3a — Status geral**

```
✓  Snapshot salvo
   Mês: Maio/2026  •  Data corte: 13/05/2026
   14 operadores salvos  •  2 operadores ignorados
```

**3b — Operadores salvos (collapsable, expandido por padrão)**

```
▼  Operadores salvos (14)
   samyrha.fenix@alloha.com
   marcos.psilva@alloha.com
   ...
```

**3c — Operadores ignorados (collapsable, expandido por padrão se houver)**

```
▼  Operadores ignorados (2)
   joão.silva@alloha.com — não cadastrado em profiles
   maria.santos@alloha.com — não cadastrado em profiles
```

**Importante:** "operadores ignorados" significa "não tem cadastro em `profiles`". Conforme as regras de negócio, **eles serão salvos no banco mesmo assim** (para histórico retroativo), mas a UI deixa explícito que não aparecerão no painel até serem cadastrados.

*Correção da decisão acima: ambos são salvos, a "categoria" é só pra informar quem aparece já no painel.*

**3d — KPIs não encontrados (se houver)**

Se algum KPI esperado não foi encontrado no cabeçalho colado:

```
⚠  KPIs não encontrados (2)
   Os cabeçalhos abaixo não foram identificados. Edite na aba
   Mapeamento das Configurações para que o sistema os encontre.

   • Tx. Retenção Bruta (%)         [Ajustar mapeamento]
   • % Variação Ticket               [Ajustar mapeamento]
```

Botão "Ajustar mapeamento" leva pra `/config/kpi` (aba Mapeamento) com o KPI já em foco.

**Nessa situação, o sistema salva os KPIs que foram encontrados** e marca como ausentes os outros. O ADM pode reprocessar depois de ajustar o mapeamento.

### Bloco 4 — Histórico de snapshots (lista resumo)

Logo abaixo da área de colagem, lista os últimos snapshots por mês:

```
HISTÓRICO

  Maio 2026     atualizado em 14/05/2026 às 15:30     14 ops
  Abril 2026    atualizado em 30/04/2026 às 22:14     12 ops
  Março 2026    atualizado em 31/03/2026 às 23:00     12 ops
  ...
```

Cada item é clicável e mostra detalhes do snapshot daquele mês (futuro — não implementar agora).

## Fluxo de colagem

1. ADM acessa `/bases/kpi`
2. Confirma/edita "Mês de referência" e "Data corte" (defaults já preenchidos)
3. Vai na planilha do planejamento, seleciona cabeçalhos + dados, copia (Ctrl+C)
4. Volta no site, clica na textarea, cola (Ctrl+V)
5. Clica em "Processar dados"
6. Sistema:
   a. Detecta separador (TAB ou vírgula)
   b. Lê primeira linha como cabeçalho
   c. Normaliza cada cabeçalho (trim, remove quebras de linha, lowercase)
   d. Para cada KPI em `kpi_definitions`, busca o `expected_header` normalizado
   e. Lê também as 6 colunas auxiliares: Colaborador, Gestor, Status, Monitoria, Feedbacks, Forecast Pedidos Mês, Forecast Churn Mês
   f. Para cada linha de dados (cada operador):
      - Identifica o operador pelo email da coluna Colaborador
      - Extrai valor de cada KPI mapeado
      - UPSERT no banco com chave `(operator_email, mes_ref, kpi_slug)`
   g. Aplica a regra de retenção: se houver mais de 12 meses no banco, apaga o mais antigo
7. Mostra resultado (Bloco 3)

## Decisões técnicas

### Por que UPSERT e não INSERT puro?

O ADM pode (e vai) colar dados do mesmo mês várias vezes ao longo dele (todo dia, aproximadamente). UPSERT garante que cada operador-mês-KPI tenha exatamente 1 linha viva, não acumula histórico diário.

### Por que valor_numerico E valor_texto separados?

A maioria dos KPIs é numérica. Mas Gestor e Status são texto. Em vez de armazenar tudo como `text` (e ter que fazer cast em queries de soma/comparação), uso duas colunas onde **apenas uma é preenchida por linha**.

O parser identifica o tipo no momento da colagem e popula a coluna certa:
- KPI numérico → `valor_numerico` setado, `valor_texto` = NULL
- Metadado de texto → `valor_texto` setado, `valor_numerico` = NULL

### Por que data_corte separada de mes_ref?

`mes_ref` indica o **mês** (ex: 2026-05-01), `data_corte` indica até **quando** os dados são válidos dentro desse mês (ex: 2026-05-13). Permite saber que "esse snapshot de Maio foi tirado até dia 13".

### Por que mês como `date` (sempre dia 1)?

Usar `date` permite ordenação cronológica nativa e queries simples como `where mes_ref >= '2026-01-01'`. Sempre normalizado pro dia 1 do mês (`2026-05-01` representa Maio/2026).

### Por que salvar operadores não cadastrados em profiles?

Conforme a decisão do usuário: futuro retroativo. Se um operador de outra equipe migrar pra equipe do ADM, queremos ter os dados históricos dele para consulta.

### Por que limpeza na server action e não trigger?

Visibilidade. A server action loga "apaguei mês X". Trigger faria o mesmo silenciosamente, dificultando debug.

## Estados

### Loading

- Skeleton dos selects e textarea
- Histórico com 3 linhas skeleton

### Erro

- **Textarea vazia ao processar:** toast "Cole os dados primeiro"
- **Cabeçalho não tem linha:** toast "Dados inválidos — inclua o cabeçalho"
- **Nenhum KPI encontrado no cabeçalho:** toast vermelho "Nenhum cabeçalho conhecido. Verifique o mapeamento."
- **Falha no Supabase:** toast vermelho com mensagem específica

### Vazio

- **Nenhum snapshot ainda no banco:** Histórico mostra "Nenhum dado de KPI salvo ainda. Cole sua primeira base acima."

### Sucesso

- Toast verde "Snapshot processado"
- Bloco 3 (resultado) aparece abaixo da textarea
- Textarea é **limpa automaticamente** após sucesso

## Animações de entrada

- Header e blocos 1, 2 em stagger leve (delay 0.1s entre cada)
- Bloco 3 (resultado) aparece com `motion.div` fade-up após processamento
- Histórico (bloco 4) fade-up no carregamento inicial

## Acessibilidade

- Textarea com `<label>` explícito
- Dropdowns com `aria-label`
- Botão "Processar dados" com `aria-busy` durante o save
- Mensagens de status em região `role="status"` (toast já faz isso)
- Listas de operadores salvos/ignorados em `<ul>` semântico

## Responsividade

- **Desktop (≥ 1024px):** layout completo
- **Tablet/Mobile:** textarea ocupa largura total, selects empilham

## Observações

- Página depende **fortemente** de `kpi_definitions` estar corretamente configurada (especialmente `expected_header`)
- Esta é a **primeira página com escrita real de dados em volume** no banco
- O parser de cabeçalhos é o ponto técnico mais crítico — deve ser **tolerante** a variações (quebras de linha, espaços extras, case)
- Reaproveitar a função `normalizeHeader()` (já definida em `config-kpi.md`)
- Limpar a textarea após sucesso evita colagens duplicadas acidentais

## Versão

1.0 — criada antes da implementação. Atualizar após criar tabela `kpi_monthly_snapshots` e validar fluxo end-to-end.