# Sidebar — navegação global

## Objetivo

Fornecer navegação consistente entre as seções do ANGELICAIS, com 
estrutura previsível, expansão contextual de sub-páginas, e respeito 
às permissões por role. A sidebar é o ponto único de navegação 
estrutural do sistema autenticado.

## Componentes envolvidos

- `src/components/dashboard/sidebar.tsx` — componente principal
- `src/components/dashboard/sidebar-section.tsx` — bloco de uma seção (com sub-itens)
- `src/components/dashboard/sidebar-item.tsx` — link de página individual
- `src/app/(dashboard)/layout.tsx` — integra sidebar + header + conteúdo
- `src/lib/auth/get-current-user.ts` — obtém role pra filtrar itens
- `src/lib/auth/permissions.ts` — verifica acesso a cada seção

## Modelo de dados

### Estrutura de uma seção (no código, não em banco)

```typescript
type SidebarSection = {
  id: string;              // "d-1", "kpi", "bases", "config"
  label: string;           // "D-1", "KPI", "BASES", "Configurações"
  icon: ComponentType;     // ícone do tabler-icons-react
  basePath: string;        // "/d-1", "/kpi", etc.
  permission: Permission;  // nome da permissão necessária
  items: SidebarItem[];    // sub-itens (sempre presentes, mas só mostrados quando seção ativa)
};

type SidebarItem = {
  label: string;           // "Consolidado", "Tempo Logado", etc.
  href: string;            // "/d-1/consolidado"
};
```

### Permissões usadas

A sidebar consome as permissões já definidas em 
`src/lib/auth/permissions.ts`:

| Seção | Permissão necessária |
|---|---|
| D-1 | `view_d1_personal` |
| KPI | `view_d1_personal` (todos os roles operacionais) |
| BASES | `manage_base` (AUX e ADM) |
| Configurações | `manage_system` (apenas ADM) |

GESTOR não acessa a sidebar do dashboard padrão — vai direto para `/gestor/*`.

## Estrutura visual

### Layout geral

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (sticky, com logo + usuário + botão sair)            │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│  SIDEBAR     │  CONTEÚDO (children do layout)                │
│              │                                               │
│  (sticky,    │                                               │
│   fixa,      │                                               │
│   esquerda)  │                                               │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

A sidebar é **fixa à esquerda**, sempre visível, **sem botão de recolher**.

### Largura
- **Desktop (≥ 1024px):** 240px de largura
- **Tablet (640-1023px):** 200px de largura
- **Mobile (< 640px):** sidebar vira drawer com ícone "hamburguer" no header (decisão a tomar em etapa futura, fora do escopo da v1)

### Comportamento "expansão contextual"

A sidebar mostra **todas as seções** que o usuário tem permissão de acessar (como itens principais), mas só expande os **sub-itens da seção ativa**.

**Exemplo — usuário ADM em `/d-1/consolidado`:**

```
ANGELICAIS

📊 D-1                    ← expandido (seção ativa)
   • Consolidado          ← item ativo (highlight violeta)
     Tempo Logado
     Indisponibilidade

📈 KPI                    ← colapsado (não está nesta seção)

📁 BASES                  ← colapsado

⚙️ Configurações          ← colapsado
```

**Exemplo — mesmo ADM em `/kpi/painel`:**

```
ANGELICAIS

📊 D-1                    ← colapsado

📈 KPI                    ← expandido
   • Painel               ← item ativo

📁 BASES                  ← colapsado

⚙️ Configurações          ← colapsado
```

### Estados visuais

**Seção (item principal):**
- **Padrão:** ícone + label em cinza (`text-muted-foreground`)
- **Seção ativa (expandida):** ícone + label em branco (`text-foreground`), com fundo discreto (`elevation-1`)
- **Hover:** label muda pra branco

**Sub-item:**
- **Padrão:** label em cinza, sem ícone, indentado
- **Ativo:** label em branco, com barrinha violeta de 2px à esquerda (`var(--primary)`)
- **Hover:** label muda pra branco

### Ícones

Tabler Icons React (já instalado):

| Seção | Ícone |
|---|---|
| D-1 | `IconChartBar` |
| KPI | `IconTargetArrow` |
| BASES | `IconDatabase` |
| Configurações | `IconSettings` |

### Animação de expansão

Quando uma seção expande/colapsa (navegando entre seções), os sub-itens 
fazem fade-in/fade-out com leve translate Y, usando Framer Motion:

```
initial: { opacity: 0, height: 0 }
animate: { opacity: 1, height: "auto" }
exit:    { opacity: 0, height: 0 }
transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
```

### Tipografia

- **Item principal:** `ds-body` em peso medium
- **Sub-item:** `ds-small`, regular

### Espaçamento

- Padding vertical do container: 24px topo, 24px base
- Padding horizontal da sidebar: 16px
- Espaço vertical entre seções: 4px
- Espaço entre seção e seus sub-itens: 4px
- Padding interno de cada item: 10px vertical, 12px horizontal
- Indentação de sub-itens: 36px da esquerda

## Fluxos principais

### Detecção da seção ativa

O componente é **client component** (usa `usePathname`). A seção ativa é determinada pelo prefixo:

```typescript
const pathname = usePathname();
const isActiveSection = pathname.startsWith(section.basePath);
const isActiveItem = pathname === item.href;
```

### Filtragem por permissão

A sidebar é renderizada num **server component pai** (o layout do dashboard), que:

1. Pega o user atual via `getCurrentUser()`
2. Filtra as seções permitidas via `can(role, section.permission)`
3. Passa a lista filtrada como prop pro componente cliente

Isso evita que itens não permitidos cheguem ao cliente, mesmo que estejam em código.

### Navegação

Cliques nos itens usam o componente `<Link>` do Next.js (prefetch automático), 
não `router.push`. Mais rápido e nativo do App Router.

## Decisões técnicas

### Por que sidebar fixa e não recolhível?

O usuário **não pediu recolher**. Adicionar recolher implica:
- Estado salvo em localStorage
- Animação de largura do container
- Tooltips quando recolhida
- Decisão visual sobre ícones quando recolhida

É complexidade extra sem ganho claro. Se no futuro o usuário precisar de mais espaço, revisitamos.

### Por que expansão contextual em vez de árvore aberta?

Com 4 seções e várias sub-páginas, uma árvore totalmente aberta poluiria visualmente. A expansão contextual:
- Mostra estrutura completa do site (todas as seções visíveis)
- Mas só "abre" o que importa pro usuário no momento
- Evita scroll vertical desnecessário

### Por que filtragem no server e não no client?

Server-side filtering:
- Reduz o bundle (código de seções não permitidas nem chega ao cliente)
- Evita "piscar" itens que somem por permissão
- Aplica defesa em profundidade (mesmo se alguém forjar, a UI nem renderiza)

### Header continua no topo

A decisão foi manter o header (logo + usuário + sair) sticky no topo, com a sidebar abaixo. Padrão clássico de dashboard.

**Trade-off aceito:** ~60px de altura "perdidos" pro header, mas previsibilidade alta (qualquer ferramenta moderna funciona assim).

## Pontos de atenção

### Mobile (não tratado na v1)

A sidebar **não está pensada para mobile** nesta versão. Em telas < 640px, ela deveria virar um drawer (sheet) abrindo por um botão hamburger no header. Por enquanto, assume-se que o sistema é usado em desktop.

Quando for tratar mobile, criar issue específica.

### Adicionar nova seção

Quando adicionar uma seção nova no futuro:
1. Adicionar ao array `SIDEBAR_SECTIONS` em `sidebar.tsx`
2. Garantir que a permissão necessária existe em `permissions.ts`
3. Atualizar este documento (tabela "permissões usadas")

### Performance

Como a sidebar tem poucos itens (4 seções, ~10 sub-itens no total), não há preocupação de performance. Não precisa de virtualização.

### Conflito com IdleRefreshWatcher

A sidebar não interage com o auto-refresh. Mudar de página via sidebar **não reseta o timer** automaticamente — o reset acontece via eventos de mouse/click que o usuário gera ao clicar. Isso é esperado e correto.

## Acessibilidade

- `<nav aria-label="Navegação principal">` envolvendo a sidebar inteira
- `<button>` para os toggles de seção (não `<div>`)
- Estado expandido comunicado via `aria-expanded`
- Item ativo comunicado via `aria-current="page"`
- Foco navegável por teclado (Tab/Shift+Tab)
- Sem armadilhas de foco (não força tab dentro da sidebar)

## Versão

1.0 — criada antes da implementação. Atualizar após criar 
`sidebar.tsx` e adicionar nova seção `kpi` ao sistema.