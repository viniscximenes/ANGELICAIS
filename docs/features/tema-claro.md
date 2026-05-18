# Tema Claro

## Objetivo

Adicionar suporte a tema claro no sistema ANGELICAIS, mantendo o tema 
escuro intacto como padrão. Cada usuário escolhe sua preferência, que 
é salva no banco e persiste entre dispositivos.

O PNG do D-1 Consolidado (gerado pelo ADM para enviar ao Teams) 
**sempre sai em tema claro**, independente do tema escolhido pelo 
usuário no site.

## Princípios

- **Dark é padrão**: novos usuários e usuários sem preferência veem dark
- **Persistência por usuário**: preferência salva em `profiles.theme_preference`
- **Tema escuro intacto**: nenhuma cor existente do dark muda
- **Azul corporativo no claro**: `--primary` vira azul oceano apenas no tema claro
- **PNG sempre claro**: helper de export força tema claro independente da preferência

## Modelo de dados

### Alteração em `profiles`

```sql
alter table profiles
  add column theme_preference text not null default 'dark' 
  check (theme_preference in ('dark', 'light'));
```

Todos os profiles existentes ficam com `dark` por padrão.

## Paleta de cores

### Tema escuro (intacto, status quo)

```css
:root {
  --background: oklch(15% 0.01 240);
  --foreground: oklch(98% 0 0);
  --muted: oklch(20% 0.01 240);
  --muted-foreground: oklch(65% 0.02 240);
  --border: oklch(25% 0.01 240);
  --primary: oklch(60% 0.15 290);            /* roxo */
  --primary-foreground: oklch(98% 0 0);
  --success: oklch(70% 0.15 145);            /* verde */
  --warning: oklch(78% 0.15 80);             /* laranja */
  --danger: oklch(65% 0.20 27);              /* vermelho */
  /* (valores reais conforme arquivo atual) */
}
```

### Tema claro (novo)

```css
[data-theme="light"] {
  --background: oklch(99% 0.002 240);        /* branco quase puro */
  --foreground: oklch(20% 0.02 240);         /* cinza-azulado escuro */
  --muted: oklch(96% 0.005 240);             /* cinza muito claro */
  --muted-foreground: oklch(50% 0.01 240);   /* cinza médio */
  --border: oklch(90% 0.005 240);            /* cinza claro */
  --primary: oklch(55% 0.16 230);            /* azul oceano */
  --primary-foreground: oklch(99% 0 0);
  --success: oklch(50% 0.15 145);            /* verde mais escuro pra contraste */
  --warning: oklch(60% 0.15 80);             /* laranja médio */
  --danger: oklch(55% 0.20 27);              /* vermelho mais escuro */
}
```

### Sombras (elevation)

```css
:root {
  --elevation-1: 0 1px 2px rgba(0,0,0,0.3);
  --elevation-2: 0 2px 8px rgba(0,0,0,0.4);
  --elevation-3: 0 8px 24px rgba(0,0,0,0.5);
}

[data-theme="light"] {
  --elevation-1: 0 1px 2px rgba(0,0,0,0.04);
  --elevation-2: 0 2px 8px rgba(0,0,0,0.06);
  --elevation-3: 0 8px 24px rgba(0,0,0,0.10);
}
```

Sombras no light são muito mais sutis (fundo branco já é o contraste).

## Aplicação do tema

### Via atributo `data-theme` no `<html>`

```html
<html data-theme="dark">   <!-- ou "light" -->
```

Server-side renderiza o tema certo no SSR a partir do `profiles.theme_preference`.

### Fluxo SSR (anti-flash)

1. Server lê `theme_preference` do user logado (ou `dark` se anônimo)
2. Server injeta `<html data-theme="...">` na renderização
3. Tema aplicado antes mesmo do JS carregar — zero flash

### Toggle (mudança em runtime)

1. Usuário clica no botão da sidebar
2. Server action `update-theme-preference-action` atualiza `profiles.theme_preference`
3. Client atualiza `document.documentElement.setAttribute("data-theme", ...)` imediatamente (sem reload)
4. Próximo SSR já vem com o tema novo

### Persistência entre dispositivos

Como o tema fica no banco (profiles), o usuário entra em outro 
dispositivo e o tema vem certo automaticamente.

## Server actions

`src/lib/users/actions/`:

- `update-theme-preference-action.ts` — Recebe `"dark" | "light"`, 
  atualiza próprio profile do usuário, revalida `/`

## Componentes

### Toggle de tema (`theme-toggle.tsx`)

Posição: **sidebar, parte inferior**.

Visual: botão com ícone (sol ou lua), label discreto. Click alterna.

```
┌───────────────────┐
│  [conteúdo]       │
│                   │
│  ...              │
│  ───────────      │
│  ☀  Tema claro    │   ← se está em dark, mostra "tema claro" e ícone sol
│   [Sair]          │
└───────────────────┘
```

Quando está em light, mostra `🌙 Tema escuro`.

### Theme provider (`theme-provider.tsx`)

Wrapper client-side que:
- Recebe `initialTheme` do server
- Aplica `data-theme` no `<html>`
- Expõe função de toggle pro toggle button

## Arquivos a criar

- `src/lib/users/actions/update-theme-preference-action.ts`
- `src/components/dashboard/theme-toggle.tsx`
- `src/components/dashboard/theme-provider.tsx`

## Arquivos a modificar

- `src/app/globals.css` — adicionar paleta `[data-theme="light"]` + elevation overrides
- `src/app/layout.tsx` — ler theme_preference do user, aplicar no `<html>`
- `src/lib/users/types.ts` — adicionar `themePreference: "dark" | "light"` no UserProfile
- `src/lib/users/get-all-users.ts` — incluir `theme_preference` no SELECT
- `src/lib/users/get-user-by-id.ts` — incluir
- `src/lib/auth/get-current-user.ts` — incluir
- `src/components/dashboard/sidebar.tsx` — adicionar `<ThemeToggle />` no rodapé

## PNG sempre claro

### Estratégia

Antes de chamar `htmlToImage.toPng`, **envolver** o nó-alvo em um div 
com `data-theme="light"` temporariamente:

```typescript
// pseudo-código
const wrapper = document.createElement("div");
wrapper.setAttribute("data-theme", "light");
wrapper.appendChild(target.cloneNode(true));
document.body.appendChild(wrapper);
const png = await htmlToImage.toPng(wrapper);
document.body.removeChild(wrapper);
```

Isso garante que o CSS resolve as variáveis do tema claro durante o 
export, sem afetar o que o ADM está vendo na tela.

Alternativa: usar `filter` option do `html-to-image` para sobrescrever 
estilos no momento do export.

### Onde aplica

- `src/components/d-1/copy-equipe-button.tsx` (e qualquer outro botão 
  de copiar PNG do D-1)

## Componentes que podem precisar de ajuste

Tema claro **deve funcionar de cara** porque usamos CSS variables em 
quase todo lugar. Mas alguns componentes podem ter cores hardcoded:

- Gradientes em headers de cards (TX Retenção hero, RV Status)
- Sombras coloridas (box-shadow com cor hardcoded)
- Backgrounds com `color-mix` muito transparentes (podem ficar invisíveis)
- Toasts (sonner) — pode usar cor própria

**Estratégia:** primeiro implementar tudo, depois rodar pelo site no 
modo claro e ajustar caso a caso.

## Estados

### Loading (toggle salvando)
- Botão fica disabled
- Loader pequeno no lugar do ícone

### Erro
- Toast vermelho "Erro ao salvar preferência"
- Tema reverte visualmente

### Sucesso
- Tema muda instantaneamente
- Sem toast (mudança é a confirmação)

## Acessibilidade

- Botão de toggle com `aria-label="Alternar para tema {oposto}"`
- Garante contraste mínimo WCAG AA em ambos os temas

## Testes manuais necessários após implementação

Para cada página, em cada tema:

1. /login
2. /d-1/consolidado, /tempo-logado, /indisponibilidade (ADM + OP/AUX)
3. /kpi/atual-principal, atual-secundario, passado-*
4. /rv/atual, passado
5. /config/kpi, /config/rv, /config/usuarios
6. /registros/monitoria (listagem + detalhe)
7. /registros/diario (listagem + página do operador)
8. Modais de criação (monitoria, diário, novo usuário)
9. Toast (sucesso e erro)
10. PNG do consolidado (sempre claro, independente do tema)

## Versão

1.0 — criada antes da implementação.