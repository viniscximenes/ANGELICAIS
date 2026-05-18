# CONFIGURAÇÕES — Usuários

## Objetivo

Painel onde o ADM gerencia os usuários cadastrados no sistema: cria 
novos, edita informações básicas, alterna entre roles OP/AUX, ativa/
desativa, e define nova senha (sem visualizar a senha atual).

## Rota

`/config/usuarios`

## Quem acessa

- **ADM** — único role com acesso
- **GESTOR / AUX / OP** — redirecionados (não acessam)

## Capacidades

### O que o ADM pode fazer

- **Criar** novo usuário (nome, username, email corporativo, role inicial, senha)
- **Editar** dados básicos: `full_name`, `email_corporativo`
- **Alternar role** entre `OP` e `AUX` (apenas essas duas direções)
- **Definir nova senha** (manual ou aleatória) com exibição única na tela
- **Ativar / desativar** o usuário (sem apagar do banco)

### O que NÃO é permitido

- Visualizar a senha atual (impossível tecnicamente — bcrypt é one-way)
- Mudar o `username` após criação (quebraria o login)
- Apagar usuário do banco (preserva referências em monitoria, diário, etc)
- Promover/rebaixar para ADM ou GESTOR pelo painel (caios e gestora são 
  cargos fixos; mudanças manuais via SQL direto)
- ADM editar a si próprio (segurança contra auto-bloqueio)

## Modelo de dados

### Alterações em `profiles`

A tabela `profiles` precisa de campo novo:

```sql
alter table profiles
  add column is_active boolean not null default true;

create index profiles_is_active_idx on profiles(is_active);
```

Por padrão, todos os profiles existentes ficam `is_active = true`.

### Impacto no resto do sistema

- O middleware de autenticação precisa **bloquear login** de usuários 
  com `is_active = false`. Se um usuário desativado tentar logar, 
  recebe erro e é redirecionado pro login.
- Listagens de operadores (D-1, KPI, RV, monitoria, diário) devem 
  **incluir apenas usuários ativos** por padrão. Se necessário, 
  adicionar filtro pra "mostrar inativos" no futuro.

## Service Role e segurança

O painel usa a chave `SUPABASE_SERVICE_ROLE_KEY` para:
- Criar usuários no Supabase Auth
- Atualizar email do usuário em `auth.users`
- Definir nova senha
- (Não usar pra leituras — leituras passam pelo cliente normal)

A service_role só é usada em **server actions** (nunca em código que 
chega ao browser).

A variável `SUPABASE_SERVICE_ROLE_KEY` deve estar configurada em:
- `.env.local` (dev local)
- Variables do Vercel (produção)

## Estrutura visual

### Header

```
Configurações / Usuários                                  [+ Novo usuário]
```

### Lista principal (tabela)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Nome              │  Login          │  Email Corp.       │  Role  │  Status   │  Ações  │
├─────────────────────────────────────────────────────────────────────┤
│  Sara Secundo      │  sara.secundo   │  sara.secundo@... │  AUX   │  Ativo    │ [···]   │
│  Caio Vinícius     │  caio.vsilva    │  caio.vsilva@...  │  ADM   │  Ativo    │ —       │
│  Igor Souza        │  igor.souza     │  igor.souza@...   │  AUX   │  Ativo    │ [···]   │
│  Maria Silva       │  maria.silva    │  maria.silva@...  │  OP    │  Inativo  │ [···]   │
└─────────────────────────────────────────────────────────────────────┘
```

**Ordenação:** alfabética por nome.

**Filtro/busca:** opcional no topo, por nome ou username.

**Status:**
- `Ativo` → texto verde
- `Inativo` → texto cinza com `text-decoration: line-through` no nome

**Linha do próprio ADM logado:**
- Coluna "Ações" vazia ("—" ou cinza desabilitado)
- Linha levemente atenuada (opacity 80%)
- Indicador "(você)" ao lado do nome

**Linha do GESTOR (Ana Angelica):**
- Coluna "Ações" vazia (sem opção de editar pelo painel)
- Indicador "(gestora)" ao lado do nome

### Menu de ações (dropdown ou botões pequenos)

Para cada usuário (exceto ADM logado e GESTOR), 4 opções:

```
[ Editar ]  [ Definir nova senha ]  [ Alternar role ]  [ Ativar/Desativar ]
```

**Detalhes:**
- **Editar:** abre modal com nome e email corporativo editáveis
- **Definir nova senha:** abre modal específico (ver abaixo)
- **Alternar role:** dropdown inline com OP / AUX (sem ADM/GESTOR)
- **Ativar/Desativar:** confirma e alterna `is_active`

### Modal de criação de usuário

```
┌──────────────────────────────────────────────────────────┐
│  Novo usuário                                              │
│                                                            │
│  Nome completo:    [ texto ]                              │
│  Username:         [ texto ] @interno.angelicais.app      │
│                                                            │
│  Email corp.:      [ texto ] @alloha.com                  │
│                                                            │
│  Role inicial:     [ OP / AUX / ADM ▼ ]                   │
│                                                            │
│  Senha:            [ texto                       ]         │
│                    ou  [ Gerar aleatória ]                 │
│                                                            │
│                          [ Cancelar ]  [ Criar usuário ]  │
└──────────────────────────────────────────────────────────┘
```

**Validações:**
- Nome completo: obrigatório, mínimo 3 caracteres
- Username: obrigatório, apenas letras/números/ponto/hífen, único no banco
- Email corp.: obrigatório, apenas a parte antes do `@` (sistema adiciona `@alloha.com`)
- Role inicial: padrão OP, opções OP/AUX/ADM (escolha do ADM)
- Senha: obrigatória, mínimo 8 caracteres OU clica em "Gerar aleatória" (cria uma senha de 12 caracteres alfanuméricos)

**Após criar:**
- Modal fecha
- Toast "Usuário criado"
- Lista atualiza
- Senha é exibida no toast (uma vez) com botão "Copiar"

### Modal de edição

```
┌──────────────────────────────────────────────────────────┐
│  Editar usuário                                            │
│                                                            │
│  Nome completo:    [ Sara Secundo Batista da Silva    ]   │
│                                                            │
│  Username:         sara.secundo  (não editável)           │
│                                                            │
│  Email corp.:      [ sara.secundo ] @alloha.com           │
│                                                            │
│                          [ Cancelar ]  [ Salvar ]         │
└──────────────────────────────────────────────────────────┘
```

**Username é exibido mas desabilitado.**

### Modal "Definir nova senha"

```
┌──────────────────────────────────────────────────────────┐
│  Definir nova senha para Sara Secundo                      │
│                                                            │
│  ⚠ A senha atual será substituída e não poderá ser        │
│    recuperada.                                             │
│                                                            │
│  Nova senha:       [ texto                       ]         │
│                    [ Gerar aleatória ]                     │
│                                                            │
│                                                            │
│  Após salvar, copie a senha para entregar ao usuário.     │
│                                                            │
│                          [ Cancelar ]  [ Definir senha ]  │
└──────────────────────────────────────────────────────────┘
```

**Comportamento após "Definir senha":**

```
┌──────────────────────────────────────────────────────────┐
│  ✓ Senha definida                                          │
│                                                            │
│  Nova senha de Sara Secundo:                              │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  X7k9PqLm2nRt                              [Copiar] │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  Envie esta senha ao usuário pelo Teams. Ela não será     │
│  exibida novamente.                                        │
│                                                            │
│                                       [ Fechar ]           │
└──────────────────────────────────────────────────────────┘
```

A senha **só é mostrada uma vez** após definir. Se ADM fechar sem 
copiar, terá que definir nova senha de novo.

### Modal "Confirmar alternância de role"

```
┌──────────────────────────────────────────────────────────┐
│  Alterar role de Sara Secundo?                            │
│                                                            │
│  Role atual:    AUX                                        │
│  Nova role:     OP                                         │
│                                                            │
│  O usuário perderá acesso a:                              │
│  - Monitoria (preenchimento)                              │
│  - Diário de bordo (visualização)                         │
│                                                            │
│                          [ Cancelar ]  [ Alterar ]        │
└──────────────────────────────────────────────────────────┘
```

Mostra **o que muda** pra o ADM saber o impacto.

### Modal "Ativar / Desativar"

```
┌──────────────────────────────────────────────────────────┐
│  Desativar Sara Secundo?                                  │
│                                                            │
│  O usuário não conseguirá mais fazer login. Ele continua  │
│  visível nos registros históricos (monitorias, diários,   │
│  etc) mas não aparece nas listagens ativas.               │
│                                                            │
│                          [ Cancelar ]  [ Desativar ]      │
└──────────────────────────────────────────────────────────┘
```

Reverte com modal similar "Ativar Sara Secundo?".

## Server actions

Criar em `src/lib/users/actions/`:

- `create-user-action.ts` — Cria no Supabase Auth + cria profile
- `update-user-action.ts` — Atualiza profile (nome, email corp.)
- `update-user-role-action.ts` — Alterna entre OP e AUX
- `set-user-password-action.ts` — Define nova senha + retorna a senha
- `toggle-user-active-action.ts` — Alterna `is_active`

**TODAS** usam `SUPABASE_SERVICE_ROLE_KEY` em algum momento (criar, 
mudar senha, mudar email do Auth, deletar sessões ao desativar).

### Padrão de retorno

```typescript
type Result =
  | { success: true; ...extras }
  | { success: false; error: string };

// Para set-user-password-action especificamente:
type SetPasswordResult =
  | { success: true; password: string }   // a senha que foi salva
  | { success: false; error: string };
```

## Funções de leitura

Em `src/lib/users/`:

- `get-all-users.ts` — Lista todos os profiles (ativos + inativos)
- `get-user-by-id.ts` — Detalhe único pra edição

## Componentes

`src/components/config/usuarios/`:

- `users-table.tsx` — Tabela principal
- `users-page-actions.tsx` — Wrapper client do botão "+ Novo usuário"
- `new-user-modal.tsx` — Modal de criação
- `edit-user-modal.tsx` — Modal de edição
- `set-password-modal.tsx` — Modal de definir senha (2 estados: pedir + exibir)
- `change-role-button.tsx` — Botão e modal de alternar role
- `toggle-active-button.tsx` — Botão e modal de ativar/desativar
- `password-reveal-card.tsx` — Card que exibe a senha definida com botão copiar
- `generate-password-button.tsx` — Botão "Gerar aleatória" que preenche o input

## Helpers

`src/lib/users/`:

- `generate-password.ts` — Gera senha aleatória de 12 caracteres alfanuméricos
  (sem caracteres ambíguos: 0/O, l/1, etc)
- `validate-username.ts` — Valida formato e checa unicidade no banco

## Middleware (login bloqueado pra inativos)

Em `src/lib/auth/get-current-user.ts` (ou similar), após buscar o 
profile, verificar:

```typescript
if (!profile.is_active) {
  // força logout
  await supabase.auth.signOut();
  return null;
}
```

E em `src/lib/auth/actions/login-action.ts` (ou onde processa o login):

```typescript
// Após autenticar com sucesso, verifica profile
const { data: profile } = await supabase
  .from("profiles")
  .select("is_active")
  .eq("id", userId)
  .single();

if (!profile?.is_active) {
  await supabase.auth.signOut();
  return { error: "Conta desativada. Contate o administrador." };
}
```

## Atualização de listagens existentes

Adicionar filtro `is_active = true` nas seguintes funções de leitura:

- `src/lib/d-1/get-team-members.ts` (e equivalentes)
- `src/lib/monitorias/get-all-operators-no-gestor.ts`
- `src/lib/monitorias/get-aux-operators.ts`
- `src/lib/rv/get-all-operators-with-emails.ts`
- `src/lib/diario/get-operators-with-counts.ts`
- Qualquer outra função que liste profiles para selecionar operadores

**Atenção:** funções que mostram dados HISTÓRICOS (ex: registros antigos 
do operador desativado) NÃO filtram — devem manter visibilidade pra 
ADM/AUX continuarem vendo o passado.

## Sidebar

Adicionar 3º item na seção Configurações:

```
📂 Configurações
   KPI
   RV
   Usuários  ← novo
```

## Estados

### Loading
- Tabela: skeleton de 5-10 linhas
- Modais: spinner no botão de submit

### Erro
- Falha de listagem: card central "Erro ao carregar usuários"
- Falha de submit: toast vermelho com mensagem específica
- Username já existe: toast vermelho "Username já cadastrado"

### Sucesso
- Toast verde com mensagem específica
- Lista atualiza
- Modal fecha (exceto após definir senha — fecha só depois de ADM confirmar)

## Animações

- PageTransition no carregamento
- Modais com fade + scale
- Linhas da tabela em stagger leve
- Botão de copiar com check verde ao copiar (igual ao da monitoria)

## Acessibilidade

- Modais com `role="dialog"` e foco gerenciado
- Botões de ação com `aria-label` claro
- Tabela com `<table>` semântico, `<thead>` e `<tbody>`
- Inputs com `<label>` associado

## Responsividade

- **Desktop:** tabela completa
- **Tablet:** colunas Login e Email viram tooltip ou stacked
- **Mobile:** tabela vira lista de cards, cada card tem todas as ações

## Observações importantes

- Senha NUNCA é armazenada em texto plano no banco
- Senha definida só é exibida UMA VEZ após salvar
- `is_active` é a forma de "remover" usuário — apagar do banco quebra histórico
- ADM não consegue se editar/desativar/excluir
- Alternância de role limitada a OP ↔ AUX (decisão deliberada)
- Service role key é OBRIGATÓRIA — sem ela, o painel não funciona
- Ao desativar, sessão ativa do usuário NÃO é encerrada automaticamente — 
  ele será deslogado no próximo refresh quando o middleware bloquear

## Versão

1.0 — criada antes da implementação.