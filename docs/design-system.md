# Design System — ANGELICAIS

Documento oficial de design do projeto. Toda página, componente e decisão visual deve referenciar este arquivo. Mudanças aqui afetam o site inteiro — discutir antes de alterar.

---

## 1. Princípios visuais

A alma do design. Tudo abaixo serve a estes princípios.

**1.1 Funcional acima de tudo**
Este é um dashboard de KPI. Dado é o protagonista. Números grandes, hierarquia clara, leitura rápida. Decoração nunca compete com informação.

**1.2 Dark sofisticado, não brutalista**
Fundo escuro profundo (não preto puro). Cards levemente elevados que respiram. Inspiração: IndustryOS, Linear, Resend. NÃO: Vercel minimalista puro, brutalismo, terminal cru.

**1.3 Monospace com personalidade**
Geist Mono nos números, valores e métricas. Geist Sans no resto. O monospace dá o ar técnico/dados sem virar terminal.

**1.4 Gradientes como destaque pontual**
Efeitos coloridos (incluindo o arco-íris cônico) são decorativos de UM elemento por tela. Espalhar = poluição.

**1.5 Criatividade nos detalhes estruturais**
Divisórias, bordas, headers de seção e separadores podem (e devem) ter personalidade. Não é minimalismo vazio.

**Tom:** técnico, sério, sofisticado, premium.
**NÃO é:** divertido, colorido, lúdico, corporativo cinza, minimalista vazio.

---

## 2. Paleta

### 2.1 Accent principal
**Indigo / Violeta** — usado em CTAs, links, destaques, elementos decorativos (gradientes, glows, bordas iluminadas).
Tokens já definidos pelo preset radix-nova no `globals.css` (`--primary`, etc.).

### 2.2 Cores semânticas (status de metas)
Comunicam exclusivamente status de dados. Nunca usar como decoração.

| Status | Cor | Significado |
|---|---|---|
| 🟢 Verde | sucesso | Meta atingida ou acima |
| 🟡 Amarelo | atenção | Próximo da meta, alerta moderado |
| 🔴 Vermelho | crítico | Abaixo da meta, atenção urgente |

### 2.3 Neutros
Escala Mist (já no preset). Usar para fundos, textos, bordas e divisórias.

### 2.4 Regra de ouro
Cores semânticas **só** comunicam status. Verde nunca é decorativo. Violeta nunca indica sucesso. Isso evita confusão visual e mantém o sistema legível.

---

## 3. Tipografia

**Fontes:** Geist Sans (UI) + Geist Mono (números, valores, códigos).

### 3.1 Escala

| Nível | Tamanho | Peso | Fonte | Uso |
|---|---|---|---|---|
| Display | 3rem (48px) | 600 | Geist Mono | Números gigantes de KPI ("248", "99.8%") |
| H1 | 1.875rem (30px) | 600 | Geist Sans | Título da página |
| H2 | 1.25rem (20px) | 600 | Geist Sans | Título de seção |
| H3 | 1rem (16px) | 500 | Geist Sans | Título de card |
| Body | 0.875rem (14px) | 400 | Geist Sans | Texto padrão, descrições |
| Small | 0.75rem (12px) | 400 | Geist Sans | Labels, legendas |
| Mono | 0.875rem (14px) | 400 | Geist Mono | Valores, timestamps, IDs |
| Mono-sm | 0.75rem (12px) | 400 | Geist Mono | Códigos curtos, datas compactas |

### 3.2 Pesos permitidos
Apenas **400, 500, 600**. Nada de 700+ (fica pesado demais em dark).

### 3.3 Line-height
- Display / H1: **1.1**
- H2 / H3: **1.3**
- Body / Small: **1.5**

### 3.4 Letter-spacing
- Display / H1: **-0.02em** (tracking negativo para elegância em tamanhos grandes)
- Demais: **0** (default)

### 3.5 Princípios
- Display em monospace é a alma técnica do site — números parecem "medidos", não "decorados".
- Em dashboards raramente se precisa de H4. Se precisar, usar H3 com cor mais apagada.

---

## 4. Espaçamento

Escala baseada em **4px**. Nunca usar valores fora desta escala.

| Token | Valor | Uso típico |
|---|---|---|
| `space-1` | 4px | Gap entre ícone e texto, padding mínimo |
| `space-2` | 8px | Padding de badge, gap entre itens próximos |
| `space-3` | 12px | Padding de input, gap entre elementos relacionados |
| `space-4` | 16px | Padding padrão de card pequeno, gap padrão |
| `space-5` | 20px | Padding interno de card médio |
| `space-6` | 24px | Padding de card grande, separação entre seções pequenas |
| `space-8` | 32px | Margem entre cards no grid |
| `space-10` | 40px | Padding lateral de página em tablet |
| `space-12` | 48px | Padding lateral de página em desktop, gap entre grandes seções |
| `space-16` | 64px | Margem superior de página, separações dramáticas |

### 4.1 Regras
- **Dentro de um card:** padding `space-6` (24px) é o padrão para cards de KPI.
- **Entre cards no grid:** gap `space-6` (24px) — consistência com o padding interno.
- **Página:** padding lateral `space-12` (48px) em desktop, `space-6` (24px) em mobile.
- **Densidade comunica relação:** elementos relacionados ficam agrupados com `space-2/3`; não-relacionados com `space-6/8`.

---

## 5. Radius (cantos arredondados)

Estilo **médio** — visivelmente arredondados, sem exagero. Comunica moderno equilibrado.

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 6px | Badges, tags, indicadores pequenos, cards aninhados |
| `radius-md` | 8px | Inputs, botões |
| `radius-lg` | 10px | Cards padrão (valor base do projeto) |
| `radius-xl` | 14px | Cards grandes de destaque, modais |
| `radius-2xl` | 20px | Containers especiais (hero, destaque máximo) |
| `radius-full` | 9999px | Pílulas, avatares, botões redondos |

### 5.1 Regra de aninhamento
Card dentro de card segue hierarquia **decrescente** de radius. Quanto mais aninhado, menos arredondado. Isso comunica visualmente "este elemento faz parte do card pai".

- Card externo (KPI principal): `radius-lg` (10px)
- Card interno (status de meta, sub-métrica): `radius-sm` (6px)
- Botões dentro desse card interno: `radius-md` (8px) — diferente o suficiente para não confundir com card

### 5.2 Reforço visual para não-clicáveis
Cards de status/meta aninhados **NUNCA** devem parecer botões. Sem `cursor: pointer`, sem hover effect, sem sombra ao passar o mouse. Reservar esses sinais apenas para elementos interativos.

---

## 6. Sombras e elevação

Em dark mode, sombras pretas não funcionam (preto sobre preto não se vê). Usar técnicas alternativas.

### 6.1 Técnicas

**1. Borda sutil (principal)**
A "sombra" em dark é uma borda fina mais clara que o fundo.
```css
border: 1px solid rgba(255,255,255,0.06);
```

**2. Background diferencial**
Card é levemente mais claro que o fundo da página. Elevação por luminosidade, não por sombra.

**3. Glow violeta (pontual)**
Sombra colorida com a cor do accent, blur alto, opacidade baixa. Uso restrito.
```css
box-shadow: 0 0 40px rgba(violeta, 0.15);
```

### 6.2 Escala de elevação

| Token | Uso |
|---|---|
| `elevation-0` | Fundo da página (sem nada) |
| `elevation-1` | Card padrão (borda sutil + bg levemente mais claro) |
| `elevation-2` | Card em hover ou destaque (bg mais claro + borda um pouco mais visível) |
| `elevation-3` | Modais, popovers (bg ainda mais claro + glow violeta sutil) |
| `elevation-glow` | Card decorativo especial (glow violeta forte) |

### 6.3 Regras
- **Proibido sombra preta** em qualquer lugar. Sempre borda + bg.
- **Glow violeta** reservado para: hover de botão primário, card de destaque do mês, estados de foco em inputs.
- **Hover em cards informativos** (KPI estáticos): só muda borda, sem mover o card, sem cursor pointer.
- **Hover em cards clicáveis**: borda mais clara + leve elevação + cursor pointer.

---

## 7. Efeitos decorativos criativos

Catálogo de efeitos disponíveis. **Regra macro:** máximo 2 a 3 efeitos decorativos ativos por tela. Se aparecerem em todo lugar, viram ruído.

### 7.1 Divisória com gradiente
Linha 1px que desbota nas pontas (transparente → cinza claro → transparente). Usar entre seções da página, não dentro de cards.

### 7.2 Borda iluminada (accent glow border)
Card com borda violeta sutil + glow externo. Reservado para **UM** card de destaque por tela.

### 7.3 Conic gradient arco-íris (efeito assinatura)
Gradiente cônico animado rotacionando lentamente, com `mask` para aparecer só na borda. Reservado para **UM único elemento icônico** do site (provavelmente o card principal de KPI do gestor ou um header especial). Se usar em mais de um lugar, perde o impacto.

### 7.4 Número índice em monospace
Antes de títulos de seção: `01 · Performance`, `02 · Operadores`. Cor do número: cinza médio apagado. Título em branco.

### 7.5 Indicador de status com pulse
Bolinha colorida (verde/amarelo/vermelho) com animação de pulso suave ao lado de métricas em tempo real. Não usar em métricas estáticas.

### 7.6 Barra lateral colorida no card
Faixa vertical de 3px no canto esquerdo do card, colorida conforme status da meta. Comunica status sem texto. Útil em listas/grids de operadores.

### 7.7 Grain texture sutil
Ruído quase imperceptível no fundo da página (opacity 0.02–0.04). Tira o "plástico" do dark puro, dá textura cinematográfica. Aplicado uma vez no body, não em cards.

### 7.8 Hover com border-gradient animado
Em botões primários e cards clicáveis principais: borda que ganha gradiente violeta animado no hover. Sutil, não chamativo.

---

## 8. Movimento e fluidez

A diferença entre site amador e premium está aqui. Não é decoração — é a sensação de "peso" e "elegância" que o olho percebe sem saber explicar.

### 8.1 Scroll suave
Implementar **Lenis** (mesma biblioteca usada por Linear e Vercel). Scroll com inércia e easing, conteúdo desliza com leve peso e desacelera suavemente.

### 8.2 Easing customizado
**Proibido** `ease` e `linear`. Toda transição usa curvas específicas:

| Token | Curva | Uso |
|---|---|---|
| `ease-out-soft` | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, transições padrão |
| `ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entradas de elementos, modais |
| `ease-in-out-smooth` | `cubic-bezier(0.65, 0, 0.35, 1)` | Toggles, swaps |

### 8.3 Durações

| Token | Valor | Uso |
|---|---|---|
| `motion-fast` | 200ms | Mudanças de cor, foco |
| `motion-base` | 300ms | Hover, transições padrão |
| `motion-slow` | 500ms | Entradas, modais, mudanças de layout |

**Princípio:** durações ligeiramente maiores que parecem necessárias soam mais deliberadas e elegantes. Hover de 300–400ms é o sweet spot premium.

### 8.4 Hover multi-propriedade
Hover premium muda 3–4 coisas simultaneamente com timings ligeiramente diferentes:
- Borda em 200ms
- Glow em 400ms
- Background em 300ms

Cria profundidade temporal — não é "liga/desliga", é transição orgânica.

### 8.5 Entrada de páginas e cards
Implementar com **Framer Motion**. Padrão:
- Fade-in com `translateY(8–12px)` simultâneo
- Stagger de 50–80ms entre cards consecutivos
- Easing: `ease-out-expo`
- Duração: `motion-slow` (500ms)

### 8.6 Custo
Lenis + Framer Motion adicionam ~30kb ao bundle. Decisão consciente: vale para dashboard premium.

---

## 9. Padrões de componentes

Regras gerais de comportamento. Detalhes específicos vão em `components.md`.

### 9.1 Estados obrigatórios
Todo componente interativo precisa ter visualmente definidos: **default, hover, focus, active, disabled, loading**. Sem todos eles, parece "morto".

### 9.2 Foco acessível
Anel de foco violeta (ring) em tudo navegável por teclado. **Nunca** remover `outline: none` sem substituir por algo visível.

### 9.3 Loading states
Nada de spinner genérico.
- **Botões:** spinner no lugar do texto, largura preservada
- **Cards de KPI:** skeleton com shimmer animado (não bloco cinza estático)
- **Listas:** skeleton de 3–5 itens com stagger

### 9.4 Estados vazios
Toda lista/tabela tem estado vazio com: ícone sutil + frase explicando + CTA quando aplicável. Nunca tela em branco.

### 9.5 Mensagens de erro
- **Erros de input:** texto vermelho pequeno abaixo do campo
- **Erros de sistema:** toast no canto inferior direito, com ícone e botão "tentar novamente"
- **Erros críticos:** card vermelho discreto no topo da página

Nunca vermelho gritante no meio da tela.

### 9.6 Tooltips
Toda métrica/KPI com nome abreviado tem tooltip explicando o que significa. Delay de **400ms** antes de aparecer.

### 9.7 Ícones
**Biblioteca:** Tabler Icons (já configurado).

| Contexto | Tamanho |
|---|---|
| UI padrão | 16px |
| Header de card | 20px |
| Destaques | 24px |

**Cor:** herda do texto. Exceção: cores semânticas (verde/amarelo/vermelho) quando comunicam status.

---

## 10. Princípios de hierarquia visual

Resumo prático para tomar decisões rápidas:

1. **Dado > decoração.** Se um efeito visual atrapalha a leitura do número, remover.
2. **Menos é mais ativo.** Cada efeito decorativo "gasta orçamento". Use no máximo 2–3 por tela.
3. **Hierarquia por aninhamento.** Quanto mais profundo um elemento, menos arredondado, mais discreto.
4. **Consistência sobre criatividade.** Inovar em pontos escolhidos, manter o resto previsível.
5. **Movimento é parte do design.** Estático = morto. Sempre considerar transições e entradas.
6. **Dark não é preto.** Tons quase-pretos, com diferença sutil de luminosidade entre camadas.

---

## Versão e manutenção

**Versão atual:** 1.0
**Última atualização:** [data ao criar]
**Responsável:** [seu nome]

Toda alteração neste documento deve ser:
1. Discutida antes de aplicada
2. Refletida nos tokens do `globals.css`
3. Registrada em commit separado com prefixo `design:`