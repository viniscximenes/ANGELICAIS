# Convenções

## Nomenclatura

### Arquivos e pastas
- Componentes: [PascalCase ou kebab-case — decidir]
- Hooks: [`useNomeDoHook.ts`]
- Tipos: [`types/algo.ts` ou `algo.types.ts`]
- Utilitários: [`camelCase.ts`]
- Rotas (App Router): [kebab-case nas pastas]

### Variáveis e funções
- Variáveis: [camelCase]
- Constantes globais: [SCREAMING_SNAKE_CASE]
- Funções: [camelCase, verbo no início — `getUser`, `formatDate`]
- Booleans: [prefixo `is` / `has` / `can`]
- Componentes React: [PascalCase]

## Imports
- Ordem: [externos → aliases `@/` → relativos]
- Aliases configurados: `@/*` → `./src/*`
- [Política sobre default vs named exports]

## TypeScript
- `strict: true` é obrigatório
- [Política sobre `any` — proibido / com justificativa em comentário]
- [Quando usar `type` vs `interface`]
- [Padrão para tipar props de componentes]

## Estilo (Tailwind)
- [Ordem das classes — usar `prettier-plugin-tailwindcss`?]
- [Quando extrair em `cn()` vs `cva`]
- [Proibido CSS inline / styled-components]

## Commits
Formato: [Conventional Commits]

```
<tipo>(<escopo opcional>): <descrição curta>

[corpo opcional]
```

Tipos aceitos:
- `feat` — nova funcionalidade
- `fix` — correção de bug
- `chore` — tarefas de manutenção
- `docs` — apenas documentação
- `refactor` — refatoração sem mudança de comportamento
- `style` — formatação, sem mudança de código
- `test` — adição/correção de testes
- `ci` — mudanças em pipeline

## Branches
- [Padrão de nome — ex: `feat/<curta-descricao>`, `fix/<id-do-issue>`]
- Branch principal: `main`

## Pull Requests
- [Template, checklist, requisitos de review]
- [Squash vs merge vs rebase]

## Code review
- [O que verificar — testes, acessibilidade, performance, segurança]

## Testes
- [Framework — Vitest, Playwright, etc.]
- [Cobertura mínima exigida, se houver]
