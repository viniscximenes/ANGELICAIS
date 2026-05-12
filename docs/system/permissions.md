# Roles e permissões

## Objetivo

Documentar o sistema de papéis (roles) do ANGELICAIS, a matriz de 
permissões por role, e como aplicar essas permissões em páginas e 
componentes do código.

## Componentes envolvidos

- **Tabela `profiles`** (Supabase) — coluna `role` é a fonte da verdade
- **`src/lib/auth/get-current-user.ts`** (a criar) — helper que retorna user + profile
- **`src/lib/auth/permissions.ts`** (a criar) — funções `can()`, `requireRole()`, etc.
- Páginas/componentes que aplicam as permissões em pontos específicos

## Modelo de dados

A role do usuário é armazenada na coluna `role` da tabela `profiles`:

```sql
role text not null check (role in ('OP', 'AUX', 'ADM', 'GESTOR'))
```

### Tipos TypeScript

```typescript
export type UserRole = "OP" | "AUX" | "ADM" | "GESTOR";

export type UserProfile = {
  id: string;
  username: string;
  emailCorporativo: string;
  fullName: string;
  role: UserRole;
};
```

## As 4 roles

### OP — Operador
Funcionário de linha de frente. Atende clientes e gera retenções/cancelamentos.
Vê apenas os próprios resultados.

### AUX — Auxiliar
É um operador, mas tem responsabilidade extra de manter a base atualizada. 
Pode subir CSV e ver a equipe inteira.

### ADM — Administrador
Tem o painel de operador, vê a equipe inteira, sobe CSV, e no futuro 
gerencia usuários, configurações do sistema e qualquer outra função 
administrativa.

### GESTOR
Não opera. Acompanha resultados da equipe sob outra ótica (página 
`/gestor/d-1` no futuro). NÃO tem acesso ao `/d-1` padrão.

## Matriz de permissões

| Permissão | OP | AUX | ADM | GESTOR |
|---|---|---|---|---|
| Acessar `/d-1` | ✅ | ✅ | ✅ | ❌ → redirect `/gestor/d-1` |
| Ver KPIs próprios (cards superiores) | ✅ | ✅ | ✅ | — |
| Ver motivos próprios | ✅ | ✅ | ✅ | — |
| Ver contratos próprios | ✅ | ✅ | ✅ | — |
| Ver tabela da equipe | ❌ | ✅ | ✅ | — |
| Copiar tabela como imagem | ❌ | ✅ | ✅ | — |
| Fazer upload de CSV | ❌ | ✅ | ✅ | — |
| Acessar `/gestor/*` (futuro) | ❌ | ❌ | ✅ | ✅ |
| Gerenciar usuários (futuro) | ❌ | ❌ | ✅ | ❌ |
| Configurar sistema (futuro) | ❌ | ❌ | ✅ | ❌ |

## Permissões nomeadas

Para evitar `if (role === 'AUX' || role === 'ADM')` espalhado pelo 
código, vamos usar permissões nomeadas:

```typescript
export type Permission =
  | "view_d1_personal"      // ver dados pessoais no /d-1 (cards, motivos, contratos)
  | "view_d1_team"          // ver tabela da equipe
  | "manage_base"           // upload de CSV
  | "view_gestor_panel"     // acessar /gestor/*
  | "manage_users"          // gerenciar usuários (futuro)
  | "manage_system";        // configurações de sistema (futuro)
```

Mapeamento role → permissões:

```typescript
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OP: ["view_d1_personal"],
  AUX: ["view_d1_personal", "view_d1_team", "manage_base"],
  ADM: [
    "view_d1_personal",
    "view_d1_team",
    "manage_base",
    "view_gestor_panel",
    "manage_users",
    "manage_system",
  ],
  GESTOR: ["view_gestor_panel"],
};
```

## Fluxos principais

### Verificar permissão em página (server component)

```typescript
// Em src/app/(dashboard)/d-1/page.tsx
const user = await getCurrentUser();

if (!user) {
  redirect("/login");
}

if (user.profile.role === "GESTOR") {
  redirect("/gestor/d-1");
}

const canSeeTeam = can(user.profile.role, "view_d1_team");
const canManageBase = can(user.profile.role, "manage_base");

return (
  <>
    <KpiCards ... />
    {canSeeTeam && <EquipeSection ... />}
    {canManageBase && <UploadSection />}
  </>
);
```

### Verificar permissão em server action

```typescript
// Em src/lib/auth/upload-base-action.ts
export async function uploadBaseAction(rows: string[][]) {
  const user = await getCurrentUser();
  
  if (!user || !can(user.profile.role, "manage_base")) {
    return { success: false, error: "Sem permissão" };
  }
  
  return await uploadBaseToSheet(rows);
}
```

### Verificar permissão em componente client

Componentes client recebem dados do server component pai. NÃO consultam 
diretamente a role — usam props já processadas:

```typescript
// page.tsx (server) passa pra cá
<EquipeSection canCopyTable={canManageBase} ... />

// EquipeSection (client) usa a prop
{canCopyTable && <CopyTableButton ... />}
```

## Decisões técnicas

### Por que enum de strings em vez de números?

Strings são auto-documentadas. `role === "ADM"` é mais legível que 
`role === 3`. Em SQL também fica óbvio na inspeção manual.

### Por que permissões nomeadas em vez de checagem direta da role?

Permissões nomeadas desacoplam **quem pode** de **o que pode**. Se 
amanhã decidirmos que AUX também acessa o painel gestor, mudamos 
em um lugar só (`ROLE_PERMISSIONS`), não em N componentes.

### Por que checagem dupla (UI + server action)?

- **UI:** esconde o botão/seção para não confundir o usuário
- **Server action:** rejeita a requisição mesmo se alguém forjar a chamada

Esconder no front sem proteger no back é segurança falsa.

### Por que server components decidem e passam pra client components?

Client components não devem fazer queries ao banco (segurança + 
performance). Eles recebem props já preparadas pelo server.

## Pontos de atenção

### Roles podem mudar sem refresh imediato

Se um admin muda a role de um usuário, o usuário precisa fazer 
**logout/login** ou esperar o refresh do token. A role é lida do 
profile a cada server-side render, mas client components que já 
foram montados não recebem a mudança automaticamente.

### Sem hierarquia automática

`ADM` NÃO é "superset" de `AUX` por padrão. A relação entre roles 
está APENAS no `ROLE_PERMISSIONS`. Se quisermos hierarquia futura 
(tipo "qualquer ADM herda permissões de AUX"), precisa ser explícito 
no mapa.

### Operadores sem dados na planilha

Um usuário cadastrado em `profiles` mas SEM linha correspondente 
na planilha Google verá cards zerados e mensagens "sem dados". Não 
é bug — é estado vazio esperado (ver `docs/pages/d-1.md`).

### Gestor não tem `view_d1_personal`

Decisão consciente: gestor não opera, não atende cliente, não tem 
"seus" números. Por isso `GESTOR` não tem `view_d1_personal` e é 
redirecionado de `/d-1` para `/gestor/d-1`.

### Roles futuros

Se surgir necessidade de outro role (ex: `TRAINEE`, `LIDER`), 
adicionar:
1. No `check constraint` da tabela `profiles`
2. Em `UserRole` (TypeScript)
3. Em `ROLE_PERMISSIONS`
4. Atualizar esta documentação

## Versão

1.0 — criada antes da implementação. Atualizar após criar `get-current-user.ts` 
e aplicar as permissões na página `/d-1`.