# Painel do Gestor — Tempo Logado (equipe própria)

## Visão geral

Segunda aba do painel do gestor: o Tempo Logado da equipe. O gestor vê quanto
cada operador da equipe ficou logado no dia, se cumpriu a meta mínima, a
estimativa de horário pra deslogar, e os horários de login/logout. Lê da guia
de tempo logado do gestor (ex: "ANA ANGELICA2"), separada da guia de
consolidado ("ANA ANGELICA").

Aproveita a infraestrutura do painel do gestor já existente (role GESTOR,
rota /gestor, vínculo por guia).

## Escopo

- Tabela de tempo logado da equipe do gestor.
- Leitura da guia "<GESTOR>2" (dados já calculados pela planilha).
- Gravação da hora do report em BASE - 2!S2 no upload (o upload de tempo
  logado já existe; só adicionar o registro da hora).

## Meta

- Meta mínima obrigatória de tempo logado: **06:20:00**.
- Operador com tempo logado abaixo de 06:20:00 é sinalizado (linha vermelha).

## Rota e sidebar

- Rota: /gestor/tempo-logado (segue o padrão de /gestor/d-1).
- Sidebar do gestor: adicionar "Tempo Logado" abaixo de "D-1 Equipe" (ou nome
  equivalente), só pra role GESTOR (mesmo onlyRoles do painel D-1).

## Duas guias na planilha (tempo logado)

- **BASE - 2** (escrita): onde o gestor cola o CSV de tempo logado. O upload
  já existe. Adicionar: gravar a hora do report em S2.
- **"<GESTOR>2"** (leitura): guia por gestor com os dados calculados. Para a
  Ana Angelica: **"ANA ANGELICA2"** (o nome curto do gestor + "2" no final,
  sem espaço antes do 2).

## Mapeamento da guia de leitura "ANA ANGELICA2"

Uma linha por operador da equipe:

| Coluna | Conteúdo |
|--------|----------|
| A | Email do operador (@alloha.com) |
| B | Nome do gestor |
| C | Tempo logado (formato 00:00:00) — meta mínima 06:20:00 |
| D | Tempo que falta pra completar 06:20:00 (calculado na planilha) |
| E | Estimativa de horário pra deslogar e cumprir a meta (calculado, usa a hora do report) |
| F | Hora de login — vem como "Tue, 26 May 2026 14:04:52"; exibir só a hora (14:04:52) |
| G | Hora de logout (formato 00:00:00) ou estados especiais (ver abaixo) |

Todos os valores de D e E já vêm calculados pela planilha — o site só lê.

### Estados de login/logout (F e G)

- **Operador não foi (sem registro no dia):** F e G ambos vazios/sem registro.
- **Operador ainda logado (base tirada no meio do dia, sem logout):** G = "sem
  dados" (login existe em F, logout ainda não).
- **Operador completou o dia:** F = hora de login, G = hora de logout.

O site trata cada estado na exibição (ex: "sem dados" → "Ainda logado" ou
travessão; vazio → "Sem registro").

## Tabela (mesmo visual do D-1 Consolidado equipe)

5 colunas:

| Operador | Tempo Logado | Logout Estimado | Login | Logout |
|----------|--------------|-----------------|-------|--------|

- **Operador:** nome derivado do email (mesma derivação do painel D-1).
- **Tempo Logado:** coluna C (00:00:00).
- **Logout Estimado:** coluna E (estimativa de horário pra deslogar).
- **Login:** coluna F, só a hora extraída (14:04:52).
- **Logout:** coluna G (hora, ou "sem dados"/sem registro tratados).

A coluna D (tempo que falta) NÃO entra na tabela — é dado interno, não exibido.

Visual idêntico ao da tabela de equipe do D-1 (variant screen na tela, variant
excel pro PNG): mesma fonte, cores, cabeçalho, exportação.

## Regra de cor — linha inteira vermelha

- Se o **tempo logado (C) < 06:20:00** → a LINHA INTEIRA do operador fica
  vermelha (fundo vermelho claro, igual ao D-1 consolidado), incluindo o nome.
- Se tempo logado >= 06:20:00 → linha normal.
- A comparação é de tempo (HH:MM:SS): converter 06:20:00 e o tempo logado pra
  segundos/minutos e comparar.

## Gravação da hora do report em BASE - 2!S2

O upload de tempo logado já existe. Adicionar:
- Ao subir o CSV na BASE - 2, gravar a hora atual (HH:MM) na célula S2 da
  BASE - 2.
- S2 está fora da faixa de colunas do CSV (que vai até R, como na BASE - 1),
  então o clear/escrita do CSV não toca S2 — é um set explícito e separado.
- Essa hora é a referência pro cálculo da coluna E (estimativa de logout) na
  planilha, e pode ser exibida como "report das HH:MM" na exportação.

## Exportação

- A tabela de tempo logado pode ser exportada como PNG, mesmo fluxo das outras
  (copiar como imagem: "TEMPO LOGADO" + report das HH:MM + PNG).
- Reusar o CopyTableButton e o visual Excel já existentes.

## Permissões

- GESTOR vê a aba de tempo logado do próprio painel (role GESTOR, onlyRoles).
- GESTOR sobe a base de tempo logado (manage_d1_base, que já tem).

## Decisões técnicas

- Reusa a leitura por guia do gestor (fetchGestorData serviu de base pro D-1;
  aqui é uma leitura análoga apontando pra guia "<GESTOR>2" com o mapeamento
  de tempo logado).
- Dados de D e E já calculados na planilha — o site não recalcula, só lê e
  formata.
- A hora de login (F) precisa de parsing: extrair só a hora de uma string de
  data completa ("Tue, 26 May 2026 14:04:52" → "14:04:52").
- Resolver a guia "<GESTOR>2" a partir do gestor logado (o resolver de guia
  atual mapeia → "ANA ANGELICA"; pra tempo logado, mapear → "ANA ANGELICA2",
  ou derivar adicionando "2" ao nome da guia de consolidado).

## Evolução futura (fora do escopo)

- Indisponibilidade do gestor (terceira aba).
- KPI/RV do gestor.
- Múltiplos gestores e guias "<GESTOR>2" geridos dinamicamente.

## Versão

1.0 — Tempo Logado do gestor (equipe própria), guia "<GESTOR>2", BASE - 2!S2.