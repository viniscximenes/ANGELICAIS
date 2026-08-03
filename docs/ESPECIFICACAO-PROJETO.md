# Especificação do Projeto — ANGELICAIS / Alloha Fibra

> Documento gerado em 2026-08-01 a partir da leitura direta do código-fonte e da documentação em `docs/pages/`, `docs/system/`, `docs/features/`. Onde o código diverge da documentação escrita previamente, isso está sinalizado explicitamente. Onde algo não pôde ser confirmado com certeza, está marcado como **[confirmar]**.
>
> Serve como panorama de contexto rápido para uma nova sessão/ferramenta de IA trabalhar neste repositório sem precisar re-explorar tudo do zero.

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Autenticação e Roles](#2-autenticação-e-roles)
3. [Navegação (Sidebar)](#3-navegação-sidebar)
4. [Módulos e Funcionalidades](#4-módulos-e-funcionalidades)
   - [4.1 D-1](#41-d-1-google-sheets)
   - [4.2 KPI](#42-kpi)
   - [4.3 RV — Remuneração Variável](#43-rv--remuneração-variável)
   - [4.4 Feedback](#44-feedback)
   - [4.5 Configurações — Usuários, Planos, Supervisor](#45-configurações--usuários-planos-supervisor)
   - [4.6 Dashboard de Retenção](#46-dashboard-de-retenção)
   - [4.7 Diário de Bordo (legado e "DB" nova)](#47-diário-de-bordo-legado-e-db-nova)
   - [4.8 Atendimento e Monitoria](#48-atendimento-e-monitoria)
5. [Banco de Dados (Supabase)](#5-banco-de-dados-supabase)
6. [Integrações](#6-integrações)
7. [Arquitetura e Convenções](#7-arquitetura-e-convenções)
8. [Estado Atual e Pendências](#8-estado-atual-e-pendências)

---

## 1. Visão Geral

Sistema de **gestão operacional para call center de retenção**, construído para a operação da **Alloha Fibra** (provedora de internet — o dashboard de retenção e a página de RV exibem o título "ALLOHA FIBRA"). O codinome interno/técnico do produto é **ANGELICAIS** (usado no domínio de autenticação fictício, em metadatas de página e no texto da tela de login). Os dois nomes coexistem no código — ver [seção 8](#8-estado-atual-e-pendências).

Atende quatro perfis de usuário (roles): operador de linha de frente (OP), auxiliar com responsabilidade de manutenção de base (AUX), administrador (ADM) e gestor/supervisor de equipe (GESTOR). Cobre desde o atendimento ao vivo (calculadora de desconto, protocolo) até acompanhamento de KPI, remuneração variável, feedback semanal, monitoria de qualidade e um dashboard analítico de retenção.

### Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript strict
- **Estilos:** Tailwind CSS v4 + shadcn/ui (preset `radix-nova`, ícones Tabler — ver `components.json`)
- **Backend / Auth / Banco:** Supabase (`@supabase/supabase-js` + `@supabase/ssr`) — Postgres + Auth + RLS
- **Planilha externa:** Google Sheets, via `googleapis` (service account JWT) — fonte de dados do módulo D-1
- **Gráficos:** Recharts
- **Geração de documentos Word:** `docxtemplater` + `pizzip`, templates em `public/templates/*.docx`
- **Outras libs relevantes:** `papaparse` (parse de CSV), `react-dropzone`, `modern-screenshot` (export de tabelas como PNG), `framer-motion` (animações), `sonner` (toasts), `lenis` (smooth scroll)
- **Deploy:** Vercel (com cron job nativo — ver `vercel.json`)
- **Node:** 20 (`.nvmrc`)

### Ambiente

- URL de produção: **[confirmar]** — não há referência ao domínio de produção no repo; projeto Supabase identificado pelo host `ahvjrtwgsrggzidrrimv.supabase.co` (extraído de `.env.local`, não versionado).
- Repositório: local, sem remoto Git configurado (`git is a repository: false` no ambiente desta sessão) — **[confirmar origin real, se houver]**.

---

## 2. Autenticação e Roles

### Login (fonte: `src/lib/auth/login-action.ts`, `get-current-user.ts`, `post-login-path.ts`)

- Usuário digita um **username** (`nome.sobrenome`), não um email. O client converte para um email técnico interno: `${username}@interno.angelicais.app`. O domínio é fictício e nunca recebe emails de verdade — existe só para satisfazer a exigência de formato de email do Supabase Auth.
- Server action `loginAction` chama `supabase.auth.signInWithPassword`. Em caso de sucesso, busca `profiles.is_active` e `profiles.role`; se `is_active === false`, força `signOut()` e retorna erro `"inativo"`.
- **Redirect pós-login é role-based e centralizado em `getPostLoginPath(role)`** (não existe uma única página `/dashboard` de destino, ao contrário do que `docs/pages/login.md` descreve):
  - tem `view_kpi` → `/kpi/atual-principal` (OP/AUX/ADM)
  - senão, tem `view_d1_personal` ou `view_d1_team` → `/d-1/consolidado`
  - senão, tem `view_gestor_panel` → `/gestor/d-1` (GESTOR)
  - fallback → `/d-1/consolidado`
- Sessão gerenciada pelo Supabase (cookies httpOnly via `@supabase/ssr`); `src/middleware.ts` chama `updateSession()` a cada request para refresh de token.
- Existe uma segunda camada de email por usuário: `email_corporativo` (`nome.sobrenome@alloha.com`, usado para cruzar com a planilha Google) e `email_corporativo_alias_kpi` (alias opcional quando o email que aparece na planilha de KPI é diferente do corporativo — ver `src/lib/profile/get-kpi-email-for-profile.ts`).

### Roles

| Role | Descrição |
|---|---|
| **OP** | Operador — atende clientes, vê só os próprios resultados |
| **AUX** | Operador com responsabilidade extra (monitoria de ligações) |
| **ADM** | Administrador — configura o sistema, gerencia usuários, vê monitorias |
| **GESTOR** | Supervisor de equipe — não atende, acompanha resultados via painel próprio (`/gestor/*`) |

### Permissões nomeadas (`src/lib/auth/permissions.ts` — fonte da verdade real)

```typescript
type Permission =
  | "view_d1_personal" | "view_d1_team" | "view_kpi" | "view_monitoria"
  | "manage_base"      // bases de KPI (/bases/kpi) — ADM
  | "manage_d1_base"   // upload/limpeza da base do D-1 — GESTOR
  | "view_gestor_panel" | "manage_users" | "manage_system";
```

| Permissão | OP | AUX | ADM | GESTOR |
|---|:---:|:---:|:---:|:---:|
| `view_d1_personal` | ✅ | ✅ | ✅ | ❌ |
| `view_kpi` | ✅ | ✅ | ✅ | ❌ |
| `view_monitoria` | ❌ | ✅ | ✅ | ❌ |
| `manage_base` | ❌ | ❌ | ✅ | ❌ |
| `manage_d1_base` | ❌ | ❌ | ❌ | ✅ |
| `view_gestor_panel` | ❌ | ❌ | ✅ | ✅ |
| `manage_users` | ❌ | ❌ | ✅ | ❌ |
| `manage_system` | ❌ | ❌ | ✅ | ❌ |
| `view_d1_team` | ❌ | ❌ | ❌ | ❌ |

**Nota:** `view_d1_team` existe no tipo `Permission` mas **não é atribuída a nenhuma role** — é uma permissão morta hoje (ver [seção 8](#8-estado-atual-e-pendências)).

ADM tem `view_gestor_panel` mas **não acessa** `/gestor/*` na prática — o sidebar filtra essa seção com `onlyRoles: ["GESTOR"]` além da permissão, e as próprias páginas de `/gestor/*` fazem gate explícito `role !== "GESTOR"` no código.

### Documentação desatualizada

`docs/system/authentication.md`, `docs/system/permissions.md` e `docs/system/sidebar.md` foram escritos **antes da implementação** e descrevem uma matriz de permissões diferente da atual (ex.: sem `view_kpi`/`view_monitoria`/`manage_d1_base`, com `view_d1_team` ativa para AUX). Tratar como histórico de design, não como referência atual — a fonte da verdade é sempre `src/lib/auth/permissions.ts`.

---

## 3. Navegação (Sidebar)

Fonte: `src/components/dashboard/sidebar-sections.ts` (`getSidebarSectionsForRole`). A sidebar filtra `ALL_SECTIONS` por `can(role, section.permission)` e, quando presente, por `onlyRoles`.

| Seção (id) | Rota base | Permissão | Restrição de role | Itens |
|---|---|---|---|---|
| `gestor` ("D-1") | `/gestor` | `view_gestor_panel` | **só GESTOR** | Consolidado, Tempo Logado, Indisponibilidade |
| `operacional` | `/operacional` | `view_gestor_panel` | só GESTOR | KPI, Quartil |
| `meus-resultados` | `/meus-resultados` | `view_gestor_panel` | só GESTOR | KPI |
| `feedback` | `/feedback` | `view_gestor_panel` | só GESTOR | **Resultado Semanal** (único item — ver nota abaixo) |
| `configuracoes-gestor` ("Configurações") | `/configuracoes` | `view_gestor_panel` | só GESTOR | Operadores, Editar D-1 |
| `d-1` | `/d-1` | `view_d1_personal` | todos que têm a permissão (OP/AUX/ADM) | Consolidado, Tempo Logado, Indisponibilidade |
| `kpi` | `/kpi` | `view_kpi` | OP/AUX/ADM | Mês Atual, Mês Passado |
| `rv` | `/rv` | `view_kpi` | OP/AUX/ADM | Estimativa Atual, Estimativa Passada |
| `evolucao` ("EVOLUÇÃO") | `/evolucao` | `view_kpi` | OP/AUX/ADM | KPI |
| `bases` ("BASES") | `/bases` | `manage_base` | ADM | KPI |
| `config` ("CONFIGURAÇÕES") | `/config` | `manage_system` | ADM | KPI, RV, Usuários |

**Seção comentada/oculta:** o bloco `registros` (Monitoria + Diário de Bordo legado, permissão `view_monitoria`) está **comentado no código** com nota explícita: *"TEMP: oculto — seção removida da sidebar (todos os roles). As rotas /registros/* continuam acessíveis via URL direta; só não aparecem no menu."*

### Rotas implementadas SEM entrada na sidebar (acessíveis só por URL direta)

Cruzando a árvore de rotas (`src/app/(dashboard)/**/page.tsx`) contra `ALL_SECTIONS`, estas páginas existem e funcionam mas não aparecem em nenhum menu:

- `/analitico/consolidado` — Dashboard de Retenção (nem existe seção "dashboard"/"analitico" no array)
- `/atendimento` — Atendimento ao vivo
- `/config/planos` — Configurações de Planos e Descontos (a seção `config` na sidebar só lista KPI/RV/Usuários)
- `/feedback/atas` — Feedback / Atas (a seção `feedback` só lista "Resultado Semanal")
- `/registros/monitoria`, `/registros/monitoria/[id]` — comentado
- `/registros/diario`, `/registros/diario/[operator_email]` — comentado
- `/dashboard` — página placeholder legada ("Bem-vindo ao ANGELICAIS... em construção"), órfã desde que o pós-login passou a ser role-based

`/config` e `/bases` (sem sub-rota) são apenas redirects (`/config/kpi` e `/bases/kpi` respectivamente), não páginas próprias.

---

## 4. Módulos e Funcionalidades

### 4.1 D-1 (Google Sheets)

> Único módulo cuja fonte de dados é 100% Google Sheets (não Supabase) hoje. Ver [seção 7](#7-arquitetura-e-convenções) sobre a migração planejada Sheets→banco ("estratégia B→A").

A planilha tem **8 abas nomeadas por supervisor** (`ANA ANGELICA`, `JULIANA FERREIRA`, `JOAO VILELA`, `GABRIEL XIMENES`, `VITOR GOMES`, `PATRICIA DALMASIO`, `SAMIRA LEAO`, `FERNANDA QUEIROZ`), cada uma lida em `A2:AD100` (operadores/contratos/motivos) + `H2:L2` (totais da equipe). `getD1Data()` varre as 8 abas; a página do operador filtra pelo próprio email.

#### D-1 — Consolidado (operador)
- **Rota:** `/d-1/consolidado` (`/d-1` redireciona pra cá)
- **Quem acessa:** OP/AUX/ADM (`view_d1_personal`); GESTOR sempre redirecionado para `/gestor/d-1` (gate duplo: layout + page)
- **Funcionalidades:** cards de retidos/cancelados/pedidos/TX pessoal; breakdown de motivos; lista de contratos
- **⚠️ Divergência:** o `.md` descreve upload de CSV e tabela de equipe **dentro desta página** (gated por `manage_base`/`view_d1_team`) — isso foi **removido**. Comentário explícito no código: `RelatorioSupervisorView has been removed since Supervisor Report was migrated/removed`. Hoje a página só mostra dados pessoais; upload e visão de equipe migraram para `/gestor/d-1`.
- Alimenta também, em paralelo: snapshot de evolução da TX do dia (tabela `d1_evolucao_tx`, gráfico Recharts abaixo da tabela) e a tabela `retencao_atendimentos` (ver [4.6](#46-dashboard-de-retenção)) — ambos escritos automaticamente pelo mesmo fluxo de upload.

#### D-1 — Tempo Logado (operador) — `/d-1/tempo-logado`
- Cards pessoais (`view_d1_personal`): tempo logado do dia, tempo restante p/ meta **06:20:00**, logout estimado
- Bloco de equipe (`TempoLogadoEquipeSection`), gated por `view_d1_team` — **hoje inacessível a qualquer role** (permissão órfã, ver seção 8)
- Dados: guias `TEMPO LOGADO` / `LOGIN E LOGOUT` da planilha

#### D-1 — Indisponibilidade (operador) — `/d-1/indisponibilidade`
- TX de indisponibilidade (meta ≤ **14,5%**), pausa particular, NR17 (pausa 10+20)
- Bloco de equipe: mesma permissão órfã `view_d1_team`
- Bloco de detalhamento por pausa (`IndispPausasSection`): só ADM (`manage_system`)
- Sem upload próprio — compartilha base do Tempo Logado

#### D-1 — Relatório por Supervisor
`docs/pages/d-1-relatorio-supervisor.md` descreve um usuário dedicado `relatorio` com seletor de supervisor (empresa toda). **Não encontrado no código atual** — parece ter sido absorvido/substituído pela arquitetura de 8 abas nomeadas. Sobra apenas um comentário no `login-form.tsx` mencionando o username especial `"relatorio"`. Doc provavelmente obsoleto — **[confirmar]**.

#### Painel do Gestor — D-1 Consolidado — `/gestor/d-1`
- **Só GESTOR** (gate explícito por role, não só por permissão)
- Fonte: a aba do próprio supervisor, resolvida por `resolveGuiaGestor(username)` (convenção `nome.sobrenome` → `"NOME SOBRENOME"`)
- Tabela da equipe, motivos, contratos, exportação PNG, upload de CSV (`manage_d1_base` — só GESTOR tem essa permissão, nem ADM nem AUX), aplica "nome fantasia" (apelidos, ver [4.5](#45-configurações--usuários-planos-supervisor))
- Estado vazio amigável se a guia do gestor ainda não existir na planilha

#### Painel do Gestor — Tempo Logado — `/gestor/tempo-logado`
- Guia `"<GUIA>2"` (ex.: `"ANA ANGELICA2"`) via `resolveGuiaTempoLogado()`
- Linha fica vermelha se tempo logado < 06:20:00; upload próprio grava hora do report em `BASE - 2!S2`

#### Painel do Gestor — Indisponibilidade — `/gestor/indisponibilidade`
- Mesma guia `"<GUIA>2"` do Tempo Logado, colunas diferentes; sem upload próprio
- Linha vermelha se indisp ≥ 14,5%

#### Configurações do Supervisor — Operadores do D-1 — `/configuracoes/operadores-d1`
- Só GESTOR. Escreve direto no Sheets (colunas A/B das duas guias do gestor — principal e `"...2"`)
- Adicionar: valida email `@alloha.com`, checa duplicidade, verifica dinamicamente se há fórmula na linha-destino antes de escrever
- Excluir: limpa A:B, preserva fórmulas em C+

#### Limpeza automática das bases (cron)
- `vercel.json`: cron `GET /api/cron/limpar-bases` às `0 3 * * *` UTC (= 00:00 BRT)
- Protegido por header `Authorization: Bearer <CRON_SECRET>` (env var, enviado automaticamente pela Vercel)
- `limparBases()` (`src/lib/google/bases/limpar-bases.ts`) faz `batchClear` de `BASE - 1!A2:R10000` + `S2` e `BASE - 2!A2:K50000` + `L2` — não toca colunas de fórmula nem guias de supervisor (ficam vazias sozinhas por referenciarem as bases)

---

### 4.2 KPI

Diferente do D-1, o módulo KPI **já está 100% no banco** (Supabase) — a planilha é só a origem do upload manual em `/bases/kpi`.

#### Configurações — `/config/kpi` (ADM, `manage_system`)
- Tabela `kpi_definitions`, 16 KPIs pré-cadastrados (7 principais + 9 secundários), não criáveis/removíveis pela UI
- 3 abas: PRINCIPAIS, SECUNDÁRIOS, MAPEAMENTO (edita `expected_header` — nome do cabeçalho esperado na planilha colada)
- Edição de metas/thresholds conforme `coloring_type` (three_tier / binary / per_row / none)

#### Bases — `/bases/kpi` (ADM e AUX, `manage_base`)
- Colagem de planilha (Ctrl+V/TSV); parser mapeia colunas → `kpi_slug` via `expected_header`
- UPSERT por `(operator_email, mes_ref, kpi_slug)` em `kpi_monthly_snapshots` — snapshot acumulado do mês, não histórico diário
- 2º card na mesma página: base própria dos gestores/supervisores → `kpi_gestor_snapshots`, chave por `supervisor_name` (não email)
- Retenção automática: mantém só os 2 meses mais recentes; botão manual para apagar mês fechado
- ~22 linhas/operador/mês: 7 principais + 9 secundários + 2 forecasts + 4 metadados (`meta_gestor`, `meta_status`, `meta_monitoria`, `meta_feedbacks`)
- **⚠️ Divergência:** `bases-kpi.md` usa o slug `meta_monitorias` (plural); o código (`src/lib/kpi/bases/types.ts`) usa `meta_monitoria` (singular) — confirmar qual é o vigente

#### KPI Atual — Principal / Secundário (`/kpi/atual-principal`, `/kpi/atual-secundario`)
- OP/AUX/ADM veem só os próprios dados (mês corrente); GESTOR redireciona para `/gestor/d-1`
- **Principal:** 7 KPIs "mestre" em destaque (retenção, pedidos, churn, ticket, TMA, ABS, indisponibilidade)
- **Secundário:** 9 KPIs de apoio em grid 3×3 (retenção líquida 15d, atendidas, transfer, short call, rechamada D+7, CSAT, NR17, pessoal, outras pausas) — caso especial: "Tx. Retenção Líquida 15d" colore por **diff** contra a Tx. Retenção Bruta do mesmo operador, não por threshold próprio

#### KPI Passado — Principal / Secundário (`/kpi/passado-principal`, `/kpi/passado-secundario`)
- Mês imediatamente anterior; mesma estrutura visual, porém **neutra** (sem cor, sem meta) — é consulta histórica

#### KPI do Gestor — "Meus Resultados" (`/meus-resultados/kpi`, só GESTOR)
- Fonte: `kpi_gestor_snapshots` (chave `supervisor_name`) + `kpi_metas_gestor` (metas próprias do gestor, tabela separada de `kpi_definitions`)
- Principais e secundários juntos na mesma página; toggle mês atual/passado
- Matching gestor logado → linha via `ILIKE` nas 2 primeiras palavras do `full_name` (robusto a casing/truncamento)
- É o KPI **próprio do supervisor**, distinto do KPI da equipe (`/operacional/kpi`)

#### Operacional — KPI da Equipe (`/operacional/kpi`, só GESTOR)
- Lista de operadores cujo `meta_gestor` (slug em `kpi_monthly_snapshots`) casa com o gestor via ILIKE
- Clique abre detalhe com secundários; toggle mês atual/passado in-page

#### Operacional — Quartil (`/operacional/quartil`, só GESTOR)
- Quartil (Q1-Q4) + rank **por KPI** (respeitando `direction`), não score combinado
- Toggle "Equipe" (rank só entre a equipe) vs "Empresa" (rank entre todos, mas exibe só os da equipe)
- Só mês atual. **[confirmar]** se o modo "Empresa" tem mitigação para o teto de 1000 linhas do PostgREST (~180 operadores × 22 slugs pode estourar)

#### Evolução — KPI (`/evolucao/kpi`, OP/AUX/ADM, `view_kpi`)
- Só leitura de `kpi_monthly_snapshots` ao longo de todos os meses existentes
- Gráfico de linha por indicador (Tx Retenção, Pedidos, Indisponibilidade, ABS, TMA); card "consolidado" com Tx Retenção acumulada real (`Σ(pedidos-churn)/Σpedidos`)
- Aba "Quartil" reservada na sidebar mas não implementada

---

### 4.3 RV — Remuneração Variável

- **Rotas:** `/config/rv` (ADM configura), `/rv/atual` e `/rv/passado` (operador consulta)
- **Quem acessa:** OP/AUX/ADM em `/rv/*` (só o próprio); ADM em `/config/rv`; GESTOR redireciona (RV de gestor não existe ainda)
- **Fonte:** 100% Supabase — lê `kpi_monthly_snapshots` + as 9 tabelas `rv_*` (ver [seção 5](#5-banco-de-dados-supabase)). Ferramenta de **transparência/estimativa**, não o cálculo oficial da folha.

**Modelo de cálculo** (`calculateRv`, função pura):
1. **Status:** se `meta_status` normalizado ≠ "ativo" (férias/licença/desligado) → RV = 0
2. **Elegibilidade:** cada `rv_eligibility_rules` compara um `kpi_slug` contra threshold; falhou → RV = 0
3. **Bruto:** soma indicadores tiered (faixa mais alta atingida, com pré-requisito opcional de outro indicador), binários (valor fixo), bônus combinado (todas condições simultâneas) e **per-unit** (valor × contagem, hoje só `countSource: "derived_retido"` = pedidos−churn)
4. **Multiplicador:** `subtotal = bruto × (valor_kpi / valor_forecast_kpi)`, travável em 100%
5. **Deflatores:** automáticos (via comparação de KPI) ou manuais (soma de ocorrências lançadas pelo ADM); desconto = `initial_percent + (ocorrências-1) × increment`; líquido nunca abaixo de 0
6. **Teto possível:** `teto_base + bônus combinados ainda alcançáveis` — um bônus trava como "impossível" quando uma condição sobre KPI monotônico (`churn` ou `deflator:*`) já estourou de forma irreversível

`promoteCurrentToPreviousAction`: botão manual do ADM que copia `scope=current` → `scope=previous` (delete+insert) na virada do mês — **não é automático por calendário**.

**⚠️ Divergências com `rv.md`:**
- `rv_per_unit_indicators` (indicador "valor por retido") existe no banco/código mas não está descrito no `.md` — feature adicionada depois
- `rv_deflator_applications.deflator_slug` (casamento estável pós-promoção current→previous) não aparece no schema documentado
- Nomes de arquivo reais divergem do planejado no doc (ex.: `get-rule-set.ts` em vez de `get-rules.ts`) — reorganização sem impacto funcional
- Título da página usa a marca real **"ALLOHA FIBRA"**, não "ANGELICAIS"

---

### 4.4 Feedback

Uma única página com **3 abas internas** (não são rotas separadas) + uma página própria separada para Atas.

#### Resultado Semanal — `/feedback/resultado-semanal` (só GESTOR)
Aba **Consolidado**: formulário 100% manual (período seg-sáb, Retido/Cancelado por dia); Pedido = Retido+Cancelado; TX = Retido÷Pedido; consolidado da semana = taxa real (soma retidos ÷ soma pedidos, não média das diárias). Gera `.docx` via `POST /api/feedback/resultado-semanal` usando `computeSemana()` + template `feedback_template.docx`.

Aba **Tempo Logado**: digitação manual (T. Logado, H. Login, H. Deslog por dia). Média de T. Logado usa todos os dias; média de H. Login só considera logins na janela **11:30–17:00**; média de H. Deslog só considera deslogs na janela **18:00–23:00**. Via `POST /api/feedback/tempo-logado` + `feedback_tempologado_template.docx`.

Aba **Indisponibilidade**: 4 percentuais manuais por dia (Total, NR17, Particular, Outras); média simples sem filtro de janela. Via `POST /api/feedback/indisponibilidade` + `feedback_indisponibilidade_template.docx`.

Padrão comum às 3 abas: navegação por setas entre células, persistência de datas em `localStorage` (sobrevive a F5), serial sequencial no nome do arquivo gerado.

#### Atas — `/feedback/atas` (só GESTOR)
Comunicado interno/ata. 4 modelos de tema fixos no código (`MODELOS_ATA`: TEMPO LOGADO, ADERÊNCIA, PAUSAS NÃO AUTORIZADAS, ESTOURO DO NR17) + opção "Personalizado". Define N operadores → gera N linhas de assinatura no verso (página 2, sem cabeçalho, quebra de página forçada). Via `POST /api/feedback/atas` + template `ata_template.docx` (usa loops do docxtemplater, com correção manual do XML para funcionar fora de `<w:p>`).

**Nota de navegação:** apesar de ter rota e sidebar-item documentados no `.md`, a sidebar real (`sidebar-sections.ts`) só lista "Resultado Semanal" sob o grupo Feedback — **Atas não tem entrada no menu**, só acesso por URL direta (ver [seção 3](#3-navegação-sidebar)).

---

### 4.5 Configurações — Usuários, Planos, Supervisor

#### Usuários — `/config/usuarios` (só ADM, `manage_system`)
- Tabela `profiles`; escrita via cliente admin (`SUPABASE_SERVICE_ROLE_KEY`)
- Criar usuário: nome, username, email corporativo, role, senha manual ou gerada (12 caracteres, exclui caracteres ambíguos `0/O/1/I/l`) — cria no Supabase Auth (`{username}@interno.angelicais.app`) + insere `profiles`
- Editar dados básicos; username imutável após criação
- Alternar role: **apenas OP ↔ AUX** (bloqueado para ADM/GESTOR e para o próprio usuário logado)
- Ativar/desativar (`is_active`) — soft-delete, preserva histórico em monitoria/diário
- **[confirmar]** `create-user-action.ts` tecnicamente aceita as 4 roles na criação (inclusive GESTOR/ADM); confirmar o que o `<select>` real da UI expõe

#### Planos e Descontos — `/config/planos` (só ADM)
- Tabelas `marcas`, `planos`, `regras_desconto` — alimenta diretamente a calculadora de `/atendimento`
- Marcas/Planos: CRUD com toggle ativo/inativo; delete de marca bloqueado se houver planos vinculados
- Regras de desconto: faixas por tempo de cliente (`tempo_min/max_meses`, nullable = sem teto) × `tem_ott`, com `desconto_max_pct` e `duracao_meses`; suporta múltiplas regras concorrentes; duplicar regra
- Validações: `tempo_min >= 0`; se houver `tempo_max`, deve ser `>= tempo_min`; `desconto_max_pct` 1–100; `duracao_meses > 0`
- Detecção de sobreposição de faixas (só aviso, não bloqueia)

#### Configurações do Supervisor — Operadores (Nome Fantasia) — `/configuracoes/operadores` (só GESTOR)
- Tabelas `gestor_config_fantasia` (flag por gestor) + `operador_nome_fantasia` (mapa email→apelido, único por gestor+operador)
- Interruptor global "usar nome fantasia" (tudo-ou-nada): exige apelido preenchido para todos os operadores da equipe antes de salvar
- Apelido substitui o nome real **só na exibição** das 3 tabelas do painel do gestor (D-1 Consolidado, Tempo Logado, Indisponibilidade) e nas exportações PNG — o dado real (email) fica intacto
- **⚠️ Divergência:** o código tem 3 toggles extras por tabela (`olho_consolidado`, `olho_tempo_logado`, `olho_indisponibilidade`) não descritos no `.md` — confirmar propósito exato de cada "olho"

---

### 4.6 Dashboard de Retenção

#### Fundação (importação) — sem rota própria
Roda como um passo adicional dentro do fluxo de upload existente do D-1 (`upload-base-action.ts`), best-effort/paralelo — se falhar, não quebra o upload do D-1.
- `parseBaseRetencao(csvText)`: parse por NOME de coluna (robusto a ordem); `FOI_CANCELAMENTO` → boolean (**única** regra de retido/cancelado — `status_contrato`/`status_retencao` são só informativos); `STATUS_HORA` → timestamp + `hora_bucket` (hora cheia 0-23)
- `salvarBaseRetencao(linhas)`: sobrescreve `retencao_atendimentos` (delete+insert em lote, ~3000 linhas/envio, sem histórico de dia)

#### Painel Analítico — `/analitico/consolidado`
- **⚠️ Divergência de rota:** o doc planeja `/dashboard/retencao` com seção própria na sidebar; o código real está em `/analitico/consolidado` e **não tem nenhuma entrada de sidebar** (nem seção "dashboard" nem "analitico" existe em `sidebar-sections.ts`) — só acessível por URL direta
- **Quem acessa:** só GESTOR (checagem manual por role, sem permissão nomeada dedicada)
- **Fonte:** única tabela `retencao_atendimentos`
- **Escopo:** toggle "Equipe" / **"Polo"** na UI (não "Empresa" como o doc nomeia). `escopo.ts` filtra por `usuario_login IN emailsEquipe` (equipe) ou sem filtro (polo). Também há toggle de turno (Manhã 8h-13h / Tarde 14h-19h) + hora específica — não previsto no doc original
- **Blocos implementados:** alertas automáticos, visão geral (cards), evolução por hora, detecção de quedas com contribuição por motivo/operador, por segmento, por tema/motivo (com meta por tema), quartil de operadores, lista de operadores abaixo da meta, exportar contratos filtrados, config de metas
- **⚠️ Duplicidade de meta (débito técnico, confirmar se intencional):** existem **duas metas paralelas não sincronizadas** — meta "oficial" em `gestor_config_fantasia.meta_tx_retencao` (banco, default 60, usada só para calcular alertas) vs. meta "global"/por tema em **`localStorage`** (`retencao_meta_global_${userKey}`, default 65), usada para colorir a maior parte do painel. A meta que colore o painel não é a mesma que dispara os alertas.

---

### 4.7 Diário de Bordo (legado e "DB" nova)

Duas features com nome parecido, **não sobrepostas**:

#### Legado — `/registros/diario`, `/registros/diario/[operator_email]`
- Registro **manual, discricionário**, feito pelo ADM caso a caso durante o mês (contestação de RV)
- Tabela `diario_registros`. 4 tipos de caso: Pausa Autorizada, Fora de Jornada (delta automático contra jornada fixa **06:20:00**), Geral, Outros
- ADM registra e vê tudo; AUX vê só os próprios registros (read-only); OP e GESTOR sem acesso. Gate por `view_monitoria` (reaproveitada — o `.md` cogitava criar `view_diario`, decisão já tomada de não criar)
- Retenção automática (mês atual + anterior)
- Sem entrada na sidebar hoje (seção "Registros" comentada)

#### "DB" nova (em construção) — sem rota ainda
- **Nenhuma página existe.** Confirmado por busca: nenhuma page.tsx/route/componente chama as funções do `src/lib/db/**`. É puro backend, sem UI.
- Tabelas `db_pausas_diario` (linhas cruas do CSV do dia, sobrescrita segura por `data_ref`) e `db_temas` (temas configuráveis `pausa`/`tempo_logado`) — ambas com RLS habilitado e **zero policies** (só service role acessa)
- Já implementado: parser de CSV robusto (`parse-csv-pausas.ts`, trata mojibake de encoding), salvamento com sobrescrita segura (`salvar-csv-pausas.ts`), motor de detecção completo (`detectar-registros.ts`: pausas >1min, Pausa 20 somada >25min, Pausa 10 somada >25min, tempo logado <06:20:00)
- **Falta:** upload UI do CSV, CRUD de temas, geração do texto final, página do supervisor inteira — das 5 fases do doc, só Fase 1 (banco) + Fase 2 (parse/salvar) + parte da Fase 4 (detecção) existem
- Proposta: processo **automatizado** de auditoria diária em volume (detecção em massa), complementar ao legado (que cobre casos avulsos sob demanda)

---

### 4.8 Atendimento e Monitoria

#### Atendimento ao vivo — `/atendimento`
- OP/AUX/ADM (GESTOR redireciona para `/d-1`). Página client-side, **não persiste nada**
- Calculadora de desconto: marca → plano → OTT → tempo de cliente → ofertas permitidas com slider (lê `planos`/`marcas`/`regras_desconto`)
- Montador de protocolo: formulário guiado → texto pronto para colar no AIR (sem integração direta, por decisão de segurança)
- Card de performance: TX bruta demonstrativa (D-1 de hoje + KPI do mês) e TX fechada do mês passado
- Sem entrada na sidebar (só URL direta)

#### Monitoria de Ligações — `/registros/monitoria`, `/registros/monitoria/[id]`
- Tabela `monitorias`. ADM cadastra ligação (operador, AUX responsável, ID chamada, contrato, data, link OneDrive) → `pending`
- AUX abre gravação (link externo, sem player embutido), avalia (sinalização principal entre 8 opções, notas de apresentação/comunicação/processo em escala de 5, resumo livre) → `finalized` (trava edição do AUX)
- ADM pode editar/reabrir/deletar mesmo finalizada
- Retenção automática (mês atual + anterior, ~4 registros/operador/mês)
- Sem entrada na sidebar hoje

---

## 5. Banco de Dados (Supabase)

Não há pasta `supabase/migrations/` no repo — o único schema SQL versionado é `scripts/sql/schema-db-diario-de-bordo.sql` (tabelas `db_pausas_diario`/`db_temas`). As demais tabelas foram criadas via migrations aplicadas diretamente no Supabase (não versionadas em arquivo) — nomes de tabela e colunas abaixo foram confirmados via grep no código real (`.from("...")`, `.select("...")`) e arquivos `types.ts`.

| Tabela | Propósito | Colunas principais |
|---|---|---|
| `profiles` | Extensão de `auth.users` — perfil interno | `id` (FK auth.users), `username`, `full_name`, `email_corporativo`, `email_corporativo_alias_kpi`, `role` (OP/AUX/ADM/GESTOR), `is_active`, `theme_preference` (dark/light), `created_at`, `updated_at` |
| `kpi_definitions` | 16 KPIs seed (7 principais + 9 secundários) | `slug`, `display_name`, `group_type`, `display_order`, `value_type`, `direction`, `coloring_type`, `threshold_red/yellow/green`, `threshold_diff_percent`, `meta_column_name`, `expected_header` |
| `kpi_monthly_snapshots` | Snapshot mensal de KPI por operador | `operator_email`, `mes_ref` (YYYY-MM-01), `kpi_slug`, valor — UPSERT por `(operator_email, mes_ref, kpi_slug)` |
| `kpi_gestor_snapshots` | Snapshot mensal de KPI do próprio gestor | chave por `supervisor_name` (texto, não FK) |
| `kpi_metas_gestor` | Metas/thresholds específicas do KPI do gestor | `slug`, `threshold_red/yellow`, `threshold_diff_percent`, `coloring_type` |
| `rv_rule_sets` | Conjunto de regras de RV por scope | `scope` (current/previous), `teto_base`, `multiplicador_max_pct` |
| `rv_eligibility_rules` | Regras de elegibilidade | `rule_set_id`, `kpi_slug`, `comparison`, `threshold` |
| `rv_tiered_indicators` | Indicadores em faixa | `kpi_slug`, `direction`, `faixas` (jsonb `{threshold,value}[]`), `requires_indicator_slug`, `requires_threshold` |
| `rv_binary_indicators` | Indicadores binários | `kpi_slug`, `comparison`, `threshold`, `value_if_achieved` |
| `rv_combined_bonus` | Bônus por condições combinadas | `conditions` (jsonb), `value_if_all_achieved` |
| `rv_multiplier` | Multiplicador (Pedidos vs forecast) | `kpi_slug`, `forecast_kpi_slug`, `cap_at_100_pct` |
| `rv_deflator_types` | Tipos de deflator (auto ou manual) | `initial_percent`, `increment_per_occurrence`, `auto_from_kpi_slug`, `auto_comparison`, `auto_threshold`, `is_auto` |
| `rv_per_unit_indicators` | Indicador "valor por unidade" (ex.: R$/retido) | `tx_kpi_slug`, `count_source`, `faixas` (jsonb `{threshold, value}[]`) |
| `rv_deflator_applications` | Ocorrências de deflator manual aplicadas | `operator_email`, `mes_ref`, `deflator_type_id`, `deflator_slug`, `occurrence_count`, `notes`, `applied_by` |
| `monitorias` | Monitoria de qualidade das ligações | `operator_email`, `aux_responsible_email`, `id_chamada`, `contrato_cliente`, `data_atendimento`, `link_onedrive`, `sinalizacao_principal`, notas (apresentação/comunicação/processo), `status` (pending/finalized/sent) |
| `diario_registros` | Diário de Bordo legado | `operator_email`, `caso` (pausa_autorizada/fora_jornada/geral/outros), `data_ocorrido`, tempos em segundos, `glpi`, `descricao` |
| `db_pausas_diario` | CSV cru de login/logout/pausas por dia ("DB" nova) | `data_ref`, `agent_user`, `agent_name`, `agent_email`, `state`, `reason_code`, `login_time_seg`, `agent_state_time_seg`, `importado_em` — RLS on, **sem policies** |
| `db_temas` | Temas configuráveis ("DB" nova) | `tipo` (pausa/tempo_logado), `nome`, `texto_motivo`, `ativo` — RLS on, **sem policies** |
| `marcas` | Marcas de plano | `nome`, `ativo` |
| `planos` | Planos por marca | `marca_id`, `nome`, `valor`, `tem_ott`, `ordem`, `ativo` |
| `regras_desconto` | Regras de desconto por tempo de cliente | `tempo_min_meses`, `tempo_max_meses` (nullable), `tem_ott`, `desconto_max_pct`, `duracao_meses` |
| `gestor_config_fantasia` | Config de nome fantasia + meta de retenção, por gestor | `gestor_id`, `ativo`, `olho_consolidado`, `olho_tempo_logado`, `olho_indisponibilidade`, `meta_tx_retencao` |
| `operador_nome_fantasia` | Apelido por operador, por gestor | `gestor_id`, `operador_email`, `nome_fantasia` — UNIQUE(gestor_id, operador_email) |
| `retencao_atendimentos` | Base de atendimentos de retenção (Dashboard de Retenção) | `cod_air`, `data_criacao`, `status_contrato`, `status_retencao`, `status_hora`, `hora_bucket` (0-23), `motivo`, `submotivo`, `primeiro_nivel`, `usuario_nome`, `usuario_login`, `unidade_nome/sigla`, `marca`, `foi_cancelamento` (bool — única regra retido/cancelado), `comprador_nome` |
| `d1_evolucao_tx` | Snapshot intradiário da TX da equipe (D-1 Consolidado) | `tx_value`, `report_time` (HH:MM), `created_at` — limpo diariamente via `pg_cron` do próprio Supabase |

### RLS — padrão observado

Não há policies versionadas no repo para a maioria das tabelas — **[confirmar diretamente no Supabase Dashboard]**. Padrões observados no código:
- Tabelas mais novas (`db_pausas_diario`, `db_temas`) seguem o padrão **"RLS habilitado, zero policies, só service role acessa"** — todo acesso passa por `createAdminClient()` em server actions.
- Operações sensíveis (criação/edição de usuário, mudança de role, snapshot de evolução de TX) usam deliberadamente o cliente admin (`SUPABASE_SERVICE_ROLE_KEY`) para bypassar RLS, mesmo em tabelas que provavelmente têm policies de leitura para `authenticated`.
- Leituras cotidianas (KPI, RV, monitorias, planos etc.) usam o cliente server normal (`createClient()`, cookie-based), implicando policies de SELECT abertas para usuários autenticados nessas tabelas — consistente com o padrão documentado (desatualizado) em `docs/system/authentication.md` para `profiles`.

---

## 6. Integrações

### Google Sheets
- Client: `src/lib/google/sheets-client.ts` — JWT de service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEETS_ID`), scope `spreadsheets`
- Único consumidor: o módulo **D-1** (Consolidado, Tempo Logado, Indisponibilidade) — 8 abas nomeadas por supervisor (guia principal + guia `"...2"` para tempo logado/indisponibilidade)
- Leitura via `batchGet`, escrita via upload de CSV colado pelo usuário; limpeza diária via `batchClear` (cron)
- KPI e RV **não** usam Sheets — são banco puro

### Vercel
- Deploy do Next.js; `next.config.ts` define `experimental.serverActions.bodySizeLimit: "10mb"` (uploads de CSV grandes)
- Cron nativo (`vercel.json`): `GET /api/cron/limpar-bases` diariamente às 00:00 BRT, autenticado via `CRON_SECRET`
- Env vars usadas no código: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEETS_ID`, `CRON_SECRET` (só `NEXT_PUBLIC_SUPABASE_*` estão no `.env.local.example`; as demais só existem no `.env.local` real/nas env vars da Vercel)

### Geração de `.docx`
- `docxtemplater` + `pizzip` sobre templates em `public/templates/`: `feedback_template.docx`, `feedback_tempologado_template.docx`, `feedback_indisponibilidade_template.docx`, `ata_template.docx`
- Cada template é preenchido por um route handler dedicado em `src/app/api/feedback/*` — nunca em server action (route handler é necessário para retornar o binário do arquivo)
- Template de Atas usa loops (`{#paragrafos}`/`{#linhas}`) com correção manual de XML para funcionar fora de tags `<w:p>`

---

## 7. Arquitetura e Convenções

### Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/              # login (fora do layout autenticado) [confirmar existência do grupo]
│   ├── (dashboard)/         # área autenticada — sidebar + header, ~35 rotas
│   └── api/                 # route handlers: cron + geração de .docx
├── components/
│   ├── ui/                  # primitivos shadcn/ui
│   ├── dashboard/           # sidebar, header, seções por módulo (d-1/, retencao/, evolucao/, etc.)
│   ├── login/                # tela de login (AnimatedOrb, form)
│   └── motion/               # PageTransition, StaggerContainer (Framer Motion)
├── lib/
│   ├── auth/                # get-current-user, permissions, login/logout actions
│   ├── supabase/             # client.ts (browser), server.ts (SSR), admin.ts (service role), middleware.ts
│   ├── google/                # sheets-client + d1/ + gestor/ + bases/ (integração Sheets)
│   ├── kpi/, rv/, feedback/, monitorias/, diario/, db/, retencao/, config/, gestor/, users/, atendimento/, atas/, evolucao/
│   └── utils.ts
└── middleware.ts             # refresh de sessão Supabase a cada request
```

Cada módulo de domínio em `src/lib/` segue o padrão: `get-*.ts` (leitura), `types.ts`, e uma subpasta `actions/` com server actions (`"use server"`) para escrita.

### Padrões observados

- **Server actions** para toda escrita (não API routes), exceto onde é preciso retornar um binário (geração de `.docx` → route handlers em `src/app/api/`) ou onde a Vercel exige um endpoint HTTP (cron).
- **Gate de permissão em duas camadas**: verificação no `page.tsx`/`layout.tsx` (server component, decide o que renderizar) **e** de novo dentro da server action (rejeita mesmo se alguém forjar a chamada). Cliente nunca decide sozinho.
- **Cliente admin (`createAdminClient`, service role) usado deliberadamente** para bypassar RLS em operações administrativas sensíveis (gestão de usuários, snapshot de evolução) — nunca exposto ao browser.
- **Matching por nome/ILIKE em vez de FK** em vários pontos de junção entre o mundo "planilha" (nomes de supervisor em texto livre) e o mundo "banco" (ex.: `meta_gestor` em `kpi_monthly_snapshots`, `supervisor_name` em `kpi_gestor_snapshots`) — robusto a variação de casing/truncamento, mas sem integridade referencial real.
- **Padrão de "sobrescrita segura"** (delete+insert em lote, nunca update in-place) para bases importadas por completo: `salvarBaseRetencao`, `salvar-csv-pausas.ts`, upload de KPI snapshot — reduz risco de dado parcialmente sobrescrito em caso de erro no meio do processo.
- **Retenção automática** (mês atual + anterior, apagar o resto) é um padrão repetido em `kpi_monthly_snapshots`, `monitorias`, `diario_registros`.

### Fluxo de dados: Sheets vs Banco — estratégia B → A

Documentado explicitamente em `docs/pages/dashboard-retencao-fundacao.md`:

> **Estratégia B** (estado atual): o upload de CSV continua alimentando o Google Sheets (D-1 intacto) e **adicionalmente** salva no banco (`retencao_atendimentos`, `d1_evolucao_tx`). Não substitui, não quebra o D-1 existente.
>
> **Estratégia A** (futuro, projeto separado): o D-1 passa a **ler do banco**, e o Sheets é desligado.

Ou seja: hoje o upload de CSV do D-1 escreve nos dois lugares (Sheets como fonte de verdade das telas de D-1; banco como fundação para o Dashboard de Retenção e a evolução de TX). KPI e RV **já vivem 100% no banco** — só o D-1 (Consolidado/Tempo Logado/Indisponibilidade) ainda depende do Sheets.

### Convenções de nome
- Arquivos: kebab-case (`get-current-user.ts`, `update-user-role-action.ts`)
- Actions: sufixo `-action.ts`, sempre `"use server"`, sempre em subpasta `actions/`
- `docs/architecture.md`, `docs/conventions.md`, `docs/components.md` são **templates não preenchidos** (colchetes `[a definir]`) — não refletem convenções reais; as convenções reais devem ser inferidas do código, não desses arquivos.

---

## 8. Estado Atual e Pendências

### Completo e funcionando
- Autenticação (username→email interno, roles, sessão Supabase)
- D-1 completo (operador + painel do gestor + configurações de operadores) sobre Google Sheets
- KPI completo (definições, bases/upload, atual/passado, operacional, quartil, evolução, KPI próprio do gestor)
- RV completo (config + cálculo + visão do operador), incluindo indicador per-unit e deflatores manuais/automáticos
- Feedback (Resultado Semanal com 3 abas + Atas) — geração de `.docx` funcionando
- Configurações (Usuários, Planos e Descontos, Nome Fantasia do supervisor)
- Monitoria de Ligações e Diário de Bordo legado (banco + UI completos, porém fora da sidebar)
- Atendimento ao vivo (calculadora + protocolo)
- Dashboard de Retenção — fundação (importação) e painel analítico (ambos funcionando, mas fora da sidebar)
- Tema claro (apesar de `docs/features/README.md` marcar como "em construção" — código mostra implementação completa: `theme_preference`, `theme-toggle.tsx`, `theme-provider.tsx`)
- Evolução da TX do D-1 (idem — doc diz "em construção", código tem tabela `d1_evolucao_tx`, action, componentes de gráfico, tudo implementado)
- Cron de limpeza diária das bases do D-1 (Vercel)

### Em andamento / incompleto
- **Diário de Bordo "DB" (nova):** só a camada de dados existe (schema SQL, parser de CSV, motor de detecção). **Zero UI** — nenhuma página, nenhum route handler. Fases 3 (CRUD de temas) e 5 (página do supervisor) do plano original ainda não têm código.
- **RV de gestor:** não existe — GESTOR é redirecionado para fora de `/rv/*`.

### Pendências técnicas / divergências a resolver

1. **Permissão órfã `view_d1_team`** — declarada no tipo `Permission` mas não atribuída a nenhuma role em `ROLE_PERMISSIONS`. Os blocos de equipe em `/d-1/tempo-logado` e `/d-1/indisponibilidade` (gated por essa permissão) estão hoje inacessíveis para qualquer usuário. Confirmar se é resquício de refatoração (a visão de equipe migrou para `/gestor/*`) e, se sim, considerar remover o código morto.
2. **Rotas implementadas sem entrada na sidebar:** `/analitico/consolidado`, `/atendimento`, `/config/planos`, `/feedback/atas`, `/registros/monitoria(+detalhe)`, `/registros/diario(+detalhe)`, `/dashboard` (placeholder legado). Confirmar se é intencional (features em rollout gradual) ou pendência de navegação.
3. **`docs/system/authentication.md`, `permissions.md`, `sidebar.md`, `docs/architecture.md`, `docs/conventions.md`, `docs/components.md`** são todos documentos escritos **antes da implementação** (templates ou drafts) e não refletem o código atual — precisam de atualização ou devem ser tratados só como histórico de design.
4. **`docs/pages/d-1-relatorio-supervisor.md`** parece descrever uma feature removida (usuário `relatorio` dedicado) — confirmar e, se obsoleta, marcar como tal no índice.
5. **Slug `meta_monitoria` vs `meta_monitorias`** — divergência entre `bases-kpi.md` e `src/lib/kpi/bases/types.ts`. Confirmar qual é o vigente.
6. **Dashboard de Retenção — meta duplicada e não sincronizada:** meta oficial no banco (`gestor_config_fantasia.meta_tx_retencao`, usada só para alertas) vs. meta em `localStorage` (usada para colorir o resto do painel). Provável débito técnico — confirmar se é intencional.
7. **Operacional — Quartil, modo "Empresa":** possível estouro do teto de 1000 linhas do PostgREST sem paginação/RPC — confirmar mitigação.
8. **Nome fantasia — 3 toggles "olho" (`olho_consolidado/tempo_logado/indisponibilidade`)** existem no banco/código mas não estão descritos em `config-supervisor-operadores.md` — confirmar propósito exato.
9. **Naming do produto:** convivência de "ANGELICAIS" (codinome interno/técnico) e "ALLOHA FIBRA" (marca exibida ao usuário em RV e Dashboard de Retenção) — confirmar qual deve ser usado daqui pra frente em novas telas.
10. **Ausência de `supabase/migrations/` versionado** — dificulta auditar RLS/schema real sem acesso direto ao dashboard do Supabase. Único SQL versionado é o da feature "DB" nova.

