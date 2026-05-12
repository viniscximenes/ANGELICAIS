# Autenticação e sessão

## Objetivo

Documentar como os usuários do sistema ANGELICAIS se autenticam, 
como a sessão é gerenciada, e como o identificador interno do 
Supabase Auth se relaciona com o email corporativo da empresa.

## Componentes envolvidos

- **Supabase Auth** — serviço externo que gerencia credenciais e tokens
- **Tabela `profiles`** (Supabase) — extensão do usuário com dados da empresa
- **`@supabase/ssr`** — biblioteca oficial de integração com Next.js App Router
- **`src/lib/supabase/client.ts`** — cliente browser-side
- **`src/lib/supabase/server.ts`** — cliente server-side (server components, route handlers)
- **`src/lib/supabase/middleware.ts`** — refresh de sessão a cada request
- **`src/middleware.ts`** — middleware raiz do Next.js
- **`src/lib/auth/login-action.ts`** — server action de login
- **`src/lib/auth/logout-action.ts`** — server action de logout

## Modelo de dados

### Supabase Auth (gerenciado pelo serviço)

Cada usuário tem:
- `id` (UUID) — identificador único interno
- `email` — formato interno `{username}@interno.angelicais.app`
- `encrypted_password` — senha hash gerenciada pelo Supabase

### Tabela `profiles` (a ser criada)

Extensão personalizada com dados da empresa:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email_corporativo text not null unique,
  full_name text not null,
  role text not null check (role in ('OP', 'AUX', 'ADM', 'GESTOR')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index profiles_email_corporativo_idx on profiles(email_corporativo);
create index profiles_role_idx on profiles(role);
```

**Relacionamento:**
- `profiles.id` ↔ `auth.users.id` (1:1, FK com cascade delete)
- `profiles.username` é o `nome.sobrenome` do login
- `profiles.email_corporativo` é o `{username}@alloha.com` real

### Política RLS (Row Level Security)

A tabela `profiles` deve ter RLS ativado:

```sql
alter table profiles enable row level security;

-- Qualquer usuário autenticado pode ler todos os profiles
-- (necessário para a tabela da equipe)
create policy "Authenticated users can read profiles"
  on profiles for select
  to authenticated
  using (true);

-- Apenas o próprio usuário pode editar (no futuro, admins também)
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);
```

## Fluxos principais

### Fluxo de login

1. Usuário acessa `/login`
2. Digita `username` (ex: `caio.vsilva`) + senha
3. Validação client-side:
   - Username: regex `^[a-z]+\.[a-z]+$`
   - Senha: mínimo **6 caracteres**
4. Submit envia para server action `loginAction(username, password)`
5. Server action converte: `email = ${username}@interno.angelicais.app`
6. Chama `supabase.auth.signInWithPassword({ email, password })`
7. Em sucesso: redirect server-side para `/d-1`
8. Em falha: retorna `{ success: false, error: 'credenciais' | 'conexao' }`

### Fluxo de sessão

- **Access token:** validade de 1 hora (padrão Supabase)
- **Refresh token:** validade de **6 horas e 20 minutos** (igual ao expediente)
- Refresh automático acontece via `updateSession()` no middleware a cada request
- Cookie `httpOnly` + `secure` + `sameSite=lax`
- Após 6h20 de inatividade, sessão expira e usuário é redirecionado para `/login`

### Fluxo de logout

1. Usuário clica em "Sair"
2. Form submete para server action `logoutAction()`
3. Server action chama `supabase.auth.signOut()`
4. Redirect server-side para `/login`

### Conversão username ↔ email

O sistema mantém **dois emails** por usuário:

| Tipo | Formato | Uso |
|---|---|---|
| Email interno | `nome.sobrenome@interno.angelicais.app` | Supabase Auth (login) |
| Email corporativo | `nome.sobrenome@alloha.com` | Cruzamento com planilha Google |

**Por que essa separação:**
- Supabase Auth exige formato válido de email — não aceita só "nome.sobrenome"
- O email corporativo é da empresa, não temos acesso ao servidor de email — não daria pra confirmar conta por link
- O domínio `@interno.angelicais.app` é fictício e nunca recebe emails

**Conversão em código:**
- `username` do login = parte antes do `@`
- `email_corporativo` = `${username}@alloha.com`
- `email_interno` = `${username}@interno.angelicais.app`

A tabela `profiles` é a fonte da verdade para o vínculo username ↔ email_corporativo. Ao cruzar com a planilha Google, usar SEMPRE `profiles.email_corporativo`, nunca derivar do username.

## Decisões técnicas

### Por que server actions em vez de API routes?

Server actions do Next 15:
- Eliminam o boilerplate de criar rota
- Tipam o retorno de ponta a ponta
- O `redirect()` server-side funciona nativamente (não precisa de `router.push` no client, evita problemas de "loading eterno")

### Por que sessão de 6h20 e não 24h?

A jornada de trabalho é de 6h. O extra de 20 minutos cobre intervalos curtos sem deslogar. Sessões mais longas em sistemas internos aumentam risco de uso indevido em caso de máquina compartilhada.

### Por que `@interno.angelicais.app` como domínio fictício?

- Não é um domínio real, então nunca colide com emails verdadeiros
- O `.app` é controlado e exige HTTPS — adicional de segurança
- Padrão claro de "se vê isso, é interno"

### Por que tabela `profiles` separada de `auth.users`?

- `auth.users` é gerenciada pelo Supabase, não devemos adicionar colunas lá
- `profiles` é nossa, pode evoluir livremente
- Padrão recomendado pela própria documentação do Supabase

## Pontos de atenção

### Senha temporária inicial

Todos os usuários criados manualmente recebem a senha:
```
Angelicais@2025
```

Esta senha deve ser trocada pelo usuário no primeiro acesso ou pelo admin via UI (funcionalidade futura).

### Multi-dispositivo

Um mesmo usuário pode estar logado em vários dispositivos simultaneamente. Não implementamos lock de sessão única.

### Reset de senha (estado atual)

Por enquanto, admin reseta senha **manualmente** via Supabase Dashboard:
1. Authentication → Users
2. Localiza o usuário
3. Menu de 3 pontos → "Send password recovery" ou define nova senha

**Funcionalidade futura:** UI de admin no próprio site para listar usuários e redefinir senhas. Vai exigir uso da `SUPABASE_SERVICE_ROLE_KEY` (chave master, nunca exposta ao client).

### Validação de username

A regex `^[a-z]+\.[a-z]+$` aceita apenas:
- Letras minúsculas (a-z)
- Um único ponto separador
- Dois "segmentos" (primeiro nome . sobrenome)

**Não aceita:**
- Acentos (`vítor` precisa virar `vitor`)
- Números
- Mais de um ponto (`maria.da.silva` precisa virar `maria.silva` ou similar)

Em caso de operador com nome conflitante, o admin define o username manualmente.

### Rate limiting de tentativas

Implementação atual é **client-side** (5 tentativas → 60s de bloqueio). Não protege contra ataques via API. Para produção, considerar adicionar rate limit no nível do Supabase ou via middleware do Next.

## Versão

1.0 — criada antes da implementação da tabela `profiles`. Atualizar após executar o SQL no Supabase.