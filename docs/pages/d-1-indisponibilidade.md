# D-1 — Indisponibilidade

## Objetivo

Mostrar ao operador a sua taxa de indisponibilidade do dia, com 
detalhamento dos tempos brutos de pausa, pausa particular e NR17 
(somatória das pausas de 10 e 20 minutos). Para gestores 
operacionais (AUX/ADM), mostrar a visão da equipe. Para 
administradores (ADM), mostrar adicionalmente o detalhamento de 
todas as pausas por operador.

A indisponibilidade é o tempo total em que o operador esteve 
indisponível para atender (somatória de todas as pausas), expresso 
como percentual do tempo logado.

## Rota

`/d-1/indisponibilidade`

## Quem acessa

- **OP / AUX / ADM** veem os próprios dados nos cards superiores
- **AUX / ADM** também veem a tabela de equipe (Bloco 2)
- **ADM** vê adicionalmente a tabela detalhada de pausas (Bloco 3)
- **GESTOR** é redirecionado para `/gestor/d-1`

## Regras de negócio

### Meta de indisponibilidade
- **🟢 Verde:** TX indisp ≤ **14,5%**
- **🔴 Vermelho:** TX indisp > **14,5%**
- **⚪ Neutro:** operador sem dados (não logou)

Sem faixa intermediária amarela. A regra é binária.

### Composição das pausas
- **NR17** = soma de Pausa 10 (col C) + Pausa 20 (col D). É a pausa obrigatória por norma trabalhista.
- **Pausa particular** (col E) = pausa pessoal do operador.
- **Tempo indisponível** (col B) = somatória bruta de tudo que tirou o operador do atendimento.

### Obrigações do operador (informativo)
- Mínimo de **06:20:00** logados no dia (já mostrado na página tempo-logado)
- **Duas pausas de 10 minutos** + **uma pausa de 20 minutos** = mínimo **40 minutos** de NR17/dia
- **Não tratar como deflator** se o operador tirar menos que 40 minutos de pausa total

### Base de dados compartilhada
Esta página **NÃO tem upload de CSV próprio**. A base é a mesma do tempo-logado (`BASE - 2`). Quando o operador AUX/ADM subir CSV em `/d-1/tempo-logado`, a hora gravada em `TEMPO LOGADO!F2` deve ser **replicada também** para a hora do report desta página.

**Implementação:** o upload do tempo-logado já grava em `TEMPO LOGADO!F2`. A página de indisponibilidade lê essa mesma célula como hora do report.

### Identificação do operador
Mesmo padrão das outras páginas: cruzar `username` do login com `email_corporativo` em `profiles`, e usar esse email para buscar dados nas guias.

### Auto-refresh
Herdado do layout `/d-1`: 30 minutos de inatividade → reload automático.

## Fonte de dados

Planilha `D1 - BASE 1`, duas guias novas:

### Guia `INDISP` (lida pelo site)
Dados a partir da linha 2:

| Coluna | Conteúdo |
|---|---|
| A | Email do colaborador |
| B | Indisponibilidade em % (número decimal, ex: `0.123` ou `12.3`) |
| C | Tempo logado em `HH:MM:SS` (espelho do tempo-logado, usado para cálculos auxiliares) |

Limite de varredura: até linha 50.

### Guia `PAUSA` (lida pelo site)
Dados a partir da linha 2. Todas as colunas de tempo em `HH:MM:SS`:

| Coluna | Conteúdo |
|---|---|
| A | Email do colaborador |
| B | Tempo indisponível (total bruto) |
| C | Pausa 10 (somatória das duas pausas de 10min) |
| D | Pausa 20 |
| E | Pausa particular |
| F | Pausa monitoramento ou tarefa |
| G | Treinamento ou reunião |
| H | Pausa feedback |
| I | Pausa pré pausa |
| J | Pausa ativo |
| K | Pausa take blip |
| L | Pausa 15 (não usada — NR17 é sempre 10 + 20) |
| M | Pausa 40 (não usada) |
| N | Pausa operacional |
| O | Pausa e-mail |
| P | Pausa indisponível |
| Q | Pausa sistema |

Limite de varredura: até linha 50.

**Cálculos derivados (feitos no site, não na planilha):**
- `NR17 = C + D` (somatória em segundos, formatada como `HH:MM:SS`)

## Estrutura visual

### Header
- Título "D-1" + subtítulo "/ dia atual · indisponibilidade"
- Hora do report ("Atualizado às HH:MM") — lê de `TEMPO LOGADO!F2`
- Tabs CONSOLIDADO / TEMPO LOGADO / INDISPONIBILIDADE (INDISPONIBILIDADE ativa)

### Bloco 1 — Cards de KPI individual

Layout: 1 card grande no topo + 3 cards menores em grid 3 colunas.

**Card grande — TX de indisponibilidade**
- Valor em `ds-display` (formato `XX.X%`)
- Label "TX INDISPONIBILIDADE"
- Coloração condicional:
  - 🟢 Verde se ≤ 14,5%
  - 🔴 Vermelho se > 14,5%
  - ⚪ Neutro se sem dados
- Microcopy: "meta: ≤ 14,5%"
- Background com gradiente ambient (mesma técnica dos cards do consolidado)

**Card menor 1 — Tempo indisponível**
- Valor em `ds-display` reduzido (formato `HH:MM:SS`)
- Label "TEMPO INDISPONÍVEL"
- Barra lateral neutra (é só informativo)

**Card menor 2 — Pausa particular**
- Valor em `ds-display` reduzido (formato `HH:MM:SS`)
- Label "PAUSA PARTICULAR"
- Barra lateral neutra

**Card menor 3 — NR17**
- Valor em `ds-display` reduzido (formato `HH:MM:SS`)
- Label "NR17 (10 + 20)"
- Barra lateral neutra
- Microcopy: "mínimo: 00:40:00"

### Bloco 2 — Tabela da equipe (apenas AUX e ADM)

Mesma estrutura visual da tabela do tempo-logado: 780px de largura máxima, header escuro, gradiente ambient na linha, botão "Copiar como imagem" alinhado à direita do título.

**Título:** `03 · Equipe`

**Colunas (nessa ordem):**

| Coluna | Conteúdo | Cor |
|---|---|---|
| Operador | username | — |
| Tempo indisponível | `HH:MM:SS` | neutra |
| NR17 | `HH:MM:SS` (calculado: C + D) | neutra |
| Pausa particular | `HH:MM:SS` | neutra |
| Indisp % | `XX.X%` + bolinha | verde/vermelho |

**Gradiente ambient na linha:**
- 🟢 Verde se indisp ≤ 14,5%
- 🔴 Vermelho se indisp > 14,5%
- ⚪ Neutro se sem dados

**Botão "Copiar como imagem":**
PNG apenas, sem texto acompanhante. Mesma estratégia técnica do tempo-logado (captura direta do elemento via `data-attribute`).

### Bloco 3 — Detalhamento de pausas (apenas ADM)

Tabela ampla, ocupa **toda a largura disponível** (sem upload ao lado).

**Título:** `04 · Detalhamento de pausas`

**Colunas (nessa ordem):**

| Coluna | Conteúdo |
|---|---|
| Operador | username |
| Pausa 10 | `HH:MM:SS` |
| Pausa 20 | `HH:MM:SS` |
| Particular | `HH:MM:SS` |
| Monitoramento/Tarefa | `HH:MM:SS` |
| Treinamento/Reunião | `HH:MM:SS` |
| Feedback | `HH:MM:SS` |
| Pré pausa | `HH:MM:SS` |
| Ativo | `HH:MM:SS` |
| Take blip | `HH:MM:SS` |
| Operacional | `HH:MM:SS` |
| E-mail | `HH:MM:SS` |
| Indisponível | `HH:MM:SS` |
| Sistema | `HH:MM:SS` |
| **Indisp %** | `XX.X%` + bolinha (última coluna) |

**Densidade:** Como são 15 colunas, usar fonte e padding menores que a tabela do bloco 2 (`ds-mono-sm` em vez de `ds-mono`, padding `2px 4px`). Sem comprometer legibilidade.

**Gradiente ambient na linha:** mesma regra do bloco 2 (verde/vermelho baseado na coluna Indisp %).

**Botão "Copiar como imagem":** PNG apenas, sem texto.

**Sem coluna de tempo bruto indisponível** aqui — o detalhamento já mostra a quebra por tipo de pausa.

## Componentes usados

- `D1Header` (compartilhado, subtitle="indisponibilidade")
- `D1Tabs` (já existe)
- Novos componentes em `src/components/d-1/indisponibilidade/`:
  - `indisp-cards.tsx` — Bloco 1
  - `indisp-equipe-section.tsx` — Bloco 2 (wrapper)
  - `indisp-equipe-table.tsx` — Bloco 2 (tabela)
  - `copy-indisp-equipe-button.tsx` — Bloco 2 (botão copiar)
  - `indisp-pausas-section.tsx` — Bloco 3 (wrapper)
  - `indisp-pausas-table.tsx` — Bloco 3 (tabela detalhada)
  - `copy-indisp-pausas-button.tsx` — Bloco 3 (botão copiar)
- Reutilizar `IdleRefreshWatcher` (vem do layout `/d-1`)

## Estados

### Loading
- Skeleton dos 4 cards superiores
- Skeleton das tabelas (linhas placeholder)

### Erro
- **Falha de leitura do Sheets:** card central com "tentar novamente"

### Vazio
- **Operador sem dados (não logou):** cards mostram `00:00:00` e `—` para a TX, com microcopy "você ainda não fez login hoje"
- **Hora do report vazia (`TEMPO LOGADO!F2`):** Header mostra "Aguardando base..."

### Sucesso
Renderiza dados normalmente.

## Animações de entrada

Mesma coreografia das outras páginas D-1:
- Header + tabs (PageTransition)
- Card grande de TX com scale + fade
- 3 cards menores em stagger
- Tabela de equipe (se visível) faz fade-up
- Tabela de pausas (se ADM) faz fade-up depois

Easing `[0.16, 1, 0.3, 1]` em tudo.

## Acessibilidade

- Cards com `aria-label` descrevendo status semântico
- Tabelas com `<th>` semânticos nos headers
- Botões de copiar com feedback via toast (sonner)

## Responsividade

- **Desktop (≥ 1280px):** layout completo
- **Tablet (768-1279px):** tabela detalhada com scroll horizontal
- **Mobile (< 768px):** todos os cards empilhados, ambas as tabelas com scroll horizontal

## Observações

- Página **mais densa em dados** que tempo-logado (especialmente o bloco 3 do ADM).
- A tabela detalhada (15 colunas) é o ponto mais sensível visualmente — pode precisar ajustes finos de tamanho de fonte e padding.
- **Não há upload de CSV** nesta página (compartilha base com tempo-logado).
- A hora do report é **lida** de `TEMPO LOGADO!F2`, não tem coluna própria.
- Reaproveitar utilitário `timeToSeconds()` de `tempo-logado/parse.ts` para somar Pausa 10 + Pausa 20 e gerar NR17 formatado.

## Versão

1.0 — criada antes da implementação. Atualizar após criar guias 
no Google Sheets e implementar a página.