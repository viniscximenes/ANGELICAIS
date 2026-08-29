# meu-projeto

Scaffolding inicial: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Supabase, pronto para deploy na Vercel.

## Stack

- **Framework:** Next.js 15 com App Router
- **Linguagem:** TypeScript (strict)
- **Estilos:** Tailwind CSS v4
- **Backend / Auth:** Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
- **Deploy:** Vercel
- **Node:** 20 (ver `.nvmrc`)

## Setup local (Git Bash no Windows)

1. **Clonar o repositório**
   ```bash
   git clone <URL_DO_REPO> meu-projeto
   cd meu-projeto
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   ```bash
   cp .env.local.example .env.local
   ```

4. **Criar projeto no Supabase**
   - Acesse [https://supabase.com](https://supabase.com) e crie um novo projeto.
   - Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.
   - Cole esses valores em `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=...
     ```

5. **Rodar em desenvolvimento**
   ```bash
   npm run dev
   ```
   App disponível em [http://localhost:3000](http://localhost:3000).

6. **Conectar ao GitHub**
   ```bash
   git remote add origin git@github.com:<seu-usuario>/<repo>.git
   git branch -M main
   git push -u origin main
   ```

7. **Deploy na Vercel**
   - Importe o repositório em [https://vercel.com/new](https://vercel.com/new).
   - Em **Environment Variables**, adicione:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Confirme e faça o primeiro deploy.

## Scripts

| Comando         | Descrição                          |
| --------------- | ---------------------------------- |
| `npm run dev`   | Servidor de desenvolvimento        |
| `npm run build` | Build de produção                  |
| `npm run start` | Roda o build de produção localmente |
| `npm run lint`  | Lint via ESLint                    |

## Estrutura

```
src/
├── app/             # rotas (App Router)
│   ├── (auth)/      # route group para fluxos de autenticação
│   └── (dashboard)/ # route group para área autenticada
├── components/
│   └── ui/          # primitivos visuais (shadcn/ui)
├── lib/
│   └── supabase/    # clients (server, admin, middleware helper)
└── middleware.ts    # session refresh do Supabase
```
