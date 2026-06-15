# D-1 — Relatório por Supervisor (empresa toda)

## Visão geral

Evolução da feature de exportação do D-1 Consolidado para cobrir a empresa
inteira, com filtro por supervisor. Hoje o sistema lê a base de uma equipe
(Ana Angelica) e gera o print da tabela pra colar no Teams. Agora a base
contém todos os operadores da empresa, e o usuário seleciona qual supervisor
quer exportar — o site monta a tabela só daquela equipe.

Inclui também um usuário dedicado "relatorio" para acesso restrito a essa
função, sem precisar do perfil de ADM.

## Escopo desta versão

- Apenas D-1 (Consolidado, Tempo Logado, Indisponibilidade).
- KPI continua exclusivo do ADM — não entra aqui.
- O ADM continua tirando relatório como hoje (não muda nada pra ele).
- Foco: leitura da nova base (empresa toda), filtro por supervisor, e o
  usuário "relatorio".

## Usuário "relatorio"

NÃO é um role novo — é um usuário específico (login `relatorio`, senha `123`)
que dá acesso a uma pessoa para tirar relatórios sem usar o próprio perfil.

- Login: `relatorio`
- Senha: `123`
- Acesso: somente as 3 páginas de D-1 (Consolidado, Tempo Logado,
  Indisponibilidade), com a função de exportar relatório por supervisor.
- NÃO vê: KPI, RV, Evolução, Configurações, Registros, nem qualquer outra
  seção.
- A sidebar desse usuário mostra só a seção D-1.

Permissões: reusar/ajustar as permissões existentes de D-1 (`manage_base`
ou equivalente que libera a exportação). O usuário `relatorio` recebe apenas
o conjunto mínimo pra ver D-1 e exportar. Nenhuma permissão de KPI/RV/config.

## Nova estrutura da base (Google Sheets)

A planilha é a mesma fonte de hoje (D1 - BASE), mas agora com todos os
operadores da empresa e uma estrutura de colunas nova.

### Bloco de operadores (uma linha por operador — empresa toda)

| Coluna | Conteúdo |
|--------|----------|
| A | Email do operador (ex: caio.vsilva@alloha.com) |
| B | Nome do supervisor do operador |
| C | Retidos (número) |
| D | Cancelados (número) |
| E | Pedidos (número) |
| F | Tx de retenção |

A coluna B é a chave do filtro: o sistema agrupa os operadores por supervisor.

### Bloco de totais por supervisor (colunas H–K, empilhado verticalmente)

Cada supervisor é um bloco de 2 linhas, separados por uma linha vazia:
    H              I            J            K
┌─────────────────────────────────────────────────┐
│ [Nome do Supervisor — célula mesclada H:K]       │  ← linha do nome
├──────────────┬─────────────┬──────────┬──────────┤
│ retido total │ cancelados  │ pedidos  │ tx equipe│  ← linha de dados
└──────────────┴─────────────┴──────────┴──────────┘
(linha vazia)
[Próximo supervisor — mesclada]
retido total   cancelados    pedidos     tx equipe
(linha vazia)
...

- Linha do nome: supervisor em célula mesclada de H até K.
- Linha de dados (logo abaixo): H = retido total, I = cancelados, J = pedidos,
  K = tx da equipe.
- Linha vazia separando um supervisor do próximo.
- Os blocos se repetem na mesma faixa de colunas (H–K), descendo as linhas.

### Hora do report

- Célula `M2` — hora do report (igual ao modelo antigo, que usava L2).

## Comportamento do filtro

1. O site lê a coluna B (todos os operadores) e monta a **lista de
   supervisores distintos** para o filtro.
2. O usuário seleciona um supervisor.
3. O site monta a tabela:
   - **Linhas:** todos os operadores cuja coluna B = supervisor selecionado
     (email da A, retido C, cancelado D, pedidos E, tx F).
   - **Linha EQUIPE (totais):** o bloco H–K daquele supervisor, localizado
     pelo nome na linha mesclada. Pega retido (H), cancelados (I), pedidos (J),
     tx (K) da linha de dados do bloco.
   - **Hora:** M2.
4. Gera o print/imagem da tabela igual hoje (mesma exportação visual estilo
   planilha já existente), pra colar no Teams.

## Leitura da planilha — regras

- Localizar os blocos de supervisor em H–K: varrer as linhas procurando as
  células mescladas (linha do nome) e ler a linha imediatamente abaixo como
  os dados. A linha vazia entre blocos delimita.
- Casar o nome do supervisor selecionado (do filtro) com o nome do bloco
  em H–K para achar os totais corretos.
- Atenção a inconsistências de nome: o nome do supervisor na coluna B e o
  nome no bloco H–K devem casar. Normalizar (trim, caixa) na comparação para
  evitar falha por espaço/maiúscula.
- `#DIV/0!` na tx → exibir como `—` (travessão), igual ao modelo atual.
- Operador sem dados: linha zerada, não some.

## Exportação visual

- Mantém o estilo de planilha Excel já aplicado nas tabelas de D-1
  (cabeçalho azul escuro, fonte Segoe UI/Consolas, fundo branco, etc).
- A tabela exportada tem as colunas: Operador | Retidos | Cancelados |
  Pedidos | Tx, com a linha EQUIPE (totais do supervisor) no final.
- Texto do report + PNG copiados pro clipboard, igual ao fluxo atual.

## Estados

- **Sem supervisor selecionado:** estado neutro pedindo pra escolher um
  supervisor no filtro.
- **Supervisor sem operadores:** aviso "Nenhum operador encontrado para
  este supervisor."
- **Falha de leitura do Sheets:** card de erro com "Tentar novamente"
  (igual ao modelo atual).

## Decisões técnicas

- A lista de supervisores vem da coluna B (distintos), não dos blocos H–K —
  garante que todo supervisor com operador aparece no filtro.
- Os totais vêm dos blocos H–K (pré-calculados na planilha), não somados no
  site — mantém a planilha como fonte da verdade, igual ao modelo atual com
  os totais da equipe.
- A base é a mesma planilha de hoje, só com estrutura ampliada — não há banco
  intermediário nem pipeline novo. O site só lê e exporta.

## Fora do escopo (por enquanto)

- KPI por supervisor (segue só no ADM).
- RV, Evolução e demais seções para o usuário relatorio.
- Tempo Logado e Indisponibilidade com filtro por supervisor — esta versão
  documenta o Consolidado; as outras duas seguem o mesmo padrão quando forem
  implementadas.

## Versão

1.0 — relatório D-1 por supervisor (empresa toda) + usuário relatorio.