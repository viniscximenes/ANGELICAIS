# Arquitetura

## Visão geral
[Resumo de 2–3 parágrafos sobre o que a aplicação faz e quais são as camadas principais.]

## Stack
- Framework: Next.js 15 (App Router)
- Linguagem: TypeScript (strict)
- Estilos: Tailwind CSS v4 + shadcn/ui (preset radix-nova)
- Backend / Auth: Supabase (`@supabase/ssr`)
- Deploy: Vercel
- Node: 20

## Estrutura de pastas

```
src/
├── app/             # rotas (App Router)
│   ├── (auth)/      # route group para fluxos de autenticação
│   ├── (dashboard)/ # route group para área autenticada
│   └── api/         # route handlers
├── components/
│   ├── ui/          # primitivos shadcn/ui
│   └── layout/      # cabeçalho, sidebar, layouts compostos
├── lib/
│   ├── supabase/    # clients (browser, server, middleware helper)
│   └── utils.ts     # cn() e helpers genéricos
├── hooks/           # hooks reutilizáveis
├── types/           # tipos compartilhados
└── middleware.ts    # session refresh do Supabase
```

## Decisões técnicas

### Por que App Router
[Justificativa — server components, layouts aninhados, etc.]

### Por que Supabase
[Justificativa — auth + DB + RLS, time-to-market.]

### Por que shadcn/ui (radix-nova)
[Justificativa — primitivos acessíveis, código no repo, customização total.]

### Estratégia de autenticação
[Como o middleware refresca a sessão; como server components leem o usuário; como client components reagem.]

### Estratégia de fetching de dados
[Server components vs client; quando usar route handlers; cache.]

### Estratégia de erro
[Error boundaries, `error.tsx`, `not-found.tsx`, logging.]

### Variáveis de ambiente
- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase (público)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave anônima (público)
- [outras conforme forem adicionadas]

## Fluxos críticos
[Diagrama ou descrição textual dos fluxos principais — login, criação de conta, etc.]

## Limites e escopo
[O que está fora de escopo do MVP, débitos técnicos conhecidos, riscos.]
