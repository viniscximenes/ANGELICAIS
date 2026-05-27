# ATENDIMENTO

## Objetivo

Painel de apoio ao operador **durante a ligação ao vivo** com o cliente. 
Reúne em uma tela: calculadora de desconto baseada nas regras da empresa, 
montador de protocolo padronizado, e cards de performance em tempo real 
(TX/Churn parcial do mês).

O foco é **velocidade e padronização** — operador tem segundos pra decidir 
o que oferecer e pra registrar a ligação no AIR. Esta página reduz erro 
humano e elimina a necessidade de consultar PDFs/Excels paralelos.

## Rota

`/atendimento`

## Quem acessa

- **OP / AUX / ADM** — todos atendem, todos têm acesso
- **GESTOR** — redirecionado (gestora não atende ligação)

## Princípios

- **Página individual:** cada operador vê seus próprios números
- **Operação ao vivo:** layout otimizado pra consulta rápida (sem rolagem desnecessária)
- **Sem integração com sistema externo:** AIR (sistema da empresa) é separado por questão de segurança
- **Texto final é o produto:** protocolo é gerado pra ser **copiado** e colado no AIR
- **Política de desconto centralizada:** regras vêm de `/config/planos`, atualizáveis pelo ADM

## Estrutura visual

Layout em 2 colunas no desktop:

```
┌─────────────────────────────────┬─────────────────────────┐
│                                  │                          │
│  PROTOCOLO (esquerda)            │  DESCONTO (direita topo)│
│  Formulário guiado               │                          │
│  Geração de texto                │                          │
│                                  ├─────────────────────────┤
│                                  │  PERFORMANCE (direita   │
│                                  │  inferior)               │
│                                  │  TX/Churn parcial        │
│                                  │  Mês passado             │
└─────────────────────────────────┴─────────────────────────┘
```

No mobile, tudo empilhado em coluna única na ordem: Performance → Desconto → Protocolo.

## Bloco 1 — Calculadora de Desconto

Card grande, posição: coluna direita superior.

### Inputs do operador

1. **Marca** — dropdown (consumido de `/config/planos`)
2. **Plano** — dropdown filtrado pela marca selecionada (mostra "100M — R$69,99")
3. **Tem OTT?** — radio "Sim" / "Não" (operador define, não é puxado do plano)
4. **Tempo de cliente** — input numérico em meses

### Output: Ofertas Permitidas

Após preencher os 4 inputs acima, sistema mostra automaticamente **todas 
as combinações permitidas** pela política, em cards pequenos lado a lado.

Cada card de oferta exibe:
- % de desconto
- Duração (em meses)
- Valor final calculado: `valor_plano × (1 - desconto/100)`
- Botão "Selecionar" pequeno

Exemplo visual:

```
Plano: 100M — R$69,99 · Cliente: 8 meses · Sem OTT

OFERTAS PERMITIDAS:
┌───────────────────┐  ┌───────────────────┐
│  40% por 6 meses  │  │  20% por 12 meses │
│  R$ 41,99/mês     │  │  R$ 55,99/mês     │
│   [Selecionar]    │  │   [Selecionar]    │
└───────────────────┘  └───────────────────┘
```

### Política de desconto (referência)

As regras vivem em `/config/planos` (ver `config-planos.md`). Resumo atual:

**SEM OTT:**

| Tempo de cliente | Faixa de desconto | Duração |
|---|---|---|
| < 3 meses | 0–10% | 3 meses |
| 3–5 meses | 0–20% | 3 meses |
| 6 meses | 0–30% | 6 meses |
| 6 meses | 0–15% | 12 meses |
| ≥ 7 meses | 0–40% | 6 meses |
| ≥ 7 meses | 0–20% | 12 meses |

**COM OTT:**

| Tempo de cliente | Faixa de desconto | Duração |
|---|---|---|
| < 3 meses | 0–10% | 3 meses |
| 3–5 meses | 0–20% | 3 meses |
| ≥ 6 meses | 0–20% | 6 meses |
| ≥ 6 meses | 0–10% | 12 meses |

**IMPORTANTE:** valores **não são fixos** — são faixas. Operador pode 
escolher qualquer % entre 0 e o limite máximo da faixa. Sistema mostra 
o **máximo** como padrão sugerido + um slider/input pra ajustar.

### Slider de % desconto

Cada card de oferta tem internamente:
- Slider de 0 ao % máximo permitido
- Valor padrão = máximo da faixa
- Atualiza o "valor final" em tempo real conforme operador desliza

### Botão "Selecionar"

Ao clicar, a oferta é **registrada no estado da página** e fica disponível 
pro bloco de Protocolo. Visualmente:
- Card selecionado ganha borda primary + ícone de check
- Outras ofertas ficam opacity 0.5 (visual de "fora da seleção")
- Pode trocar a seleção clicando em outra

### Sem entrada / não preenchido

Quando faltam inputs:

```
Preencha marca, plano, OTT e tempo de cliente
para ver as ofertas permitidas.
```

## Bloco 2 — Montador de Protocolo

Card grande, posição: coluna esquerda (toda a altura).

### Estrutura: formulário em seções

#### Seção 1 — Dados confirmados

Único checkbox:
- ☐ **Dados confirmados** (CPF, contato, etc)

Quando marcado, vai pro protocolo como linha `dados ok`.

#### Seção 2 — Motivo do contato

Dropdown com os 6 motivos do D-1:
- Financeiro
- Mudança de Endereço
- Insatisfação com Serviço
- Insatisfação com Atendimento
- Mudança de Provedora
- Outros

Obrigatório. Vai pro protocolo como linha `cliente deseja cancelar por motivo {motivo}`.

#### Seção 3 — Resolução

Radio com 5 opções (somente 1 selecionada):

| Opção | Significado |
|---|---|
| **Retido com argumentação** | Convenceu na conversa, sem mexer em plano/desconto |
| **Retido com reparo** | Abriu reparo técnico (ticket) |
| **Retido com desconto** | Manteve plano, ganhou desconto (vem do Bloco 1) |
| **Troca de plano** | Mudou pra outro plano |
| **Cancelou** | Não reteve |

Campos extras aparecem conforme a opção escolhida.

##### Se "Retido com desconto":

- Mostra a oferta selecionada no Bloco 1 (read-only)
- Se nenhuma foi selecionada → erro: "Selecione uma oferta no card de Desconto"
- Vai pro protocolo: `cliente aceita oferta de {plano} {desconto}% por {duracao} meses`

##### Se "Troca de plano":

- Dropdown "Plano novo" — lista de planos (consumido de `/config/planos`)
- Vai pro protocolo: `cliente trocou para plano {plano_novo}`

##### Se "Retido com reparo":

- Input texto opcional "Número do ticket / observação"
- Vai pro protocolo: `cliente retido com abertura de reparo{ ticket #X}`

##### Se "Retido com argumentação":

- Sem campos extras
- Vai pro protocolo: `cliente retido com argumentação`

##### Se "Cancelou":

- Checkboxes "Ofertas recusadas":
  - ☐ Argumentação
  - ☐ Reparo
  - ☐ Troca de plano
  - ☐ Desconto
- Vai pro protocolo: `cliente recusou {lista das ofertas marcadas, separadas por vírgula}`
- Se nenhuma marcada → `cliente sem oferta aplicável`

#### Seção 4 — Avisos dados ao cliente

Checkboxes (todos opcionais):
- ☐ Ciente da fidelidade
- ☐ Ciente da multa proporcional
- ☐ Ciente do novo valor
- ☐ Outros (com input texto que aparece quando marcado)

Vai pro protocolo como linha `ciente da {lista dos avisos marcados}` 
(juntando com vírgula).

### Output: Texto do protocolo

Card na parte inferior do bloco com:

```
┌─────────────────────────────────────────────────────────┐
│  Protocolo gerado:                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ dados ok                                          │  │
│  │ cliente deseja cancelar por motivo financeiro     │  │
│  │ aceita oferta de 100M 40% por 6 meses             │  │
│  │ ciente da fidelidade, multa proporcional          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [ Copiar protocolo ]    [ Limpar tudo ]                │
└─────────────────────────────────────────────────────────┘
```

### Botão "Copiar protocolo"

- Copia o texto plano (sem formatação) pro clipboard
- Toast verde "Protocolo copiado"
- Ícone de check verde por 2s no botão (mesmo padrão do diário)

### Botão "Limpar tudo"

- Reseta todos os campos do bloco Protocolo + a seleção do Bloco 1
- Confirmação inline: "Confirmar?" antes de limpar (evita perda acidental no meio da ligação)

### Geração do texto — regras

- Linhas vazias são omitidas (se "dados confirmados" não marcado, não 
  vai a linha `dados ok`)
- Texto SEM emojis, sem markdown, sem caracteres especiais — formato 
  cru pra colar no AIR
- Quebra de linha entre seções

## Bloco 3 — Performance ao vivo

Card menor, posição: coluna direita inferior.

### Conteúdo

```
┌─────────────────────────────────────────────────┐
│  PERFORMANCE DEMONSTRATIVA                       │
│  (apenas referência, KPI final pode mudar)       │
│                                                  │
│  TX BRUTA: 62.5%                                 │
│  ────────────                                    │
│  Retidos: 47 + 3 (hoje) = 50                     │
│  Cancelados: 28 + 2 (hoje) = 30                  │
│  Pedidos: 80                                     │
│                                                  │
│  ─────────────────────────────────────────────   │
│                                                  │
│  Mês passado fechado: 67.2%                      │
└─────────────────────────────────────────────────┘
```

### Cálculo

- **Retidos** = retidos do KPI atual (mês corrente até ontem) + retidos do D-1 (hoje)
- **Cancelados** = cancelados do KPI atual + cancelados do D-1 (hoje)
- **Pedidos** = retidos + cancelados
- **TX bruta** = retidos / pedidos × 100

**Mês passado:** TX fechada do mês anterior (KPI passado). Sem cálculo, 
só leitura direta do que já fechou.

### Microcopy obrigatório

No topo do card:

> "Apenas demonstrativo. KPI final pode variar conforme fechamento da empresa."

### Cor do número da TX bruta

Mesma regra do gráfico de evolução do D-1:
- TX < 60% → var(--danger)
- 60% ≤ TX < 66% → var(--warning)
- TX ≥ 66% → var(--success)

### Auto-refresh

Atualiza junto com o D-1 (mesma lógica de revalidação ao colar CSV no D-1, 
ou refresh manual ao recarregar a página).

## Modelo de dados

### Sem persistência

Esta página **não salva nada no banco**. Tudo o que o operador preenche 
vive apenas no estado local da página. Ao recarregar, reseta.

### Consultas necessárias

- **Configuração de planos** — `planos_marca`, `planos`, `regras_desconto` 
  (definidos em `config-planos.md`)
- **D-1 do operador** — leitura via Google Sheets (já existe)
- **KPI atual do operador** — leitura via Google Sheets (já existe)
- **KPI passado do operador** — leitura via Google Sheets (já existe)

## Server actions

Esta página **não tem server actions**. É essencialmente client-side com 
leituras prontas (configurações via Supabase + dados de planilha já 
buscados pelo restante do sistema).

## Funções de leitura

`src/lib/atendimento/`:

- `get-marcas.ts` — lista marcas distintas de `planos_marca` (Supabase)
- `get-planos-por-marca.ts` — lista planos da marca (Supabase)
- `get-regras-desconto.ts` — regras vigentes (Supabase)
- `get-performance-operador.ts` — Soma D-1 + KPI atual + KPI passado pra um operador

## Helpers

`src/lib/atendimento/`:

- `compute-ofertas-permitidas.ts` — Dado tempo de cliente + OTT, retorna 
  array de combinações `{ maxDesconto: number, duracao: number }`
- `format-protocolo.ts` — Recebe o estado do formulário, retorna string 
  formatada pro clipboard
- `calc-tx-bruta.ts` — Helper de cálculo: (retidos_kpi + retidos_d1) / pedidos_total

## Componentes

`src/components/atendimento/`:

- `atendimento-layout.tsx` — Wrapper 2 colunas + responsivo
- `desconto-card.tsx` — Bloco 1 inteiro
- `desconto-marca-select.tsx`
- `desconto-plano-select.tsx`
- `desconto-tempo-input.tsx`
- `desconto-ott-radio.tsx`
- `desconto-ofertas-list.tsx`
- `desconto-oferta-card.tsx`
- `protocolo-card.tsx` — Bloco 2 inteiro
- `protocolo-section.tsx` — Subcomponente reutilizável para cada seção
- `protocolo-resolucao-fields.tsx` — Campos variáveis por resolução
- `protocolo-output.tsx` — Texto gerado + botões copiar/limpar
- `performance-card.tsx` — Bloco 3 inteiro

## Estados

### Loading inicial
- Skeleton dos 3 blocos
- Especialmente importante na performance (lê de várias fontes)

### Erro
- **Falha ao carregar configuração de planos:** mostra mensagem "Não foi 
  possível carregar a lista de planos. Recarregue a página." no card de Desconto
- **Falha ao carregar performance:** mostra "—" nos números do Bloco 3, 
  sem bloquear o resto da página

### Vazio
- **Sem planos cadastrados:** card de Desconto mostra "Nenhum plano configurado. 
  Solicite ao ADM cadastrar planos em /config/planos."
- **Operador sem dados de KPI ou D-1:** Bloco 3 mostra "—"

### Sucesso
- Copiar protocolo: toast + ícone check no botão
- Limpar: campos resetam

## Animações

- PageTransition no carregamento
- Cards entram em stagger leve (50ms entre cada bloco)
- Transição suave entre estados do Bloco 2 (resolução diferente revela campos diferentes)
- Card de oferta selecionada: borda anima de transparent → primary

## Acessibilidade

- Formulários com `<label>` associados a `<input>`
- Radio group com `role="radiogroup"`
- Botão "Copiar protocolo" com `aria-live="polite"` no feedback
- Ofertas permitidas: cada card focável por Tab, Enter seleciona

## Responsividade

- **Desktop (≥ 1024px):** layout 2 colunas
- **Tablet (640-1023px):** mantém 2 colunas mas com gaps menores
- **Mobile (< 640px):** tudo empilhado vertical. Ordem: Performance → Desconto → Protocolo

## Observações importantes

- Página é **estado-local**: não persiste nada. Refresh = perde tudo.
- Esta é uma ferramenta de **velocidade** — qualquer fricção (loading lento, 
  clique extra) atrapalha o atendimento. Otimizar pra responsividade.
- O texto gerado é **a entrega**. Investir em qualidade da formatação.
- A página assume que `/config/planos` já tem dados. Se vazio, exibe 
  estado vazio com instrução clara.
- **Sem integração com AIR** — operador continua copiando e colando 
  manualmente. Decisão técnica de segurança (AIR é da empresa).

## Versão

1.0 — criada antes da implementação.