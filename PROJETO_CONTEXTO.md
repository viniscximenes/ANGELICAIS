# PROJETO_CONTEXTO.md

> Levantamento rápido da base para servir de contexto inicial em conversas futuras.
> Gerado por leitura do código real em 2026-08-29. Onde algo não foi confirmado no
> código, está marcado como **[verificar]**.
>
> Nome interno do repo: `meu-projeto`. É um painel interno (Next.js) para gestão de
> operação de call center / retenção — reports de gestor, KPIs e "Painel Adm".

---

## 1) STACK TÉCNICA

| Tecnologia | Versão (package.json) | Papel neste projeto |
|---|---|---|
| **Next.js (App Router)** | `^15.0.0` | Framework. Tudo em `src/app`, com route groups `(auth)` e `(dashboard)`. Páginas são Server Components `async` que fazem auth + fetch no Supabase e passam dados prontos para componentes client. Server Actions (`"use server"`) para todas as mutações (`src/lib/**/actions/*`). `middleware.ts` faz refresh de sessão + RBAC de rota. |
| **React** | `^19.0.0` | UI. Componentes client (`"use client"`) para interatividade: tabelas, popovers de config, toggles, captura de imagem. Usa `useTransition` (ex.: troca de tema). |
| **TypeScript** | `^5` | `strict`. Paths `@/*` → `src/*` (`tsconfig.json`). Tipos de domínio ficam em `src/lib/**/types.ts`. |
| **Tailwind CSS v4** | `^4.3.0` (`@tailwindcss/postcss`) | Estilo. Import em `src/app/globals.css` via `@import "tailwindcss"`. Config é CSS-first (`@theme inline`, `@custom-variant dark`), sem `tailwind.config.js`. Tokens de tema como CSS vars (ver seção 4). |
| **tw-animate-css** | `^1.4.0` | Utilitários de animação por classe, complementa Tailwind. Importado no `globals.css`. |
| **Radix UI** | `radix-ui` `^1.4.3` | Primitivos acessíveis (Dialog, Popover, Tooltip, Switch, etc.). Wrappers em `src/components/ui/*` no estilo shadcn. |
| **shadcn** | `shadcn` `^4.7.0` + `components.json` | Padrão dos componentes `ui/`. `class-variance-authority`, `clsx`, `tailwind-merge` (helper `cn` em `src/lib/utils.ts`). `@import "shadcn/tailwind.css"` no globals. |
| **Supabase** | `@supabase/supabase-js` `^2.45.0` + `@supabase/ssr` `^0.5.0` | Banco (Postgres) + Auth. Três clients em `src/lib/supabase/`: `server.ts` (SSR, cookies), `middleware.ts` (refresh de sessão no edge), `admin.ts` (`createAdminClient`, service role — usado em ações de usuários / retention). Auth por usuário+senha; login monta email sintético `${username}@interno.angelicais.app` (`login-action.ts`). |
| **Recharts** | `^3.8.1` | Gráficos. Usado só em retenção/analítico: `retencao/grafico-evolucao.tsx` e `retencao/operador-detalhe-dialog.tsx` (evolução por hora). |
| **modern-screenshot** | `^4.7.0` | Exportação/cópia de tabela como imagem (`domToPng`). Wrapper central: `src/lib/utils/capturar-como-png.ts`. Ver seções 5 e 6. |
| **papaparse** | `^5.5.3` (+ `@types/papaparse`) | Parsing de CSV. Usado em: `components/d-1/upload-dropzone.tsx`, `lib/d1-db/parse-tempo-logado-csv.ts`, `lib/retencao/parse-base-retencao.ts`. |
| **react-dropzone** | `^15.0.0` | Zona de upload de arquivos (CSV do D-1 / tempo logado). |
| **@tabler/icons-react** | `^3.44.0` | Biblioteca de ícones (padrão em todo o sistema: `IconLoader2`, `IconCamera`, etc.). |
| **sonner** | `^2.0.7` | Toasts. `<Toaster>` montado no `RootLayout`, estilizado com CSS vars do tema. |
| **motion** (Framer Motion) | `^12.43.0` | Animações de transição: `components/motion/page-transition.tsx`, overlay de troca de tema (`theme-transition-overlay.tsx`). |
| **@bprogress/next** | `^3.2.12` | Barra de progresso de navegação (`components/dashboard/progress-provider.tsx`). |
| **lenis** | `^1.3.23` | Smooth scroll (`components/providers/lenis-provider.tsx`). |
| **three** | `^0.180.0` | **[verificar]** — provável fundo animado do login (`components/login/login-floating-background.tsx` / `FloatingLines.css`). Confirmar se ainda em uso. |
| **next/font/google** (Geist / Geist Mono) | — | Fontes: `--font-sans` (Geist), `--font-mono` (Geist Mono), definidas no `RootLayout`. |

**Não há biblioteca de PDF.** O item "exportação de PDF" do briefing **não existe hoje** no código — só exportação/cópia de **imagem PNG**. **[verificar]** se PDF é um requisito futuro.

Deploy: Vercel (`vercel.json`). Node 20 (`.nvmrc`).

---

## 2) ESTRUTURA DE ROLES E PERMISSÕES

### Roles que existem hoje
No código só existem **duas** roles (`UserRole = "ADM" | "GESTOR"` em `src/lib/auth/get-current-user.ts`; `ALL_ROLES_FOR_CREATION` em `src/lib/users/types.ts`).

- **GESTOR** — gestor de equipe. Vê o painel da própria equipe (reports, KPIs, config de equipe) e sobe a base do D-1. Permissões: `view_gestor_panel`, `manage_d1_base`.
- **ADM** — perfil **exclusivamente administrativo** ("Painel Adm"). **Sem nenhum acesso operacional / de gestão.** Permissões: `manage_base`, `manage_system`.

> **OP e AUX**: **não existem no código atual** (nenhuma referência a `"OP"` / `"AUX"` em `src/`). Se faziam parte de um modelo antigo, foram removidos/consolidados. **[verificar]** com o histórico do produto se precisam voltar.

### Onde o role é armazenado
Tabela **`profiles`** no Supabase (PK `id` = id do usuário no Supabase Auth). Campos relevantes:
- `role` — `"ADM"` ou `"GESTOR"`
- `is_admin_skill` — `boolean`, flag **aditiva** do multi-role (abaixo)
- `is_active` — `boolean` (usuário inativo é deslogado em `getCurrentUser`)
- `theme_preference` — `"dark" | "light"`
- outros: `username`, `full_name`, `email_corporativo`

### Caso MULTI-ROLE (gestor + skill de administrador)
- **Representação no banco:** `profiles.role = "GESTOR"` **+** `profiles.is_admin_skill = true`. Nunca há uma terceira role; `is_admin_skill` só faz sentido quando `role = "GESTOR"` (a Server Action `update-admin-skill-action.ts` recusa aplicar a flag a quem não é GESTOR).
- **Como a lógica combina os dois** (`src/lib/auth/permissions.ts`, função `can(role, permission, isAdminSkill)`):
  1. Se a role já tem a permissão nas suas próprias (`ROLE_PERMISSIONS`), libera.
  2. **Senão**, se `role === "GESTOR"` **e** `isAdminSkill`, também concede as permissões do **ADM** (`manage_base`, `manage_system`).
  - Resultado: GESTOR+skill = **união** de GESTOR e ADM, sem perder nada de gestor. ADM puro **não** é afetado pela flag.
- **Sidebar:** `getSidebarSectionsForRole(role, isAdminSkill)` (`components/dashboard/sidebar-sections.ts`) — o gestor+skill vê a seção "PAINEL ADM" **além** das seções de gestor.

### Página inicial pós-login (redirect)
Centralizado em `src/lib/auth/post-login-path.ts` (`getPostLoginPath`), usado por `login-action.ts`, `app/page.tsx` (raiz `/`) e `app/(auth)/login/page.tsx`. Decide por **permissão**, não por role literal:
- tem `manage_system` (ADM puro, **e** GESTOR+skill) → **`/bases/kpi`**
- tem `view_gestor_panel` (GESTOR) → **`/reports/consolidado`**
- fallback → `/reports/consolidado`

> Consequência: um **GESTOR+skill** cai em `/bases/kpi` no login (porque tem `manage_system`). **[verificar]** se essa é a landing desejada para o multi-role — o comentário em `post-login-path.ts` diz que "a landing do multi-role continua sendo a de gestor", mas o código manda para `/bases/kpi`. **Possível inconsistência (ver seção 6).**

### Controle de acesso a rotas por role
Duas camadas:

1. **Middleware** — `src/middleware.ts` → `src/lib/supabase/middleware.ts` (`updateSession`). Além do refresh de sessão:
   - Se o usuário tem `profile.role === "ADM"` e tenta acessar **qualquer rota fora de** `["/bases", "/configuracoes"]` (`ADMIN_ALLOWED_PREFIXES`), é **redirecionado para `/configuracoes/usuarios`** (`ADMIN_DEFAULT_PATH`).
   - Pula a checagem (e a query de `profile`) para `/login` e para os próprios prefixos administrativos (`SKIP_ROLE_CHECK_PREFIXES`).
   - `matcher` exclui `_next/static`, `_next/image` e arquivos de imagem.
   - Observação: o middleware só barra `role === "ADM"` literal. GESTOR+skill não é barrado aqui (correto — ele pode navegar em rotas de gestor).

2. **Proteção na própria página** (Server Component) — cada `page.tsx` do `(dashboard)` refaz a checagem:
   - Páginas **de gestor** (`/reports/*`, `/kpi/*`, `/configuracoes/equipe`): `if (user.profile.role !== "GESTOR") redirect(getPostLoginPath(...))`. Gate por **role literal** — ADM (mesmo com permissão `view_gestor_panel` no papel) não entra.
   - Páginas **administrativas** (`/bases/kpi`, `/bases/pausas`, `/configuracoes/usuarios`): `if (!can(role, <perm>, isAdminSkill)) redirect("/reports/consolidado")`. Gate por **permissão** — deixa passar ADM puro **e** GESTOR+skill.

3. **Layout** — `app/(dashboard)/layout.tsx` só redireciona para `/login` se não houver usuário; a filtragem de menu vem de `getSidebarSectionsForRole`.

### Rotas "operacionais" (gestor) vs "administrativas" (adm)
A divisão **canônica** está em `src/lib/supabase/middleware.ts`:
```
ADMIN_ALLOWED_PREFIXES = ["/bases", "/configuracoes"]
```
Tudo sob esses dois prefixos é **administrativo** (gated por `manage_base` / `manage_system`). **Qualquer outra rota é operacional** (gestor) e bloqueada por padrão para ADM puro — inclusive rotas novas que alguém esqueça de proteger na própria página.

- **Administrativas:** `/bases/kpi`, `/bases/pausas`, `/configuracoes/usuarios`.
- **Operacionais (gestor):** `/reports/consolidado` (+ `/analitico`), `/reports/tempo-indisponibilidade` (+ `/analitico`), `/kpi/operadores`, `/kpi/gestor`, `/configuracoes/equipe`.
  - ⚠️ `/configuracoes/equipe` está **sob `/configuracoes`** (prefixo administrativo) mas é uma tela **de gestor** (gate `role !== "GESTOR"`). Não conflita hoje porque a página gateia por role, mas quebra a regra "tudo em `/configuracoes` é adm" (ver seção 6).

---

## 3) MAPA DE PÁGINAS / ROTAS

Todas sob `src/app/(dashboard)/` salvo indicação. Auth: exige sessão (senão `/login`).

| Rota | Arquivo | Para que serve | Acesso | Particularidades |
|---|---|---|---|---|
| `/` | `app/page.tsx` | Redireciona para a landing do perfil | qualquer sessão | Usa `getPostLoginPath`. |
| `/login` | `app/(auth)/login/page.tsx` | Login (usuário + senha) | público | Email sintético `${username}@interno.angelicais.app`. Fundo animado (`login-floating-background`, `three` **[verificar]**). Já logado → redireciona. |
| `/reports/consolidado` | `reports/consolidado/page.tsx` | Painel do Gestor — consolidado do dia (D-1): retidos/cancelados/pedidos/TX retenção por operador + RV diário | **GESTOR** | `revalidate = 300`. Dados de `getGestorConsolidado`. Aplica **nome fantasia** (`resolverNomeExibicao`) e `formatNomeProprio` no nome da gestora. Botão "Copiar como imagem" (`CopyTableButton`, seletor `[data-tabela-png]`). |
| `/reports/consolidado/analitico` | `reports/consolidado/analitico/page.tsx` | Análise detalhada de retenção da equipe (visão geral, quartis, segmentos, temas, evolução por hora, por operador) | **GESTOR** | Renderiza `DashboardRetencaoSkeleton`. Fonte: base de retenção (`lib/retencao/*`). **Exclui status "Abortado"** de todos os cálculos (ver seção 5). Popup por operador com gráfico Recharts e export PNG (`operador-detalhe-dialog.tsx`). |
| `/reports/tempo-indisponibilidade` | `reports/tempo-indisponibilidade/page.tsx` | Painel do Gestor — tempo logado + % indisponibilidade por operador (base BASE-2) | **GESTOR** | `revalidate = 300`. Dois datasets do mesmo upload; se um vier vazio → tela de erro. Botões "Copiar como imagem" separados p/ Tempo Logado (`[data-tabela-png]`) e Indisponibilidade (`[data-indisp-png]`). Exportação **sempre força nome fantasia** (não respeita o "olho aberto"). |
| `/reports/tempo-indisponibilidade/analitico` | `reports/tempo-indisponibilidade/analitico/page.tsx` | Análise de aderência: real (tempo logado + indisponibilidade) x pausas programadas, com tolerância | **GESTOR** | Fonte: `d1_tempo_logado` + `d1_indisponibilidade` + `base_pausas_programadas`. `configAderencia.toleranciaMin`. Popup por operador exportável — **usa o padrão ANTIGO de PNG** (tema claro fixo `PNG_THEME`, `OperadorAnaliticoPngContent` + `ExportPopupPngButton`), diferente das outras telas (ver seção 6). Nome no arquivo = **nome real** (email antes do `@`), nunca fantasia. |
| `/kpi/operadores` | `kpi/operadores/page.tsx` | KPIs mensais por operador da equipe (atual / mês passado / retrasado + histórico sob demanda) | **GESTOR** | `dynamic = "force-dynamic"`. Equipe = roster de `d1_operadores_gestor` (Config → Equipe), não o meta_gestor. Colunas configuráveis (`kpi-colunas-config`). Aplica nome fantasia. Só meses `>= 2026-01-01`. Botão copiar imagem (`CopyKpiButton`, `[data-kpi-tabela-png]`). |
| `/kpi/gestor` | `kpi/gestor/page.tsx` | KPIs do **próprio gestor** (cards com metas) + "defasados por KPI" da equipe, 3 meses recentes + histórico | **GESTOR** | `dynamic = "force-dynamic"`. Metas configuráveis (`kpi-gestor-metas-popover`). Cálculo de mesRef atual/anterior/retrasado via `getDatePartsInBR`. |
| `/bases/kpi` | `bases/kpi/page.tsx` | **Painel Adm** — subir/gerir snapshots mensais de KPI (operadores e gestores) via colar/CSV | ADM puro **ou** GESTOR+skill (`can(manage_base)`) | Header "PAINEL DO ADM". `BasesKpiCards`. `enforceRetention` mantém só os **últimos 2 meses** de `kpi_monthly_snapshots` (`lib/kpi/bases/retention.ts`). Modal de override de mapeamento nome→email. **É a landing pós-login do ADM.** |
| `/bases/pausas` | `bases/pausas/page.tsx` | **Painel Adm** — colar a base de pausas programadas (horários) usada na aderência | `can(manage_system)` ⚠️ (não `manage_base`) | `PausasPasteForm` (colar do clipboard, `parse-pausas-clipboard`). ⚠️ Gate por `manage_system` embora esteja em `/bases` e a sidebar liste "Pausas" sob `manage_base` — inconsistência (seção 6). |
| `/configuracoes/equipe` | `configuracoes/equipe/page.tsx` | Painel do Gestor — CRUD do roster da equipe **+** apelidos (nome fantasia) numa lista só | **GESTOR** | `dynamic = "force-dynamic"`. Unificou duas telas antigas (`operadores-d1` + `operadores`). Remover operador apaga o apelido dele. Só operadores daqui aparecem nas tabelas de Consolidado/TL/Indisp/KPI. |
| `/configuracoes/usuarios` | `configuracoes/usuarios/page.tsx` | **Painel Adm** — CRUD de usuários (criar, editar, ativar/desativar, resetar/definir senha, atribuir role, ligar/desligar skill de admin) | ADM puro **ou** GESTOR+skill (`can(manage_system)`) | `getAllUsers` via `createAdminClient`. Modais em `components/config/usuarios/*`. `RoleBadge` (só ADM/GESTOR). Senha gerada (`generate-password`). Não pode alterar a si próprio na skill de admin. **Destino do redirect do middleware** quando ADM tenta sair da área adm. |

Componentes de seção principais por página:
- Consolidado → `components/gestor/gestor-equipe-section.tsx`
- Tempo/Indisp → `components/gestor/gestor-tempo-logado-indisp-section.tsx`
- Analítico retenção → `components/dashboard/retencao/*`
- Analítico TL/Indisp → `components/dashboard/tempo-indisponibilidade/*`
- KPI operadores → `components/operacional/kpi-equipe-section.tsx`
- KPI gestor → `components/gestor/kpi-gestor/*`

---

## 4) SISTEMA DE TEMA (CLARO / ESCURO)

### Onde ficam os tokens
`src/app/globals.css`, tudo em CSS custom properties:
- **`@theme inline { ... }`** — mapeia as vars para as classes utilitárias do Tailwind v4 (`--color-*`, escala tipográfica `--text-*` / `.ds-h1` etc., `--radius-*`, aliases semânticos `--color-success` → `--success`, elevation, motion).
- **`:root`** — **valores base (tema ESCURO)**. É a fonte da verdade do dark.
- **`[data-theme="light"]`** — **overrides do tema claro** (backgrounds com profundidade, `--primary` azul-petróleo escuro, sombras `--shadow-*`, hovers, etc.) + várias regras CSS extras específicas de light (sombra em cards, tabelas do gestor, sidebar, item ativo).
- **`.dark`** — repete o conjunto de vars do dark (redundante com `:root` por causa do `@custom-variant dark (&:is(.dark *))` do Tailwind e de libs que checam a classe).

> ⚠️ **Convenção crítica de estilo:** o **dark** é o default e mora em `:root`. Ajustes de tema **claro** vão em **`[data-theme="light"]`** (e, se preciso pelo Tailwind, na classe `.dark` para o escuro). **Não mexer em `:root` "para arrumar o claro"** — isso muda o escuro junto. Só alterar `:root`/`.dark` quando o pedido for explicitamente sobre o tema escuro. **[verificar]** contra o pedido original do usuário a frase exata "sempre ajustar só `:root`" — no código atual, o claro é `[data-theme="light"]`, não `:root`.

### Como funciona a troca
- Estado + lógica: `components/dashboard/theme-provider.tsx` (`ThemeProvider` / `useTheme`). Valor inicial vem do servidor: `RootLayout` lê `profile.theme_preference` (default `"dark"`) e seta `data-theme` + classe `dark` no `<html>` já no SSR (sem flash).
- `toggleTheme()`:
  1. Marca `pendingTheme`, mostra o **overlay** e liga `.theme-transitioning` (classe que **desliga todas as transições/animações CSS** — regra no fim do `globals.css`, fora de `@layer` de propósito).
  2. Espera o overlay ficar 100% visível (evento real do Framer Motion, não delay fixo).
  3. Aplica o tema no `<html>` (corte seco, sem animação) e persiste via `updateThemePreferenceAction` (Server Action → `profiles.theme_preference`). Rollback visual se a ação falhar.
  4. Espera 2× `requestAnimationFrame` + `SETTLE_BUFFER_MS` (80 ms), reativa transições, faz fade-out do overlay.
- **Tela de loading/blur na transição — SIM, ainda existe:** `components/dashboard/theme-transition-overlay.tsx`. `position: fixed; inset: 0; z-[10000]`, `backdrop-filter: blur(10px)`, fundo `rgba(255,255,255,.6)` (indo p/ claro) ou `rgba(0,0,0,.6)` (indo p/ escuro), spinner `IconLoader2` + texto "Aplicando tema claro/escuro...". Cores fixadas pelo tema **de destino** (`pendingTheme`) para não piscar. Fade-in 0.18s / fade-out 0.22s.
- Botão: `components/dashboard/theme-toggle.tsx` (fica desabilitado enquanto `isPending || isTransitioning`).

### Particularidades para quem for mexer em estilo
- Preferir **tokens semânticos** (`var(--foreground)`, `var(--muted-foreground)`, `var(--success)`, `--danger`, `--border`, `--card`, elevation) a cores cruas. Classes tipográficas `.ds-*` (`.ds-h1`, `.ds-body`, `.ds-mono-sm`...).
- Cores em **oklch** em todo o arquivo.
- `--row-border` para linhas de tabela densa.
- Textura de "grain" global via `body::before` (`--grain-opacity`).
- Há **muitos overrides `!important` só de light** em `[data-theme="light"]` (hover de botões, tabelas do gestor via `[data-equipe-table]` / `[data-tempo-logado-table]` / `[data-indisp-table]`, dropzone). Se um estilo "não pega" no claro, provavelmente está sendo vencido por uma dessas regras.
- Sidebar mantém `dark:bg-zinc-950` hardcoded no claro-vs-escuro em alguns pontos (comentado no CSS).
- Cada `page.tsx` de dashboard injeta um `<style dangerouslySetInnerHTML>` **duplicado** só para estilizar a scrollbar de `html/body` (ver seção 6).

---

## 5) PADRÕES ESTABELECIDOS A SEGUIR

### 5.1 Exportação / cópia de imagem (padrão ATUAL)
- **Sempre usar `capturarComoPng(alvo, opcoes)`** de `src/lib/utils/capturar-como-png.ts` — **não** chamar `domToPng` cru. Ele: `scale` 3 (default), padding de respiro de 28px preenchido com `--background` **do tema atual da sessão** (via `resolverTokenCss("--background")`), força `width/height` para não cortar conteúdo.
- **Fidelidade ao site:** capturar **o mesmo componente que está na tela** (mesmo `StyledCard`, mesmas cantoneiras/`corners`, mesmo cabeçalho de tabela, respeitando tema claro/escuro). **Nada de template "excel" hardcoded à parte.** Ex.: `gestor-tempo-logado-indisp-section.tsx` renderiza wrappers **offscreen** (`position: fixed; top: -99999px`) com o mesmo `StyledCard`, marcados por `data-*-png`; `retencao/operador-detalhe-dialog.tsx` captura o próprio `pngRef` do dialog.
- **Moldura de cantos decorativos:** `components/gestor/styled-card.tsx` (`<StyledCard withGradient corners="all|left|right|none">`, `CardDecorator`). Cards em sequência usam `corners="left"` / `"none"` / `"right"`.
- **Nome fantasia FORÇADO na exportação:** a imagem **sempre** sai com nome fantasia, **independente** de o gestor estar com o "olho aberto" (nomes reais) na tela. Ex. explícito em `gestor-tempo-logado-indisp-section.tsx` (~L229): `olhoAberto` **não** é repassado aos wrappers de PNG de propósito.
- **Texto do report fica como TEXTO, não dentro da imagem:** título + subtítulo montados em HTML (`buildClipboardReportHtml` em `src/lib/gestor/build-clipboard-report-html.ts`); a imagem capturada é só a tabela. Cópia via `execCommand("copy")` sobre um `contenteditable` offscreen (preserva estilos inline no Teams/Slack/email), com fallback para `ClipboardItem` `text/html`.
- Botões que seguem esse padrão: `d-1/copy-table-button.tsx`, `gestor/copy-tempo-logado-button.tsx`, `gestor/copy-indisponibilidade-button.tsx`, `operacional/copy-kpi-button.tsx`, `dashboard/export-popup-png-button.tsx` (download `.png`).
- **NÃO existe hook/função única de alto nível** ("useExport") — só o helper `capturarComoPng`. Cada botão reimplementa `escapeHtml` + `copyFormattedHtml` (~40 linhas duplicadas). Ver seção 6.

### 5.2 Regra de nomes (real x fantasia)
- Config por gestor no banco: `gestor_config_fantasia` (`ativo` + flags `olho_*`) e `operador_nome_fantasia` (`operador_email` → `nome_fantasia`). Lida por `src/lib/gestor/nome-fantasia/get-config.ts`.
- Resolver de exibição: **`resolverNomeExibicao(email, config)`** (`src/lib/gestor/nome-fantasia/aplicar-fantasia.ts`):
  1. se fantasia inativa → nome derivado (`deriveNomeOperador`);
  2. se há apelido para o email → usa;
  3. tenta variantes de domínio do email (`getEmailVariants` — ex. `@alloha.com` ↔ legado `@sumicity.net.br`);
  4. fallback = nome derivado.
- **Toggle "olho"** (`olho_consolidado` / `olho_tempo_logado` / `olho_indisponibilidade` / `olho_operacional`): revela nomes **reais** na tela por seção. **Nunca** propagar para exportação (ver 5.1).
- **Title Case para nome completo:** **`formatNomeProprio(nome)`** em `src/lib/gestor/derive-nome-operador.ts` — trim, split por espaço, cada palavra `Xxxx` (1ª maiúscula, resto minúsculo). Usar **sempre que exibir `user.profile.fullName` / nome de gestora** (headers de página, sidebar, nome no arquivo de export). Já aplicado em todas as `page.tsx` do gestor e do Painel Adm.
- Outros helpers no mesmo arquivo: `deriveNomeOperador(email)` (parte local do email, lowercase) e `formatNomeDotSobrenome(raw)` (qualquer coisa → `nome.sobrenome`, remove acentos, ignora preposições, trata `SMTP:` e emails).
- No PNG do analítico TL/Indisp, o nome do arquivo é **nome real** explicitamente (`operador-analitico-png-content.tsx`: "Sempre o nome real ... nunca nome fantasia").

### 5.3 Exclusão do status "Abortado" no cálculo de retenção
- Constante: `STATUS_RETENCAO_ABORTADO = "Abortado"` e `classificarAtendimento(row)` → `"retido" | "cancelado" | "abortado"` em `src/lib/retencao/classificar-atendimento.ts`. Comparação **case-insensitive** + `trim`. "Abortado" tem prioridade sobre `foi_cancelamento`.
- **Regra:** "Abortado" = validação FaceID sem resposta do cliente → **não é desfecho de retenção nem de cancelamento**. Fica **fora do numerador e do denominador** de TX RETENÇÃO e **fora de PEDIDOS** (`PEDIDOS = RETIDOS + CANCELADOS`).
- Aplicada com `if (classe === "abortado") continue;` em **todo** o `src/lib/retencao/*`: `get-por-operador(-individual)`, `get-por-segmento`, `get-por-tema`, `get-evolucao-hora`, `get-visao-geral`, e no filtro `get-contratos-filtrados.ts` (`.eq("foi_cancelamento", false).not("status_retencao","eq", "Abortado")`). Também no upload: `upload-consolidado-action.ts` (~L98).
- `ABORTADO` só aparece na UI de contratos quando o filtro de status é "todos".
- **Ao criar qualquer nova métrica/agregação de retenção: replicar o `continue` de abortado.**

### 5.4 Outros padrões
- **Server Actions para toda mutação**, em `src/lib/**/actions/*.ts` (`"use server"`), retornando `{ success: true } | { success: false, error }` e chamando `revalidatePath`. Erros de ação "stale" tratados por `src/lib/utils/handle-stale-action-error.ts`.
- **Acesso a rota administrativa:** gatear com `can(role, perm, isAdminSkill)`, **nunca** com `role === "ADM"` literal (quebra o multi-role). Rota de gestor: `role !== "GESTOR"` literal é o padrão atual.
- **Landing / raiz:** sempre via `getPostLoginPath` — nunca hardcode de rota pós-login.
- **Datas:** helpers de Brasília em `src/lib/utils/format-datetime-br.ts` (`getDatePartsInBR`, `formatDateBR`); TZ `America/Sao_Paulo`. `mesRef` no formato `YYYY-MM-01`.
- **KPI mensal:** retention de **2 meses** em `kpi_monthly_snapshots` (`enforceRetention`, chamar **antes** do upsert). KPIs "virtuais" (ex. `retidos_brutos`) não têm linha em `kpi_definitions` — label vem de `VIRTUAL_KPI_LABELS`.
- **Nome do wrapper `ui/`:** primitivos shadcn com `data-slot="..."`; estender via `cn(...)` e CVA, não reescrever.
- **Ícones:** sempre `@tabler/icons-react`. **Toasts:** sempre `sonner` (`toast.success/error`).

---

## 6) DÍVIDAS TÉCNICAS / PONTOS DE ATENÇÃO

1. **Dois padrões concorrentes de exportação de imagem.**
   - *Atual:* captura o componente real da tela, respeita o tema (`capturarComoPng` + wrappers offscreen com `StyledCard`). Usado em Consolidado, Tempo Logado, Indisponibilidade, KPI operadores, popup de retenção.
   - *Antigo:* tema **claro fixo** hardcoded (`components/dashboard/export-popup-png-theme.ts` → `PNG_THEME`, `PNG_TH_STYLE`, etc.) com um componente-espelho dedicado (`operador-analitico-png-content.tsx`). Usado só no **popup do analítico de Tempo Logado & Indisponibilidade** (`operador-analitico-dialog.tsx` + `ExportPopupPngButton`).
   - → Uniformizar para o padrão atual e aposentar `PNG_THEME` / `OperadorAnaliticoPngContent`.

2. **Lógica de "copiar como imagem" duplicada em 4 botões.** `escapeHtml`, `copyFormattedHtml` (execCommand + fallback ClipboardItem) e o boilerplate de estado `idle/copying/done` estão copiados em `copy-table-button.tsx`, `copy-tempo-logado-button.tsx`, `copy-indisponibilidade-button.tsx`, `copy-kpi-button.tsx`. Extrair um hook `useCopyAsImage({ selector, titulo, subtitulo, altText })`.

3. **`getPostLoginPath` manda GESTOR+skill para `/bases/kpi`.** O comentário do arquivo diz que a landing do multi-role "continua sendo a de gestor", mas como o gestor+skill tem `manage_system`, o primeiro `if` o joga em `/bases/kpi`. Confirmar a intenção; se a landing deve ser de gestor, inverter a ordem dos checks ou tratar `role === "GESTOR"` primeiro.

4. **`/bases/pausas` gateia por `manage_system`, não `manage_base`.** Está sob `/bases` e a sidebar lista o item "Pausas" na seção `permission: "manage_base"`. Para ADM puro tanto faz (tem as duas), mas a incoerência confunde. Alinhar o gate da página com a permissão da seção.

5. **`/configuracoes/equipe` é tela de gestor sob prefixo administrativo.** Quebra a regra "tudo em `/configuracoes` é administrativo" do middleware. Funciona porque a página gateia por `role === "GESTOR"`, mas se alguém confiar só no prefixo para auditar RBAC, erra. Considerar mover para `/equipe` ou `/configuracoes-gestor/equipe`.

6. **`<style dangerouslySetInnerHTML>` de scrollbar duplicado** em ~6 `page.tsx` (Consolidado, Tempo/Indisp, KPI gestor, KPI operadores, Bases KPI...). Bloco idêntico. Mover para `globals.css` (já existe `.scrollbar-tema` — bastaria aplicar em `html, body`) ou um componente único.

7. **`.dark` e `:root` repetem o mesmo conjunto de tokens** no `globals.css`. Manutenção precisa alterar nos dois lugares. Avaliar consolidar (ex.: só `:root` + `[data-theme="light"]`, e a classe `.dark` só onde libs exigem).

8. **`three` no `package.json`** — pesado; confirmar se `login-floating-background` realmente usa (há também `FloatingLines.css` e `lenis`/`motion`, que poderiam cobrir o efeito). Se não usar, remover.

9. **Roles OP/AUX no briefing não existem no código.** Se o roadmap prevê reintroduzi-las, `permissions.ts` (`ROLE_PERMISSIONS`), `get-current-user.ts` (`UserRole`), `RoleBadge`, `ALL_ROLES_FOR_CREATION` e os gates `role !== "GESTOR"` de cada página precisarão ser revistos.

10. **Dois nomes derivados de "nome do operador" próximos** (`deriveNomeOperador` retorna o email lowercased, não capitaliza; o docstring fala em "Willian Souza" mas o corpo não faz isso). Verificar se o comportamento bate com a expectativa de quem chama.

11. **`getCurrentUser` é chamado várias vezes por request** (RootLayout, layout do dashboard, cada page.tsx, várias actions) — cada chamada = 1–2 queries ao Supabase. O layout já tenta mitigar passando o user resolvido para header+sidebar, mas as páginas refazem. Avaliar cache por request (`React.cache`).
