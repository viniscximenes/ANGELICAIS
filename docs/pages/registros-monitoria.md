# REGISTROS — Monitoria

## Objetivo

Permitir que o ADM cadastre ligações para monitoria, atribuindo um AUX 
responsável por avaliar. O AUX recebe a ligação na sua fila, ouve via 
OneDrive e preenche um formulário de avaliação. Após finalizar, a 
monitoria fica bloqueada para edição (apenas ADM pode editar/deletar).

O sistema mantém histórico de 2 meses (atual + anterior). Mês mais 
antigo é apagado automaticamente ao virar o mês novo.

## Rota

`/registros/monitoria`

## Quem acessa

- **ADM** — vê todas as monitorias, cadastra novas, edita e deleta
- **AUX** — vê apenas monitorias atribuídas a ele, preenche o formulário
- **OP / GESTOR** — redirecionados (não acessam)

## Lógica de negócio

### Ciclo de vida de uma monitoria

1. **Criada pelo ADM:**
   - Define operador alvo (quem foi gravado)
   - Define AUX responsável pela avaliação
   - Preenche ID da chamada, contrato, data, anexo
   - Estado inicial: `pending` (não preenchida)

2. **Aparece na fila do AUX:**
   - AUX vê na lista apenas as suas
   - Pode clicar pra abrir e preencher
   - Pode salvar parcial (mas continua `pending`)

3. **AUX finaliza:**
   - Preenche todos os campos do formulário
   - Clica em "Finalizar monitoria"
   - Estado vira `finalized`
   - AUX não pode mais editar

4. **Apenas ADM pode reabrir/editar/deletar:**
   - Botão "Editar" volta o estado pra `pending` (deixa AUX preencher de novo) OU permite ADM editar direto
   - Botão "Deletar" exige confirmação

### Volume e retenção

- Cada operador recebe **4 monitorias por mês**
- 14 operadores × 4 = **~56 monitorias por mês**
- Sistema mantém apenas **mês atual + mês anterior** (~112 monitorias vivas)
- Ao virar o mês, apaga o mais antigo automaticamente

### Operador alvo vs AUX responsável

- **Operador alvo:** o cuja ligação foi gravada (qualquer profile com 
  role OP, AUX ou ADM cadastrado em `profiles`)
- **AUX responsável:** quem avalia (qualquer profile com role AUX 
  cadastrado em `profiles`)
- **Excluir:** profiles com role GESTOR não aparecem em nenhum dos 
  dropdowns

### Anexo da ligação

ADM cola um link do OneDrive (URL completa). O sistema **não tenta 
embeddar** — exibe um card visual estilo "player" com botão "Abrir 
gravação ↗" que abre em nova aba.

### Texto livre (resumo do atendimento)

Campo `<textarea>` grande. **Quebras de linha do operador são 
preservadas** ao exibir (sem perder formatação). O CSS deve ter 
`white-space: pre-wrap` na visualização para manter as quebras 
intencionais e o word-wrap natural.

## Modelo de dados

### Tabela `monitorias`

```sql
create table monitorias (
  id uuid primary key default gen_random_uuid(),
  
  -- Referências
  operator_email text not null,              -- email do operador alvo
  aux_responsible_email text not null,       -- email do AUX que vai avaliar
  
  -- Cadastro inicial (preenchido pelo ADM)
  id_chamada text not null,                  -- formato livre, alfanumérico
  contrato_cliente text not null,            -- apenas números (validado na app)
  data_atendimento date not null,            -- sempre mês atual no cadastro
  link_onedrive text not null,
  
  -- Formulário de avaliação (preenchido pelo AUX)
  encaminhou_pesquisa boolean,               -- null = não preenchido
  sinalizacao_principal text,                -- enum (ver abaixo)
  
  nota_apresentacao text,                    -- enum: 'muito_ruim', 'ruim', 'neutro', 'bom', 'muito_bom'
  nota_comunicacao text,
  nota_processo text,
  
  resumo_atendimento text,                   -- texto livre, multi-line
  
  -- Estado
  status text not null default 'pending' check (status in ('pending', 'finalized')),
  finalized_at timestamptz,
  finalized_by uuid references profiles(id),
  
  -- Auditoria
  created_at timestamptz default now(),
  created_by uuid not null references profiles(id),
  updated_at timestamptz default now()
);

create index monitorias_operator_idx on monitorias(operator_email);
create index monitorias_aux_idx on monitorias(aux_responsible_email);
create index monitorias_data_idx on monitorias(data_atendimento);
create index monitorias_status_idx on monitorias(status);
```

### Enum de sinalização principal

Ordem visual (do menos grave pro mais grave):

| Valor (DB) | Label (UI) |
|---|---|
| `nao_houve_falha_grave` | Não houve falha grave |
| `atendimento_nao_humanizado` | Atendimento não humanizado |
| `demora_apresentacao` | Demora na apresentação (5s voz / 20s texto) |
| `script_incorreto` | Script incorreto/agressivo |
| `falha_processo` | Houve falha no processo/atendimento |
| `transferencia_indevida` | Transferência indevida |
| `omissao_atendimento` | Omissão de atendimento |
| `destratou_cliente` | Destratou cliente |

### Enum de notas

| Valor (DB) | Label (UI) | Posição |
|---|---|---|
| `muito_ruim` | Muito ruim | 1 |
| `ruim` | Ruim | 2 |
| `neutro` | Neutro | 3 |
| `bom` | Bom | 4 |
| `muito_bom` | Muito bom | 5 |

### RLS

```sql
alter table monitorias enable row level security;

-- Leitura: ADM vê tudo, AUX vê só onde é responsável
create policy "ADM read all monitorias"
  on monitorias for select
  to authenticated
  using (is_adm());

create policy "AUX read own monitorias"
  on monitorias for select
  to authenticated
  using (
    aux_responsible_email = (select email_corporativo from profiles where id = auth.uid())
  );

-- Insert: apenas ADM
create policy "ADM insert monitorias"
  on monitorias for insert
  to authenticated
  with check (is_adm());

-- Update: ADM atualiza tudo; AUX atualiza só os campos do formulário e só se status=pending e for o responsável
create policy "ADM update monitorias"
  on monitorias for update
  to authenticated
  using (is_adm());

create policy "AUX update own pending monitorias"
  on monitorias for update
  to authenticated
  using (
    aux_responsible_email = (select email_corporativo from profiles where id = auth.uid())
    and status = 'pending'
  );

-- Delete: apenas ADM
create policy "ADM delete monitorias"
  on monitorias for delete
  to authenticated
  using (is_adm());
```

## Estrutura visual

### Header

```
Registros / Monitoria
```

Sem subtítulo.

### Layout para ADM

**Bloco 1 — Botão "Nova monitoria"** (canto direito do header)

Abre modal de criação.

**Bloco 2 — Lista de monitorias do mês atual + passado**

Tabela ou cards listando todas, com:
- Operador alvo (nome)
- AUX responsável (nome)
- Data do atendimento (DD/MM)
- ID da chamada
- Status (badge: pendente / finalizada)
- Ações (ver detalhes / editar / deletar)

Ordenação: mais recente primeiro. Filtros simples (por mês, por status, por operador).

### Layout para AUX

**Bloco único — Lista das suas monitorias pendentes + finalizadas**

Cards ou tabela, em ordem cronológica decrescente. Cada item tem:
- Operador alvo (nome)
- Data do atendimento
- Status (badge)
- Botão "Abrir" → vai para a tela de avaliação

**Sem botão de cadastrar.**

### Modal de criação (ADM)

```
┌────────────────────────────────────────────────────────────┐
│  Nova monitoria                                              │
│                                                              │
│  Operador alvo:        [ Dropdown — só OP/AUX/ADM ▼ ]       │
│  AUX responsável:      [ Dropdown — só AUX ▼ ]              │
│  ID da chamada:        [ texto                           ]   │
│  Contrato (cliente):   [ apenas números                  ]   │
│  Data do atendimento:  [ DD/MM/YYYY — mês atual          ]   │
│  Link OneDrive:        [ URL completa                    ]   │
│                                                              │
│                          [ Cancelar ]  [ Criar monitoria ]   │
└────────────────────────────────────────────────────────────┘
```

Validações:
- Operador e AUX obrigatórios
- ID da chamada não vazio
- Contrato apenas dígitos (`/^\d+$/`)
- Data dentro do mês corrente (não pode ser dia futuro nem mês passado)
- Link começa com `http` e parece URL válida

### Tela de avaliação (AUX e ADM ao "ver detalhes")

```
┌────────────────────────────────────────────────────────────┐
│  ← Voltar                                                    │
│                                                              │
│  MONITORIA — DD/MM/YYYY                                     │
│  Operador: Samyrha Fenix                                     │
│  ID Chamada: ABC123  •  Contrato: 12345678                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🎧                                                    │  │
│  │     Gravação da ligação                                │  │
│  │                                                        │  │
│  │  [▶ Abrir gravação ↗]                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Colaborador encaminhou cliente para pesquisa de satisfação? │
│  ( ) Sim    ( ) Não                                          │
│                                                              │
│  Principal sinalização do atendimento:                       │
│  ( ) Não houve falha grave                                   │
│  ( ) Atendimento não humanizado                              │
│  ( ) Demora na apresentação (5s voz / 20s texto)             │
│  ( ) Script incorreto/agressivo                              │
│  ( ) Houve falha no processo/atendimento                     │
│  ( ) Transferência indevida                                  │
│  ( ) Omissão de atendimento                                  │
│  ( ) Destratou cliente                                       │
│                                                              │
│  Como você avalia cada fase do atendimento:                  │
│                                                              │
│  Apresentação                                                │
│  ○ Muito ruim  ○ Ruim  ○ Neutro  ○ Bom  ○ Muito bom         │
│                                                              │
│  Comunicação                                                 │
│  ○ Muito ruim  ○ Ruim  ○ Neutro  ○ Bom  ○ Muito bom         │
│                                                              │
│  Processo                                                    │
│  ○ Muito ruim  ○ Ruim  ○ Neutro  ○ Bom  ○ Muito bom         │
│                                                              │
│  Resumo do atendimento:                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  (textarea grande, multi-line)                         │  │
│  │                                                        │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│                            [ Salvar ]  [ Finalizar ]         │
└────────────────────────────────────────────────────────────┘
```

**Botões:**

- **Salvar:** salva sem mudar status (continua `pending`)
- **Finalizar:** valida que tudo está preenchido → muda status pra `finalized`
- AUX só pode preencher se `status === 'pending'` e ele for o responsável
- Após `finalized`: campos ficam read-only pra AUX. Mostra "Monitoria finalizada em DD/MM/YYYY"

### Player de gravação

```
┌──────────────────────────────────────────────────────┐
│  🎧                                                    │
│     Gravação da ligação                                │
│     Hospedada no OneDrive                              │
│                                                        │
│  [▶ Abrir gravação ↗]                                  │
└──────────────────────────────────────────────────────┘
```

Visual de "card de player" com:
- Ícone de fone grande
- Texto "Gravação da ligação"
- Subtítulo "Hospedada no OneDrive"
- Botão grande com play + texto "Abrir gravação ↗"

Ao clicar, abre `link_onedrive` em **nova aba** (target="_blank").

### Edição/deleção pelo ADM

Na lista (apenas ADM vê):
- Ícone "Editar" → leva pra tela de avaliação editável (mesmo se finalized)
- Ícone "Deletar" → confirm "Tem certeza? Esta ação não pode ser desfeita." → apaga

### Preservação de quebras de linha

No campo `resumo_atendimento`:
- **Salvar:** texto cru, com `\n` preservados
- **Exibir:** CSS `white-space: pre-wrap` para manter quebras intencionais 
  e permitir word-wrap nas margens

## Fluxos principais

### ADM cadastra nova monitoria

1. ADM clica em "Nova monitoria"
2. Modal abre
3. ADM preenche os 6 campos
4. Sistema valida (contrato só números, data no mês atual, URL válida)
5. Salva no banco com `status='pending'`, `created_by=ADM`
6. **Aplica retenção:** se já há 2 meses únicos no banco e o `data_atendimento` 
   é de mês novo, apaga o mês mais antigo
7. Toast "Monitoria criada"
8. Lista atualiza

### AUX preenche e finaliza

1. AUX entra na página, vê suas monitorias
2. Clica em uma `pending`
3. Tela de avaliação abre
4. AUX clica "Abrir gravação ↗" (nova aba)
5. Volta, preenche o formulário
6. Clica "Salvar" → fica `pending`, pode voltar depois
7. Quando completo, clica "Finalizar"
8. Sistema valida que tudo está preenchido
9. Atualiza `status='finalized'`, `finalized_at=now()`, `finalized_by=AUX`
10. Toast "Monitoria finalizada"

### ADM edita finalizada

1. ADM clica "Editar" numa monitoria `finalized`
2. Sistema abre a tela em modo de edição (todos os campos liberados)
3. ADM altera o que precisa
4. Clica "Salvar"
5. **Mantém o status como `finalized`** (não volta pra `pending`)
6. Toast "Monitoria atualizada"

### ADM deleta

1. ADM clica em "Deletar"
2. Confirm nativo: "Tem certeza? Esta ação não pode ser desfeita."
3. Confirma → delete no banco
4. Toast "Monitoria removida"

## Server actions

Criar em `src/lib/monitorias/actions/`:

- `create-monitoria-action.ts` — Cria nova (ADM only)
- `update-monitoria-action.ts` — Atualiza campos do formulário (AUX ou ADM)
- `finalize-monitoria-action.ts` — Marca como finalizada (AUX)
- `delete-monitoria-action.ts` — Apaga (ADM only)

Funções de leitura em `src/lib/monitorias/`:

- `get-monitorias-for-admin.ts` — Lista tudo
- `get-monitorias-for-aux.ts` — Filtra por email do AUX
- `get-monitoria-by-id.ts` — Detalhe único
- `apply-retention.ts` — Helper que apaga mês mais antigo se passar de 2

## Componentes a criar

`src/components/registros/monitoria/`:
- `monitoria-list-admin.tsx` — Lista com ações (ADM)
- `monitoria-list-aux.tsx` — Lista simples (AUX)
- `monitoria-list-row.tsx` — Linha reusável da lista
- `new-monitoria-modal.tsx` — Modal de criação
- `monitoria-form.tsx` — Formulário completo de avaliação
- `monitoria-player-card.tsx` — Card visual do "player"
- `rating-radio-group.tsx` — Grupo de 5 bolinhas (Muito ruim → Muito bom)
- `sinalizacao-radio-group.tsx` — 8 opções (do menos grave pro mais grave)

## Sidebar

Adicionar nova seção `Registros` na sidebar do ADM e AUX:

```
📂 Registros
   Monitoria
```

Para OP/GESTOR: seção não aparece.

## Estados

### Loading
Skeletons em lugar das linhas / modal vazio.

### Erro
- Falha de leitura: card central "Erro ao carregar"
- Falha ao salvar: toast vermelho específico

### Vazio
- **ADM sem monitorias cadastradas:** "Nenhuma monitoria cadastrada. Clique em 'Nova monitoria' para começar."
- **AUX sem monitorias atribuídas:** "Você não tem monitorias atribuídas no momento."

### Sucesso
Render padrão.

## Animações

- PageTransition no carregamento
- Modal de criação com fade + scale
- Linhas da lista em stagger leve

## Acessibilidade

- Radio groups com `role="radiogroup"` e `aria-label`
- Modal com `role="dialog"` e foco gerenciado
- Botões com `aria-busy` durante save
- Lista com `<table>` semântico quando aplicável

## Responsividade

- **Desktop (≥ 1024px):** layout completo, lista em tabela
- **Tablet (640-1023px):** lista em cards verticais
- **Mobile (< 640px):** cards empilhados, modal full-screen

## Observações

- Esta é a primeira página com **escrita por múltiplos roles** (ADM e AUX)
- RLS é crítico aqui — testar bem que AUX só lê o que é dele
- Preservar quebras de linha no resumo é essencial (`white-space: pre-wrap`)
- Player é só visual — quem reproduz é o OneDrive em nova aba
- Retenção de 2 meses é automática, sem botão manual
- Contrato como `text` (não `bigint`) pra preservar zeros à esquerda

## Versão

1.0 — criada antes da implementação.