# Configurações do Supervisor — Nome Fantasia dos Operadores

## Visão geral

Tela de configuração onde o supervisor define "nomes fantasia" (apelidos) pros
operadores da equipe. Quando ativado, esses nomes substituem os nomes reais nas
tabelas de D-1 Consolidado, Tempo Logado e Indisponibilidade do painel do
gestor (inclusive na exportação PNG). É tudo-ou-nada: ou a equipe toda usa nome
fantasia, ou nenhum usa.

## Escopo

- Interruptor global (por supervisor): nome fantasia LIGADO ou DESLIGADO pra
  equipe inteira.
- Quando ligado: o supervisor define o nome fantasia de CADA operador (todos
  obrigatórios pra salvar).
- Os nomes fantasia substituem os reais nas 3 tabelas do painel do gestor
  (Consolidado, Tempo Logado, Indisponibilidade) e nos PNGs exportados delas.
- Persistente: fica salvo, e o supervisor pode editar quando quiser.
- Por supervisor: cada gestor tem seus próprios nomes fantasia, só pra equipe
  dele.

## Quem acessa

- Role GESTOR. Cada gestor configura só a própria equipe.

## Sidebar

Novo grupo na sidebar do gestor:
⚙️ Configurações

Operadores
- Grupo "Configurações", sub-item "Operadores" → /config-supervisor/operadores
  (ou /configuracoes/operadores — definir rota que não conflite com o /config
  do ADM).
- onlyRoles: ["GESTOR"]

## Tela "Operadores"

### Interruptor de nome fantasia (global)
- Um botão/switch: "Usar nome fantasia para a equipe? Sim / Não".
- Não → as tabelas usam os nomes reais. A lista de edição fica oculta/desativada.
- Sim → abre a lista de operadores pra definir o nome fantasia de cada um.

### Lista de operadores (quando "Sim")
- Lista todos os operadores da equipe (vindos da planilha do D-1 — ver Fonte).
- Cada operador: nome real (referência) + campo pra digitar o nome fantasia.
- TODOS os campos são obrigatórios pra salvar (regra: ao ligar o nome fantasia,
  todos os operadores precisam ter um apelido — não deixa salvar pela metade).
- Botão "Salvar".
- Validação: se "Sim" e algum operador sem nome fantasia → bloqueia o salvar e
  indica os que faltam.

### Edição
- Os nomes salvos ficam fixos. O supervisor pode reabrir a tela, editar os
  nomes e salvar de novo.
- Pode desligar (Não) — os nomes ficam guardados, mas as tabelas voltam a usar
  os reais. Ao religar (Sim), os nomes anteriores reaparecem pra edição.

## Fonte dos operadores

- A lista de operadores vem da planilha do D-1 (as guias do gestor no Google
  Sheets) — os mesmos operadores que aparecem nas tabelas do painel.
- Cada operador é identificado pelo EMAIL (chave consistente, igual ao resto do
  sistema). O nome fantasia é vinculado ao email do operador.
- Ao abrir a tela, buscar a lista de operadores da equipe (emails + nomes reais
  derivados) e cruzar com os nomes fantasia já salvos.

## Armazenamento

Tabela nova:
operador_nome_fantasia (

id uuid PK,

gestor_id uuid,            -- ou supervisor_name / identificação do gestor

operador_email text,       -- chave do operador

nome_fantasia text,

updated_at timestamptz,

UNIQUE (gestor_id, operador_email)

)
- Mais um registro do estado do interruptor por gestor:
  - Opção: uma tabela/campo "nome_fantasia_ativo" por gestor (boolean), OU
    inferir "ativo" pela existência de registros. RECOMENDADO: um flag explícito
    por gestor (tabela de config do gestor ou um campo). Definir na implementação
    — um simples registro de configuração por gestor com o boolean.
- Vínculo do gestor: usar o id do profile do gestor (gestor_id) é mais robusto
  que o nome. Avaliar na implementação (gestor_id do profile logado).

## Aplicação nas tabelas (D-1, Tempo Logado, Indisponibilidade)

- Nas 3 tabelas do painel do gestor, ao montar as linhas, se o nome fantasia
  estiver ATIVO pra aquele gestor:
  - Substituir o nome exibido do operador pelo nome fantasia (buscando pelo
    email).
  - Operador sem fantasia não acontece (a regra obriga todos preenchidos quando
    ativo).
- Quando inativo: nome real (comportamento atual).
- A substituição é só na EXIBIÇÃO (o dado real/email permanece intacto por trás).

### Exportação PNG
- O PNG (copiar como imagem) das 3 tabelas também usa o nome fantasia quando
  ativo (é o principal motivo do recurso — exportar sem o nome real).
- Garantir que a versão "excel/PNG" das tabelas aplica o fantasia igual à versão
  de tela.

## O que NÃO muda

- KPI da equipe, Quartil, KPI individual e qualquer outra tela continuam com o
  nome REAL. O nome fantasia vale SÓ nas 3 tabelas (Consolidado, Tempo Logado,
  Indisponibilidade) do painel do gestor.

## Camada de dados

- getNomeFantasiaConfig(gestorId): retorna { ativo: boolean, mapa: 
  Map<email, nomeFantasia> }.
- saveNomeFantasia(gestorId, ativo, lista): salva o flag + os nomes (valida
  todos preenchidos se ativo).
- Nas 3 tabelas: aplicar o mapa de fantasia na montagem das linhas quando ativo.

## Decisões técnicas

- Tudo-ou-nada por supervisor (flag global), nomes obrigatórios pra todos quando
  ativo.
- Vínculo por email do operador; gestor identificado pelo profile.
- Substituição só na exibição (tela + PNG) das 3 tabelas; dado real intacto.
- Lista de operadores vinda da planilha do D-1.

## Evolução futura (fora do escopo)

- Nome fantasia em outras telas (se um dia quiser).
- Importação em massa dos nomes fantasia.

## Versão

1.0 — nome fantasia dos operadores (global por supervisor), aplicado nas 3
tabelas do painel do gestor + PNG.