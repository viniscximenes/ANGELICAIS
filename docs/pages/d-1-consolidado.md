# D-1 — Consolidado

## Objetivo
Página central do operador, mostra o consolidado do dia anterior em 
tempo quase real (atualização via planilha Google Sheets, refresh 
forçado a cada 30 min). Para operadores: visão dos próprios números 
e detalhamento de motivos. Para gestores/admin: visão da equipe 
inteira, com upload de base CSV e exportação de tabela como imagem.

## Rota
`/d-1/consolidado`

Nota: `/d-1` redireciona automaticamente para `/d-1/consolidado` (default).

## Quem acessa
- **Operador comum:** vê apenas a zona pública (cards + detalhamento 
  de motivos do próprio email).
- **Gestor / Admin (permissão `manage_base`):** vê tudo, incluindo 
  tabela completa de operadores e área de upload.

A divisão é controlada via permissão, não via role explícito. Quando 
o sistema de roles for criado, basta plugar a permissão `manage_base` 
nos roles apropriados.

## Regras de negócio

### Fonte de dados
- **Planilha Google Sheets:** `D1 - BASE 1`
- **Guias usadas pelo sistema:** `CONSOLIDADO`, `CONTRATOS`, `MOTIVO`
- **Guia `BASE - 1`:** NUNCA lida pelo sistema (muitos dados, pesaria). 
  Apenas escrita durante upload de CSV.

### Identificação do operador
- Usuário é identificado pelo **email** (formato `nome.sobrenome@alloha.com`).
- O sistema cruza o `username` do login (`nome.sobrenome`) com o email 
  ao buscar dados nas guias.
- Cada usuário cadastrado terá: nome completo, username, email da empresa.

### Auto-refresh
- A cada 30 minutos de **inatividade** (sem interação do mouse/teclado), 
  a página executa refresh automático para garantir dados atualizados.
- Refresh **re-lê** o Google Sheets (não re-processa CSV).
- Indicador visual sutil de "última atualização há X min" no topo.

### Tratamento de erros nos dados
- Valores `#DIV/0!` na tx de retenção aparecem como `—` (travessão).
- Operadores sem dados em alguma guia: linha aparece zerada, não some.
- Falha de leitura do Sheets: exibir estado de erro com botão "tentar 
  novamente". Não bloquear navegação para outras páginas.

### Permissões granulares
- `view_d1_personal` — ver os próprios dados consolidados e motivos
- `view_d1_team` — ver tabela completa de operadores
- `manage_base` — upload de CSV e cópia da tabela como imagem

## Estrutura visual

### Header da página (sempre visível)
- Título "D-1" em `ds-h1`
- Subtítulo dinâmico abaixo: "Resultado consolidado · atualizado há X min" 
  em `ds-small text-muted-foreground`
- Tabs de navegação abaixo do header da página (Opção A do layout):
  - **CONSOLIDADO** (rota atual, ativa)
  - **TEMPO LOGADO** (link para `/d-1/tempo-logado`)
  - **INDISPONIBILIDADE** (link para `/d-1/indisponibilidade`)

  As tabs aparecem em TODAS as três sub-páginas da seção D-1.

#### Bloco 1: Cards superiores

Layout em grid:

```
┌─────────────────────────────────────────────┐
│         CARD GRANDE — TX DE RETENÇÃO        │
│            (display number central)          │
│       "Atualizado às HH:MM" (rodapé)         │
└─────────────────────────────────────────────┘

┌────────────┐  ┌────────────┐  ┌────────────┐
│  RETIDOS   │  │ CANCELADOS │  │  PEDIDOS   │
│   (num)    │  │   (num)    │  │   (num)    │
└────────────┘  └────────────┘  └────────────┘
```

**Card grande (tx de retenção):**
- Span 3 colunas em desktop, full width em mobile
- Padding `space-8`
- Número em `ds-display` (Geist Mono, 48px+), centralizado
- Sufixo "%" em `ds-h2` ao lado do número, cor `text-muted-foreground`
- Rodapé do card: "Atualizado às HH:MM" em `ds-small text-muted-foreground`, 
  com ícone `IconClock` à esquerda
- Classe `elevation-2` ou `elevation-3` (é o protagonista da página)
- Considerar uso do efeito `7.2` do design system (borda iluminada accent)

**3 cards menores (retidos / cancelados / pedidos):**
- Grid de 3 colunas em desktop, empilhado em mobile
- Cada card: padding `space-6`, classe `elevation-1`
- Topo: label em `ds-small text-muted-foreground` (ex: "RETIDOS")
- Centro: número em `ds-display` (porém escala menor, sem o %)
- Barra lateral colorida (efeito 7.6 do design system):
  - RETIDOS → barra `--success`
  - CANCELADOS → barra `--danger`
  - PEDIDOS → barra `--primary` (violeta)

**Dados consumidos:**
- Operador comum: cruza email do usuário com coluna A da guia CONSOLIDADO 
  (linhas 2–50), pega B (retidos), C (cancelados), D (pedidos), E (tx).
- Gestor/admin: pega os totais da equipe nas células G2, H2, I2, J2 + L2 (hora).

#### Bloco 2: Detalhamento de motivos

Divisória `divider-gradient` separando do bloco anterior.

Título da seção em `ds-h2`: "Motivos"

Toggle no topo direito do bloco:
- Dois botões: "Cancelados" (ativo por padrão) | "Retidos"
- Visual: pill group com botão ativo destacado em violeta
- Ao trocar, o gráfico atualiza com animação suave (`motion-base`)

Gráfico de barras verticais (usando Recharts ou similar):
- Eixo X: nomes dos 6 motivos (Financeiro, Mud. Endereço, Ins. Serviço, 
  Ins. Atendimento, Mud. Provedora, Outros)
- Eixo Y: quantidade
- Cor das barras: violeta (`--primary`) com leve gradient vertical
- Tooltip ao passar: nome do motivo + quantidade + % do total
- Animação de entrada: barras "crescem" de baixo pra cima

**Dados consumidos (guia MOTIVO, filtrado pelo email do operador):**
- Toggle "Cancelados" → colunas B, C, D, E, F, G da linha do operador
- Toggle "Retidos" → colunas J, K, L, M, N, O da linha do operador 
  (operador identificado em I)
- Para gestor/admin: somar todos os operadores nas mesmas colunas

#### Bloco 3: Lista de contratos

Divisória `divider-gradient`.

Título em `ds-h2`: "Contratos"

Toggle similar ao do bloco anterior: "Cancelados" | "Retidos"

Campo de busca no topo direito:
- Input com ícone `IconSearch` à esquerda
- Placeholder: "Buscar por nome do cliente..."
- Filtra a lista em tempo real (debounced 200ms)

Lista renderizada como cards aninhados pequenos:
- Layout: grid de 2 colunas em desktop, 1 coluna em mobile
- Cada item:
  - Nome do cliente em `ds-body`
  - Código do contrato em `ds-mono ds-small text-muted-foreground` abaixo
  - Ícone `IconCopy` à direita, com hover destacado
  - Clique no item inteiro copia o código do contrato
  - Após copiar: feedback visual (item ganha borda `--success` por 1.5s + 
    toast "Contrato copiado" no canto inferior)
- Classe `elevation-1` em cada item, `radius-sm` (cards aninhados, regra 5.1)
- Estado vazio: ícone + texto "Nenhum contrato encontrado"

**Dados consumidos (guia CONTRATOS, filtrado pelo email do operador):**
- Toggle "Cancelados" → coluna B (contratos) + C (nomes)
- Toggle "Retidos" → coluna F (contratos) + G (nomes), operador em E
- **Parsing:** dividir string por "/", aplicar `trim()` em cada parte. 
  A ordem dos contratos casa com a ordem dos nomes (índice por índice).

### Zona restrita (apenas com `manage_base`)

Divisória `divider-gradient` reforçada (talvez com label "ÁREA DO GESTOR" 
discreto no meio).

#### Bloco 4: Tabela de operadores

Título em `ds-h2`: "Equipe"

Botão à direita do título: "Copiar tabela como imagem" 
- Variant: secondary
- Ícone `IconCamera` ou `IconCopy`
- Ao clicar:
  1. Gera PNG da tabela (usando biblioteca `html-to-image`)
  2. Compõe payload na área de transferência com:
     - Texto: "Resultado CONSOLIDADO das HH:MM"
     - Logo abaixo: a imagem PNG
  3. Toast: "Tabela copiada — cole onde quiser"

Tabela visual (NÃO uma simples `<table>`):
- Wrapper com classe `elevation-2`, padding `space-8`
- Header da tabela: 6 colunas — Operador | Nome | Retidos | Cancelados | Pedidos | Tx
- Linhas com hover sutil (background mais claro)
- Coluna "Tx" com barra de progresso visual ao lado do número:
  - Verde se ≥ meta (definir meta depois)
  - Amarelo se intermediário
  - Vermelho se baixo
- Tipografia: nomes em `ds-body`, números em `ds-mono`
- Linha de totais no final, separada por borda mais marcada:
  - Label "EQUIPE" + valores de G2/H2/I2/J2 + hora L2

**Dados consumidos:**
- Linhas 2–50 da guia CONSOLIDADO (colunas A–E)
- Linha de totais: G2, H2, I2, J2, L2

#### Bloco 5: Upload de base CSV

Divisória `divider-gradient`.

Título em `ds-h2`: "Atualizar base"

Área de drag-and-drop:
- Classe `elevation-1`, radius-lg, padding generoso (`space-12`)
- Borda tracejada (dashed) com cor `border`
- Centralizado: ícone `IconUpload` grande + texto "Arraste o CSV aqui 
  ou clique para selecionar"
- Aceita apenas `.csv`
- Drag-over: borda fica violeta com glow sutil

Após arrastar o arquivo:
- Mostra nome do arquivo + tamanho
- Botão "Processar" violeta abaixo

Ao clicar em "Processar":
- Inicia fluxo com feedback em etapas:
  1. "Limpando guia BASE - 1..." (com spinner)
  2. "Enviando dados..." (com barra de progresso se possível)
  3. "Aguardando recálculo da planilha..."
  4. "Atualizando visão..."
- Tempo total esperado: 10–30 segundos
- Se sucesso: toast verde "Base atualizada com sucesso" + refresh dos dados
- Se erro: toast vermelho com mensagem específica + log no console

**Regras do processamento:**
- Apaga todas as linhas da guia `BASE - 1` (mantém cabeçalho da linha 1)
- Limite de varredura: até 10.000 linhas
- Cola conteúdo do CSV a partir da linha 2
- Colunas vão até R (18 colunas)
- Sem armazenamento intermediário no Google Drive — fluxo direto: 
  navegador → API route Next.js → Google Sheets API

## Componentes usados

- `Card` (shadcn) — base de todos os blocos
- `Button` (shadcn) — toggles e ações
- `Input` (shadcn) — busca de contratos
- `Tabs` (shadcn) — filtros CONSOLIDADO / TEMPO LOGADO / INDISPONIBILIDADE 
  (instalar)
- `Tooltip` (shadcn) — explicações de KPIs (instalar)
- `Toast` (shadcn ou sonner) — feedbacks de ação (instalar)
- `Progress` (shadcn) — barras de tx + barra de progresso do upload (instalar)
- Recharts — gráfico de barras (instalar)
- `html-to-image` — geração de PNG da tabela (instalar)
- `react-dropzone` — drag-and-drop de CSV (instalar)
- `papaparse` — parsing de CSV no client (instalar)
- Ícones Tabler: `IconClock`, `IconSearch`, `IconCopy`, `IconCamera`, 
  `IconUpload`, `IconRefresh`, `IconAlertCircle`
- Componentes motion existentes: `PageTransition`, `FadeIn`, 
  `StaggerContainer`, `StaggerItem`

## Estados

### Loading inicial (primeira carga)
- Skeleton dos cards superiores (3 placeholders com shimmer)
- Skeleton do gráfico (retângulo grande com shimmer)
- Skeleton da lista de contratos (5 itens placeholder)
- Tudo respeitando dimensões finais para evitar layout shift

### Loading de refresh (auto ou manual)
- Indicador sutil no header: ícone `IconRefresh` girando + texto 
  "Atualizando..."
- Cards ficam ligeiramente apagados (opacity 0.6) durante o refresh
- Não bloqueia interação

### Loading de upload de CSV
- Overlay modal sobre toda a área de upload + tabela
- Cada etapa mostrada como passo na vertical, com checkmark verde 
  quando completa e spinner quando ativa
- Cancelar disabled (operação não pode ser interrompida no meio)

### Erro
- **Falha de leitura do Sheets:** mostrar card grande no centro da página 
  com ícone `IconAlertCircle`, mensagem clara e botão "Tentar novamente"
- **Falha de upload:** toast vermelho com detalhes + permite reenviar
- **Operador sem dados na guia:** mostra cards zerados + aviso discreto 
  "Você ainda não tem dados registrados hoje"

### Vazio
- Tabs TEMPO LOGADO e INDISPONIBILIDADE: ilustração + texto 
  "Em breve — esta visualização está em desenvolvimento"

### Sucesso
- Upload concluído: toast verde + dados atualizados visualmente
- Cópia de tabela: toast verde "Tabela copiada"
- Cópia de contrato: feedback inline (borda verde por 1.5s)

## Animações de entrada

Ao carregar a página:
1. **0ms** — PageTransition (fade-in geral)
2. **100ms** — Tabs aparecem (slide-down sutil)
3. **200ms** — Card grande de tx aparece (scale 0.95 → 1, opacity 0 → 1, 
   duração 600ms, ease-out-expo)
4. **300ms** — 3 cards menores entram via StaggerContainer (80ms entre cada)
5. **500ms** — Bloco de motivos faz fade-in
6. **600ms** — Bloco de contratos faz fade-in
7. **700ms** — Área restrita (se visível) entra com fade

Barras do gráfico animam "crescendo de baixo pra cima" ao carregar 
ou trocar toggle (duração 500ms, stagger 50ms entre barras).

## Acessibilidade

- Tabs navegáveis por teclado (Arrow keys)
- Toggle de "Cancelados/Retidos" como `role="tablist"`
- Lista de contratos: cada item focável com Enter para copiar
- Feedback de cópia anunciado para leitores de tela (`aria-live="polite"`)
- Gráfico tem alternativa textual: tabela com os mesmos dados visível 
  para screen readers (`sr-only`)

## Responsividade

- **≥ 1280px (desktop large):** layout completo com grids 3 colunas
- **1024px–1279px (desktop):** mantém grids mas com gaps menores
- **640px–1023px (tablet):** card grande full-width, 3 cards menores em 
  linha, gráfico full-width, lista de contratos em 1 coluna
- **< 640px (mobile):** tudo empilhado em coluna única, fonte do display 
  reduzida para `ds-h1`

## Observações

- A tabela exportada como PNG é **a entrega visual mais importante** para 
  gestores. Capricho extra no estilo, hierarquia, espaçamento e cores.
- A página é o "coração" do produto. Performance importa: lazy-load do 
  bloco de upload (apenas para quem tem permissão).
- Para o auto-refresh por inatividade, usar combinação de event listeners 
  (mousemove, keydown, scroll) com debounce + setTimeout.
- Toda fonte de dados é a planilha Google Sheets — não há banco intermediário 
  para essa página. Quando migrarmos para Supabase no futuro, esta página 
  vai precisar de uma camada de adaptação.
- Service Account do Google Cloud deve ter acesso de Editor à planilha 
  `D1 - BASE 1`. Configuração detalhada deve ficar em outro doc (técnico).

## Versão
1.0 — criada antes da implementação