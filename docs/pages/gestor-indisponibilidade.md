# Painel do Gestor — Indisponibilidade (equipe própria)

## Visão geral

Terceira aba do painel do gestor: a Indisponibilidade da equipe. Mostra, por
operador, o percentual de indisponibilidade no dia e a composição das pausas
(NR17, particular, outras). Lê da MESMA guia do tempo logado (ex: "ANA
ANGELICA2"), aproveitando dados já calculados pela planilha.

## Escopo

- Tabela de indisponibilidade da equipe do gestor.
- Sem área de upload: os dados vêm da BASE - 2 (a mesma do tempo logado), que
  já tem upload na aba de Tempo Logado.
- Sem registro de hora próprio: compartilha a hora do report com o Tempo
  Logado (a hora fica em BASE - 2!S2, já gravada no upload de tempo logado).

## Meta

- Meta de indisponibilidade: **menos que 14,5%**.
- Operador com indisponibilidade >= 14,5% é sinalizado (linha vermelha, mesmo
  modelo das outras tabelas).

## Rota e sidebar

- Rota: /gestor/indisponibilidade (segue o padrão das outras abas do gestor).
- Sidebar do gestor: adicionar "Indisponibilidade" abaixo de "Tempo Logado",
  só pra role GESTOR (mesmo onlyRoles).

## Fonte de dados

- **Guia de leitura:** a mesma do tempo logado — "<GESTOR>2" (ex: "ANA
  ANGELICA2"). Derivada do username (mesma regra: username com ponto→espaço,
  CAPS, + "2").
- **Hora do report:** BASE - 2!S2 (compartilhada com o tempo logado, já
  gravada no upload de lá).
- Sem upload próprio nesta aba.

## Mapeamento da guia (colunas de indisponibilidade)

Uma linha por operador (a mesma guia do tempo logado, colunas diferentes):

| Coluna | Conteúdo |
|--------|----------|
| A | Email do operador |
| I | Indisponibilidade (%) — meta < 14,5% |
| J | Tempo indisponível total (00:00:00) — denominador dos cálculos |
| L | Pausa 10 |
| M | Pausa 20 |
| N | Pausa Particular |
| O | Mon ou Taref |
| P | Tren ou Reun |
| Q | Feedback |
| R | Pré Pausa |
| S | Ativo |
| T | Take Blip |
| U | Pausa 15 |
| V | Pausa 40 |
| W | Operacional |
| X | E-mail |
| Y | Indisponível |
| Z | Sistema |
| AA | Pausa Sem Motivo — **NÃO entra em nenhum cálculo** (excluída de propósito) |

Todos os tempos (J e as pausas L–Z) estão em formato 00:00:00. Para os
cálculos, converter pra segundos.

## Tabela

4 colunas (+ operador):

| Operador | Indisponibilidade % | NR17 % | Pausa Particular % | Outras Pausas % |
|----------|---------------------|--------|--------------------|-----------------|

### Operador
- Nome derivado do email (mesma derivação das outras abas).

### Indisponibilidade %
- Coluna I direto (já em %).
- Regra de cor: >= 14,5% → linha inteira vermelha (mesmo modelo das outras
  tabelas, fundo vermelho claro, nome incluso). < 14,5% → linha normal.

### NR17 %
- (Pausa 10 + Pausa 20) ÷ tempo indisponível (J).
- = (L + M) / J, em %.
- Proporção do tempo indisponível que foi NR17.

### Pausa Particular %
- Pausa Particular (N) ÷ tempo indisponível (J).
- = N / J, em %.

### Outras Pausas %
- Soma de TODAS as outras pausas ÷ tempo indisponível (J).
- = (O + P + Q + R + S + T + U + V + W + X + Y + Z) / J, em %.
- Inclui: Mon ou Taref, Tren ou Reun, Feedback, Pré Pausa, Ativo, Take Blip,
  Pausa 15, Pausa 40, Operacional, E-mail, Indisponível, Sistema.
  (Sistema e Indisponível também são pausas e entram aqui.)
- EXCLUI: Pausa 10 (L) e Pausa 20 (M) — já contam na NR17; Pausa Particular
  (N) — tem coluna própria; **Pausa Sem Motivo (AA) — excluída de propósito**.

## Cálculo — observações

- Todos os percentuais são proporção sobre o tempo indisponível total (J).
- Converter cada tempo (00:00:00) pra segundos antes de dividir.
- Se J (tempo indisponível) for 0 → evitar divisão por zero: exibir "—" ou 0%
  pros percentuais de pausa daquele operador.
- A Indisponibilidade % (coluna I) vem pronta da planilha — não é recalculada.

## Visual

- Mesma tabela visual das outras abas do gestor (variant screen na tela,
  variant excel pro PNG): cabeçalho azul, Segoe UI, centralizado, regra de
  linha vermelha igual.
- Exportação: copiar como imagem (título "INDISPONIBILIDADE" + report das HH:MM
  + PNG), reusando o fluxo já existente. A hora vem de BASE - 2!S2.

## Permissões

- GESTOR vê a aba de indisponibilidade do próprio painel (role GESTOR,
  onlyRoles).
- Sem upload nesta aba (os dados vêm da BASE - 2, alimentada pelo upload do
  Tempo Logado).

## Decisões técnicas

- Reusa a leitura por guia do gestor, apontando pra mesma guia do tempo logado
  ("<GESTOR>2") mas lendo colunas diferentes (I, J, L–Z). Pode ser uma função
  de leitura própria (fetchGestorIndisponibilidade) ou estender a leitura do
  tempo logado — avaliar na implementação.
- Os percentuais (NR17, particular, outras) são calculados no site a partir
  dos tempos brutos das pausas / tempo indisponível. A indisponibilidade (I)
  vem pronta.
- Pausa Sem Motivo (AA) é lida? Não precisa — não entra em nada. Pode ser
  ignorada na leitura.
- Hora do report compartilhada: ler BASE - 2!S2 (mesma do tempo logado).

## Evolução futura (fora do escopo)

- Detalhe por operador (breakdown completo de todas as pausas ao clicar).
- KPI/RV do gestor.

## Versão

1.0 — Indisponibilidade do gestor (equipe própria), guia "<GESTOR>2",
hora compartilhada via BASE - 2!S2.