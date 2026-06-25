# Feedback — Tempo Logado (gerador de Word)

## Visão geral

Segunda aba do toggle de Feedback (ao lado de Consolidado). Mesmo formato visual
e de sistema do Consolidado, adaptado para HORAS: o supervisor preenche, por dia
da semana, o tempo logado, o horário de login e o horário de deslog. O sistema
calcula as médias da semana (com regra de janela de horário pra login/deslog) e
gera um .docx idêntico ao template.

## Escopo

- Aba "Tempo Logado" no toggle da página de Feedback (Consolidado / Tempo
  Logado / Indisponibilidade).
- Digitação manual por dia: T. Logado, H. Login, H. Deslog.
- O sistema calcula as médias da semana (consolidado).
- Gera .docx pelo template de tempo logado.
- Mesmo padrão de sistema do Consolidado: navegação por setas, persistência de
  datas no F5, botão limpar, nome de arquivo com serial.

## Estrutura do documento (template)

Mesmo layout do Consolidado (logo Alloha, título, cabeçalho, objetivo,
assinaturas), com a tabela adaptada:
- Título: "RELATÓRIO DA SEMANA – TEMPO LOGADO"
- Tabela com 3 colunas (+ período): Período | T. Logado | H. Login | H. Deslog
- 6 dias (seg-sáb) + linha CONSOLIDADO DA SEMANA (as médias)

## Campos do formulário (digitação manual)

Por dia (seg-sáb), 3 campos:
- **T. Logado**: tempo logado no dia (formato HH:MM:SS, ex: 06:20:00)
- **H. Login**: horário de login (formato HH:MM, ex: 14:03)
- **H. Deslog**: horário de deslog (formato HH:MM, ex: 20:18)

Dia sem dados (faltou) → vazio, exibido como "—".

Cabeçalho (igual ao Consolidado):
- Período (segunda do período → deriva os 6 dias)
- Data do feedback (com dia da semana por extenso)
- Operador (texto)
- Supervisor (automático, do gestor logado)

## Cálculos (médias da semana)

### T. Logado (média) — usa TODOS os dias com dado
- Média do tempo logado de todos os dias preenchidos (inclusive dias atípicos).
- Motivo: o operador sempre deve cumprir as 06:20:00, independente do horário —
  então todo dia trabalhado conta.
- Cálculo: somar os tempos (em segundos) dos dias com dado, dividir pela
  quantidade de dias com dado, formatar de volta em HH:MM:SS.
- Dias "—" (sem dado) não entram.

### H. Login (média) — só dias na JANELA 11:30–17:00
- Considera apenas os dias em que o login ocorreu entre 11:30 e 17:00.
- Dias com login FORA dessa janela (ex: 07:40, horário atípico) são IGNORADOS
  na média de login.
- Motivo: a escala padrão é 14:00–20:20; logins atípicos (manhã) distorceriam
  a média.
- Cálculo: média dos horários de login dentro da janela (converter HH:MM pra
  minutos, média, voltar pra HH:MM).
- O dia atípico AINDA aparece na linha dele (mostra o login real), só não entra
  na média.

### H. Deslog (média) — só dias na JANELA 18:00–23:00
- Considera apenas os dias em que o deslog ocorreu entre 18:00 e 23:00.
- Deslogs fora dessa janela (ex: 14:00, saída atípica) são IGNORADOS na média.
- Cálculo: média dos horários de deslog dentro da janela.
- O dia atípico aparece na linha, mas não entra na média.

### Resumo das regras
| Métrica | Quais dias entram na média |
|---------|---------------------------|
| T. Logado | Todos os dias com dado |
| H. Login | Só logins entre 11:30 e 17:00 |
| H. Deslog | Só deslogs entre 18:00 e 23:00 |

- O dia atípico (fora da janela) aparece normalmente na tabela (é dia
  trabalhado), mas é excluído só da média de login/deslog.
- Se nenhum dia cair na janela de login (ou deslog), a média correspondente
  fica "—" (sem como calcular).

## Tabela do documento

| Período | T. Logado | H. Login | H. Deslog |
|---------|-----------|----------|-----------|
| Segunda · DD/MM | 06:20:00 | 14:03 | 20:18 |
| ... | ... | ... | ... |
| CONSOLIDADO DA SEMANA | média | média | média |

- Dias da semana derivados da segunda do período (igual Consolidado).
- Dia sem dado → "—" nas 3 colunas.

## Geração do Word

- Template em public/templates/feedback_tempologado_template.docx (a ser
  preparado, com placeholders).
- Placeholders: {periodo}, {operador}, {supervisor}, {data_feedback}, e por dia
  {dia_X}, {tlog_X}, {login_X}, {deslog_X} (X = seg..sab), + os _total das médias.
- docxtemplater, igual ao Consolidado.

## Padrão de sistema (igual ao Consolidado)

- **Navegação por setas**: ↓/↑ entre dias (mesma coluna), ←/→ alterna entre as
  colunas do mesmo dia (T. Logado / H. Login / H. Deslog) respeitando a posição
  do cursor.
- **Persistência no F5**: as datas (segunda do período + data do feedback)
  persistem (localStorage); os resultados e o operador limpam.
- **Botão Limpar**: zera resultados + operador, mantém datas.
- **Nome do arquivo**: FeedbackTempoLogado_<PrimeiroNome>_<Serial>.docx
  (serial sequencial no localStorage, 4 dígitos, contínuo). Mesma lógica do
  Consolidado, só trocando "Consolidado" por "TempoLogado" no nome.

## Onde fica

- Aba "Tempo Logado" do toggle em /feedback/resultado-semanal (a página que já
  tem o toggle Consolidado / Tempo Logado / Indisponibilidade).
- Substitui o placeholder vazio da aba Tempo Logado.
- Role GESTOR.

## Decisões técnicas

- Digitação manual dos 3 valores por dia; o sistema calcula as médias.
- Janelas de horário: login 11:30–17:00, deslog 18:00–23:00 (ignora atípicos na
  média, mantém na tabela).
- T. Logado médio usa todos os dias (operador deve cumprir 06:20:00 sempre).
- Mesmo padrão de sistema do Consolidado (setas, F5, limpar, serial).

## Formato dos valores

- T. Logado: HH:MM:SS (ex: 06:20:00).
- H. Login / H. Deslog: HH:MM (ex: 14:03).
- Médias no mesmo formato.
- Validar entrada (formato de hora); avaliar máscara nos inputs.

## Versão

1.0 — Feedback de Tempo Logado (médias com janela de horário), aba do toggle de
Feedback.