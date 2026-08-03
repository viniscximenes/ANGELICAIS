# Diário de Bordo (DB) — registro de pausas atípicas e tempo logado

## Visão geral

Página "DB" para supervisores gerarem textos padronizados de registro de pausas
fora do esperado e tempo logado insuficiente, para copiar e colar numa planilha
externa. O ADM sobe o CSV de login/logout/pausas do dia; o supervisor seleciona
o dia, o sistema detecta os agentes que merecem atenção (pelas regras), o
supervisor escolhe um tema e o sistema gera o bloco de texto pronto.

## Acesso

- Página "DB": só role GESTOR (supervisor).
- Upload do CSV do dia: só ADM (caio.vsilva) — novo menu.
- Config de temas: só ADM (global para todos os supervisores).
- Dados gerais (empresa toda; o supervisor vê todos os agentes).

## Fonte de dados: CSV de login/logout/pausas

Colunas do CSV:
- AGENT NAME (nome completo)
- AGENT (email — usar o nome.sobrenome antes do @)
- TIMESTAMP, DATE, HOUR
- LOGIN TIMESTAMP, LOGOUT TIMESTAMP
- LOGIN TIME (duração de um login)
- AGENT STATE TIME (duração daquele estado/pausa)
- REASON CODE (o tipo de pausa/estado)
- STATE (Login/Logout/Not Ready...)

Encoding: o CSV vem com encoding quebrado (Latin-1/Windows-1252 lido como UTF-8:
"AzerÃªdo", "PrÃ© Pausa", "GONÃ‡ALVES"). O parser DEVE tratar/corrigir o encoding
(ler como Latin-1 ou normalizar) para os nomes e reason codes saírem corretos
("Azerêdo", "Pré Pausa").

## Armazenamento

- O ADM sobe o CSV do dia → banco, guardado POR DIA (o supervisor seleciona o
  dia depois).
- Tabela nova (ex: db_pausas_diario) com as linhas relevantes do CSV + a data.
- Guardar por dia (histórico de dias — o plano do Supabase agora suporta).
- Chave por data: um upload substitui o CSV daquele mesmo dia (sobrescreve o
  dia); dias diferentes coexistem.

## Regras de detecção (o motor)

Por AGENTE, no dia selecionado:

### Pausas que reportam se > 1 minuto (cada ocorrência)
Reason codes: Monitoramento ou Tarefa, Treinamento ou Reunião, Feedback, Pré
Pausa, Ativo, Take Blip, Pausa 15, Pausa 40, Operacional, E-mail, Indisp.,
Sistema (System).
- Qualquer ocorrência dessas com AGENT STATE TIME > 00:01:00 → gera um registro
  de atenção.

### Pausa 20 — reporta se > 25 minutos
- Se a Pausa 20 (somada, se houver mais de uma) passar de 00:25:00 → registro.

### Pausa 10 — reporta se o total das duas > 25 minutos
- Somar todas as Pausa 10 do agente no dia. Se o total > 00:25:00 → registro.
- (Só uma Pausa 10 de 20 min, total < 25 → NÃO reporta.)

### Tempo logado insuficiente — < 06:20:00
- Somar o LOGIN TIME do agente no dia (todos os períodos de login).
- Se o total < 06:20:00 → registro de tempo logado insuficiente.

Notas:
- As pausas "normais" que NÃO entram: Pausa Particular, Pausa 1h, No Reason, Not
  Ready, Final Expediente, Logout, Forced (a menos que estejam na lista acima).
  Confirmar na implementação quais reason codes exatos entram (mapear os nomes
  reais do CSV, tratando o encoding).
- Cada pausa detectada é um registro separado (não agrupa).

## Os temas (configuráveis pelo ADM, dois conjuntos)

Dois tipos de tema, porque os textos têm estruturas diferentes:

### Temas de PAUSA
Cada tema = { nome (rótulo no dropdown), texto_motivo (o trecho que entra na
frase) }.
Texto gerado:
"O agente {nome.sobrenome} no dia {DD/MM/AAAA} teve que registrar por pedido da
supervisão a pausa {tipo} por {HH:MM:SS} devido {texto_motivo}."

### Temas de TEMPO LOGADO
Texto gerado:
"No dia {DD/MM/AAAA}, o agente {nome.sobrenome} {texto_motivo}, conseguindo
realizar apenas {HH:MM:SS} de tempo logado."
(A estrutura pode variar; o texto_motivo do tema completa a frase.)

### Config no painel do ADM
- Tela pra adicionar/editar/remover temas, separada por conjunto (Pausa /
  Tempo Logado).
- Global: todos os supervisores usam os mesmos temas.
- Tabela db_temas (id, tipo: "pausa"|"tempo_logado", nome, texto_motivo, ativo).

### Textos iniciais propostos (PAUSA) — para revisão/seed
1. Auxílio à operação: "ao auxílio prestado à operação de Retenção como um todo,
   em razão da ausência de uma supervisão no dia. O registro da pausa foi
   autorizado pela supervisão em um dia sem fluxo, não impactando a operação"
2. Erro de acesso aos sistemas: "a um erro em seus acessos aos sistemas de
   atendimento. O acesso foi normalizado apenas mais tarde, permitindo o retorno
   às atividades"
3. Reunião após 20h (SAC): "à participação em reunião realizada após as 20:00, no
   fim de turno. O agente estava com skill de SAC em andamento e foi autorizado o
   registro da pausa para participação na reunião, em função da queda de clientes
   no SAC"
4. Saúde / SAC Texto: "a motivos de saúde que impossibilitaram a realização de
   atendimentos por voz. O agente foi autorizado pela supervisão a atuar
   exclusivamente no SAC Texto e, devido à necessidade de adequação à NR17, foi
   registrado o período, resultando no tempo informado"
5. Normalização de acessos (novato) SAC Texto: "ao processo de normalização de
   acessos como agente novato. Durante o período, atuou exclusivamente no SAC
   Texto e, por esse motivo, foi autorizado o registro da pausa pela supervisão
   para adequação da NR17 do dia"
6. Alinhamento interno / feedback: "à participação em alinhamento interno
   relacionado às demandas operacionais e de atendimento. O registro foi
   autorizado pela supervisão em um momento de baixa demanda, sem impacto para a
   operação"
7. SAC Texto / NR17 (padrão): "ao atendimento em SAC Texto. O registro foi
   necessário para adequação e retirada da NR17 do dia, conforme procedimento
   operacional"
8. Demanda interna: "a uma demanda interna com alguns agentes da retenção. O
   registro foi autorizado pela supervisão em um dia sem fluxo, sem impacto para
   a operação"
9. Erro de sistema (SYDLE): "a erro de acesso no sistema SYDLE, que
   impossibilitava o início e a finalização das retenções. O agente permaneceu em
   pausa até a resolução do problema, com acesso normalizado no mesmo dia"
10. Atendimento crítico: "à necessidade de assumir um atendimento crítico
    envolvendo cliente e colaborador da mesma equipe. O registro da pausa foi
    autorizado para viabilizar a condução do caso e aumentar a chance de retenção"

(O ADM ajusta/adiciona depois. Textos neutros — "o agente".)

## Fluxo da página DB (supervisor)

1. Supervisor abre DB, seleciona o DIA (dropdown dos dias com CSV no banco).
2. O sistema processa o CSV do dia e lista, por agente, os registros de atenção:
   - Pausas estouradas (tipo, tempo).
   - Tempo logado insuficiente (tempo).
3. Cada registro:
   - Mostra: agente (nome.sobrenome), dia, tipo (pausa ou tempo logado), tempo.
   - Um seletor de TEMA (do conjunto certo: pausa ou tempo logado).
   - Ao escolher o tema → gera o bloco de texto.
   - Botão COPIAR (bloco individual).
4. Cada registro é um bloco separado (copia individual, não um bloco único).

## Camada de dados

- Upload/parse do CSV (ADM): parse robusto, trata encoding, salva por dia.
- getDiasDisponiveis(): os dias com CSV no banco.
- getRegistrosDoDia(data): roda as regras, retorna os registros de atenção
  (pausas + tempo logado) por agente.
- getTemas(tipo): os temas ativos do conjunto.
- Geração do texto: template + texto_motivo do tema + dados do registro.

## Peças / Fases

1. Banco: db_pausas_diario (o CSV por dia) + db_temas (os temas).
2. Upload do CSV do dia (ADM) → banco, com parse e encoding.
3. Config de temas do ADM (2 conjuntos, CRUD).
4. Motor de detecção (as regras de pausa + tempo logado).
5. Página DB do supervisor (seleciona dia, lista registros, escolhe tema, gera
   e copia texto).

## Decisões técnicas

- Texto neutro ("o agente") — sem concordância de gênero.
- Nome = nome.sobrenome (antes do @ do AGENT).
- CSV por dia no banco (histórico); encoding Latin-1 tratado.
- Temas configuráveis pelo ADM (global), dois conjuntos.
- Regras: lista > 1min; Pausa 20 > 25min; Pausa 10 (soma) > 25min; logado < 6:20.
- Cada registro é um bloco de texto copiável individual.

## Versão

1.0 — Diário de Bordo: detecção de pausas atípicas e tempo logado insuficiente,
geração de texto padronizado por tema configurável.