# D-1 — Tempo Logado

## Objetivo

Mostrar ao operador o tempo logado no dia atual, o tempo restante 
para bater a meta de jornada (06:20:00), o horário estimado em que 
ele pode deslogar, e os horários reais de login/logout. Para 
gestores operacionais (AUX/ADM), mostrar também a visão completa 
da equipe.

A página é especialmente útil para operadores que logam atrasados 
e precisam saber até que horas devem ficar para completar a jornada.

## Rota

`/d-1/tempo-logado`

## Quem acessa

Mesmas regras do `/d-1/consolidado`:

- **OP / AUX / ADM** veem os próprios dados nos cards superiores
- **AUX / ADM** também veem tabela da equipe e fazem upload de CSV
- **GESTOR** é redirecionado para `/gestor/d-1`

## Regras de negócio

### Jornada padrão
- Login esperado: **14:00:00**
- Logout esperado: **20:20:00**
- Tempo logado diário esperado: **06:20:00**

### Cálculos (já feitos na planilha, site só lê)
- Tempo restante = `06:20:00 - tempo_logado` (limitado a `00:00:00`)
- Logout estimado = `hora_do_report + tempo_restante`
- Hora do report (F2) é gravada pelo sistema ao subir CSV via upload

### Tratamento de valores especiais
- Tempo logado `00:00:00` → operador não logou no dia
- Hora de login vazia → operador não logou
- Hora de logout `00:00:00` → operador logou mas não deslogou ainda (ou deslogou e logou de novo)
- Hora de logout vazia → operador não teve nenhum login

### Identificação do operador
Mesmo padrão das outras páginas: cruzar `username` do login com 
`email_corporativo` em `profiles`, e usar esse email para buscar 
os dados nas guias do Google Sheets.

### Auto-refresh
A cada 30 minutos de inatividade, a página recarrega (mesmo 
comportamento do consolidado, herda do layout `/d-1`).

## Fonte de dados

Mesma planilha `D1 - BASE 1`, três guias novas:

### Guia `BASE - 2` (não lida pelo site, só escrita pelo upload)
- Cabeçalho na linha 1
- Dados de A até K
- Limite: **50.000 linhas** (5× o da BASE - 1)

### Guia `TEMPO LOGADO` (lida pelo site)
Dados a partir da linha 2:

| Coluna | Conteúdo |
|---|---|
| A | Email do colaborador |
| B | Tempo logado em `HH:MM:SS` (`00:00:00` = sem login no dia) |
| C | Tempo restante para completar `06:20:00` |
| D | Logout estimado em `HH:MM:SS` |
| F2 | Hora do report (`HH:MM`) — gravada ao colar a base |

Limite de varredura: até linha 50 (suficiente para o time atual).

### Guia `LOGIN E LOGOUT` (lida pelo site)
Dados a partir da linha 2:

| Coluna | Conteúdo |
|---|---|
| A | Email do colaborador |
| B | Hora do login, formato `"Tue, 12 May 2026 14:08:35"` → extrair `HH:MM:SS`. Vazio = sem login. |
| C | Hora do logout, mesmo formato. `00:00:00` = não deslogou ainda. Vazio = sem login. |

Limite de varredura: até linha 50.

## Estrutura visual

### Header
- Título "D-1" + subtítulo "/ dia atual · tempo logado"
- Hora do report ("Atualizado às HH:MM")
- Tabs CONSOLIDADO / TEMPO LOGADO / INDISPONIBILIDADE (TEMPO LOGADO ativa)

### Bloco 1 — Cards de KPI individual

Layout: 1 card grande no topo + 3 cards menores em grid 3 colunas.

**Card grande — Logout estimado**
- Valor em `ds-display` (formato `HH:MM:SS`)
- Label "LOGOUT ESTIMADO"
- Microcopy abaixo: "horário em que você pode deslogar hoje"
- Cor neutra (sem regra condicional para este horário, conforme decidido)

**Card menor 1 — Tempo logado**
- Valor em `ds-display` reduzido (formato `HH:MM:SS`)
- Label "TEMPO LOGADO"
- Barra lateral colorida (efeito 7.6 do design system):
  - 🟢 Verde se ≥ `06:20:00`
  - 🟡 Amarelo se entre `05:00:00` e `06:19:59`
  - 🔴 Vermelho se < `05:00:00`
  - ⚪ Neutro (muted) se `00:00:00`

**Card menor 2 — Tempo restante**
- Valor em `ds-display` reduzido (formato `HH:MM:SS`)
- Label "TEMPO RESTANTE"
- Barra lateral verde se `00:00:00` (meta batida), neutra caso contrário
- Quando `00:00:00`, mostrar microcopy "meta atingida ✓"

**Card menor 3 — Login**
- Valor em `ds-mono` (formato `HH:MM:SS`)
- Label "HORÁRIO DE LOGIN"
- Barra lateral colorida:
  - 🟢 Verde se ≤ `14:05:00`
  - 🟡 Amarelo se entre `14:05:01` e `14:10:00`
  - 🔴 Vermelho se > `14:10:00`
  - ⚪ Neutro se vazio (mostra "—")

### Bloco 2 — Horários do dia

Card único, largura total, mostrando lado a lado:

- "Você logou às" → `HH:MM:SS` ou "—" se sem login
- Linha vertical separadora (`divider-gradient` rotacionada)
- "Você deslogou às" → `HH:MM:SS`, "—" se vazio, ou "ainda logado" se `00:00:00`

Visualmente integrado, sem ser uma tabela. Usar `ds-mono` nos horários para ar técnico.

### Bloco 3 — Tabela da equipe (apenas AUX e ADM)

Mesma estrutura visual da tabela do consolidado (heatmap, header escuro, linha "EQUIPE" no fim).

**Colunas:**
| Coluna | Conteúdo |
|---|---|
| Operador | Username (nome.sobrenome) |
| Tempo logado | `HH:MM:SS`, com cor de fundo conforme regra dos cards |
| Tempo restante | `HH:MM:SS`, sem heatmap |
| Logout estimado | `HH:MM:SS`, sem heatmap |
| Login | `HH:MM:SS`, com cor de fundo conforme regra |
| Logout | `HH:MM:SS` ou "—" / "ainda logado" |

**Linha de totais (EQUIPE):**
- Operador: "EQUIPE"
- Demais colunas: vazio ou "—" (não faz sentido somar horários nessa página)
- Alternativa: mostrar "X de Y logados" (contagem de operadores com tempo > 0)

**Botão "Copiar como imagem":**
Igual ao da página consolidado, com texto:
`Tabela de *TEMPO LOGADO* até *HH:MM*`

### Bloco 4 — Upload de CSV (apenas AUX e ADM)

Mesmo componente de upload do consolidado, mas apontando para a 
guia `BASE - 2`. Implementação técnica:
- Limite de linhas: **50.000**
- Colunas esperadas: **11** (A até K)
- Backup automático para guia `BASE - 2 (backup)`
- Grava hora em `TEMPO LOGADO!F2` ao concluir

## Componentes usados

- Componentes shadcn já instalados (Card, Input, Button)
- Recharts: **não usa** (sem gráficos nesta página)
- `D1Header` (compartilhado, ajustar subtítulo)
- `D1Tabs` (já existe)
- Novos componentes a criar em `src/components/d-1/tempo-logado/`:
  - `tempo-logado-cards.tsx` — bloco 1
  - `tempo-logado-horarios.tsx` — bloco 2
  - `tempo-logado-equipe-section.tsx` — bloco 3
  - `tempo-logado-equipe-table.tsx` — bloco 3 (tabela isolada)
  - `tempo-logado-copy-button.tsx` — bloco 3 (botão de copiar)
- Reutilizar `UploadSection` com variante de configuração (ou criar `UploadSectionTempoLogado` específico)
- Reutilizar `IdleRefreshWatcher` (vem do layout `/d-1`)

## Estados

### Loading
- Skeleton dos 4 cards superiores (1 grande + 3 menores) com shimmer
- Skeleton do bloco de horários
- Skeleton da tabela da equipe (linhas placeholder) para quem tem permissão

### Erro
- **Falha de leitura do Sheets:** card central com "tentar novamente"
- **Falha de upload:** toast vermelho com mensagem específica

### Vazio
- **Operador sem login no dia:** todos os cards mostram "—" ou `00:00:00` em cinza, com microcopy explicativo no card grande: "você ainda não fez login hoje"
- **Hora do report vazia (F2):** Header mostra "Aguardando base..."

### Sucesso
- Upload concluído: toast verde + reload automático após 3s

## Animações de entrada

Mesma coreografia do consolidado:
- Header + tabs aparecem primeiro (PageTransition)
- Card grande "logout estimado" entra com scale + fade
- 3 cards menores entram em stagger
- Bloco de horários faz fade-up
- Tabela da equipe entra por último (se visível)

Usar easing `[0.16, 1, 0.3, 1]` em tudo (token `ease-out-expo`).

## Acessibilidade

- Cards de KPI com `aria-label` descrevendo o status semântico  
  (ex: "Tempo logado: 5h30, abaixo da meta")
- Tabs de navegação herdam acessibilidade do componente compartilhado
- Tabela da equipe: cabeçalhos `<th>` semânticos
- Botão "copiar como imagem" tem feedback via toast (`role="status"` 
  já tratado pelo sonner)

## Responsividade

- **Desktop (≥ 1024px):** layout completo com grids
- **Tablet (640-1023px):** cards menores em 3 colunas mantidas, tabela com scroll horizontal se necessário
- **Mobile (< 640px):** todos os cards empilhados, tabela com scroll horizontal

## Observações

- A página é **mais simples** que o consolidado: sem gráficos, sem 
  lista de contratos, sem detalhamento de motivos. Foco em horários.
- A hora do report (`F2`) é gravada pelo upload no mesmo padrão do 
  consolidado (`L2`).
- Reutilizar o máximo possível da infraestrutura já criada para o 
  consolidado: helpers de parsing, padrão de elevações, classes 
  utilitárias, lógica de permissão.
- A guia `LOGIN E LOGOUT` é separada da `TEMPO LOGADO` para manter 
  responsabilidades claras: uma resume métricas, outra registra 
  eventos brutos.

## Versão

1.0 — criada antes da implementação. Atualizar após criar guias 
no Google Sheets e implementar a página.