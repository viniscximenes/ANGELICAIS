# Painel do Gestor — D-1 (equipe própria)

## Visão geral

Painel exclusivo do gestor, com acesso e funções próprias (não é operador em
nenhum sentido). Cada gestor vê apenas a sua equipe. Esta primeira versão
cobre o D-1 (consolidado, motivos, contratos) da equipe do gestor, com
permissão de subir base e tirar relatório.

Aproveita a role GESTOR já existente no sistema.

## Escopo desta versão

- D-1 do gestor: consolidado dos operadores da equipe + motivos + contratos.
- Gestor sobe a base (BASE - 1) e tira o relatório (mesma exportação visual
  da tabela atual).
- Pop-up de confirmação se a última base foi colada há menos de 30 min.
- Registro da hora do report na célula S2 da BASE - 1.

FORA do escopo (futuro, documentos próprios): KPI do gestor, evolução dos
operadores, RV de gestor, múltiplos gestores via UI. Por ora, só Ana Angelica
e o D-1.

## Usuária inicial

Um único gestor nesta fase:
- Nome: ANA ANGELICA MATTOS GONCALVES
- Email corporativo: ana.angelica@alloha.com
- Login: ana.angelica
- Senha: Gestor2026
- Role: GESTOR

Criada via script/admin (igual ao usuário relatorio), já que o painel de
criação de usuário não cobre GESTOR.

## Vínculo gestor → equipe

O painel do gestor lê a guia dedicada da equipe dele. Nesta fase, a guia da
Ana Angelica é "ANA ANGELICA". Cada gestor terá sua própria guia de leitura
(a estrutura se repete). O sistema identifica a guia do gestor logado — nesta
fase, mapeada diretamente (Ana Angelica → guia "ANA ANGELICA").

(O vínculo dinâmico por KPI e override manual são evolução futura — aqui é a
guia fixa da gestora.)

## Duas guias na planilha

- **BASE - 1** (escrita): onde o gestor cola o CSV cru. A planilha recalcula
  e popula a guia de leitura. A hora do report é gravada em S2.
- **ANA ANGELICA** (leitura): o painel lê os dados já calculados daqui.

## Mapeamento da guia de leitura "ANA ANGELICA"

### Operadores (A–F) — lista, uma linha por operador da equipe

| Coluna | Conteúdo |
|--------|----------|
| A | Nome do operador |
| B | Nome da gestora ("ANA ANGELICA MATTOS GONCALVES") |
| C | Retidos |
| D | Cancelados |
| E | Pedidos |
| F | Tx de retenção |

### Consolidado da equipe (H–L) — uma linha

| Coluna | Conteúdo |
|--------|----------|
| H | Nome da gestora |
| I | Retidos (total da equipe) |
| J | Cancelados (total) |
| K | Pedidos (total) |
| L | Tx de retenção (equipe) |

### Contratos / clientes (N–Q)

| Coluna | Conteúdo |
|--------|----------|
| N | Contrato retido |
| O | Nome do cliente retido |
| P | Contrato cancelado |
| Q | Nome do cliente cancelado |

### Motivos por operador (S–AD) — uma linha por operador

Retidos:
| Coluna | Motivo |
|--------|--------|
| S | Financeiro |
| T | Mudança de endereço |
| U | Insatisfação com serviço |
| V | Insatisfação com atendimento |
| W | Mudança de provedora |
| X | Outros |

Cancelados:
| Coluna | Motivo |
|--------|--------|
| Y | Financeiro |
| Z | Mudança de endereço |
| AA | Insatisfação com serviço |
| AB | Insatisfação com atendimento |
| AC | Mudança de provedora |
| AD | Outros |

### Motivos consolidados da equipe (AF–AQ) — soma dos operadores

Retidos:
| Coluna | Motivo |
|--------|--------|
| AF | Financeiro |
| AG | Mudança de endereço |
| AH | Insatisfação com serviço |
| AI | Insatisfação com atendimento |
| AJ | Mudança de provedora |
| AK | Outros |

Cancelados:
| Coluna | Motivo |
|--------|--------|
| AL | Financeiro |
| AM | Mudança de endereço |
| AN | Insatisfação com serviço |
| AO | Insatisfação com atendimento |
| AP | Mudança de provedora |
| AQ | Outros |

### Tx de retenção por motivo (AS–AX)

| Coluna | Motivo |
|--------|--------|
| AS | Financeiro |
| AT | Mudança de endereço |
| AU | Insatisfação com serviço |
| AV | Insatisfação com atendimento |
| AW | Mudança de provedora |
| AX | Outros |

## Rota e sidebar

- Rota: aproveitar /gestor/d-1 (já é o destino da role GESTOR).
- Sidebar do gestor: mostra só o painel D-1 do gestor (sem operador/KPI/RV/etc).
- A role GESTOR já redireciona pra /gestor/d-1 no login — manter.

## Estrutura do painel

### Tabela da equipe (igual visual atual)
- A tabela de operadores (A–F) renderizada no MESMO visual da tabela de
  equipe atual (variant screen na tela, variant excel no PNG).
- Linha EQUIPE (totais): vem do consolidado H–L.
- Exportação: mesmo fluxo atual (copiar como imagem — texto "D-1 CONSOLIDADO"
  + report das HH:MM + PNG).

### Motivos
- Breakdown de motivos (retidos/cancelados) — consolidado da equipe (AF–AQ),
  com opção de ver por operador (S–AD). Visual similar ao bloco de motivos atual.

### Contratos
- Lista de contratos retidos/cancelados (N–Q) com nomes dos clientes, igual
  ao bloco de contratos atual.

## Permissões

O gestor (role GESTOR) ganha, nesta fase:
- Ver o painel /gestor/d-1 (view_gestor_panel — já existe)
- Subir base (BASE - 1) da sua equipe
- Tirar relatório (exportar a tabela como imagem)

Não tem: KPI, RV, Evolução, monitorias, config, registros, gestão de usuários.

## Regra dos 30 minutos no upload

Ao subir uma base, se a última base foi colada há MENOS de 30 minutos:
- NÃO bloqueia.
- Mostra um pop-up de confirmação: "A última base foi feita há X minutos.
  Tem certeza que deseja enviar outra agora?"
- Se confirmar → procede com o upload.
- Se cancelar → não faz nada.

A "última base" é determinada pela hora registrada em S2 (BASE - 1) — comparar
com a hora atual. Se ≥ 30 min, sobe direto sem pop-up.

## Hora do report (S2)

No upload, além de colar o CSV, gravar a hora atual na célula S2 da BASE - 1
(formato HH:MM). Essa hora:
- Serve de referência pra regra dos 30 minutos.
- É a hora exibida no "report das HH:MM" da exportação.

## Limpeza no upload

Seguir o padrão já ajustado: ao subir, limpar a BASE - 1 só nas colunas A–R
(preservando fórmulas em S+). Atenção: S2 (hora) fica fora da faixa A–R, então
não é apagada no clear — é escrita explicitamente no upload.

## Decisões técnicas

- Reusa a role GESTOR existente (não cria role nova).
- Guia de leitura própria por gestor (ANA ANGELICA), separada da BASE - 1
  (escrita) — mesma planilha.
- A leitura adapta o padrão do consolidado existente, mas apontando pra guia
  do gestor e com o mapeamento ampliado (motivos por operador, consolidados,
  tx por motivo).
- Vínculo dinâmico por KPI + override manual: evolução futura, não entra aqui.

## Evolução futura (fora do escopo)

- KPI do gestor (consolidado próprio com metas de equipe) + KPI dos operadores
  em tabela com detalhe.
- Evolução dos operadores (3 meses, visual clínico).
- RV de gestor (sistema e regras próprias).
- Vínculo dinâmico gestor→operador pelo KPI + override manual de bloqueio.
- Múltiplos gestores geridos via UI (criar/editar/vincular).

## Versão

1.0 — painel do gestor D-1 (equipe própria), usuária Ana Angelica.