# Feedback — Indisponibilidade (gerador de Word)

## Visão geral

Terceira aba do toggle de Feedback (ao lado de Consolidado e Tempo Logado).
Mesmo formato visual e de sistema, adaptado para percentuais de indisponibilidade.
O supervisor preenche, por dia, a indisponibilidade total e o detalhamento
(NR17, Particular, Outras). O sistema acrescenta o "%" e calcula a média de cada
métrica na semana. Gera um .docx pelo template de indisponibilidade.

## Escopo

- Aba "Indisponibilidade" no toggle da página de Feedback.
- Digitação manual por dia: Indisp. Total, NR17, Particular, Outras (números
  puros; o sistema põe o "%").
- O sistema calcula a média de CADA uma das 4 métricas (média simples dos dias
  com dado).
- Gera .docx pelo template de indisponibilidade.
- Mesmo padrão de sistema do Consolidado/Tempo Logado: setas, F5, botão limpar,
  nome de arquivo com serial.

## Estrutura do documento (template)

Mesmo layout da família (logo Alloha, título, cabeçalho, objetivo, assinaturas):
- Título: "RELATÓRIO DA SEMANA – INDISPONIBILIDADE"
- Tabela com 4 colunas (+ período): Período | Indisp. Total | NR17 | Particular | Outras
- 6 dias (seg-sáb) + linha CONSOLIDADO DA SEMANA (as 4 médias)

## Campos do formulário (digitação manual)

Por dia (seg-sáb), 4 campos numéricos (percentuais):
- **Indisp. Total**: indisponibilidade total do dia
- **NR17**: % de NR17
- **Particular**: % de pausa particular
- **Outras**: % de outras pausas

Regra de entrada:
- O usuário digita o NÚMERO puro: "12,5" ou "5".
- O sistema acrescenta o "%" na exibição/documento: "12,5%", "5%".
- O valor é interpretado pelo seu valor cheio: "5" = 5% (NÃO 0,5%). Sem
  divisão/conversão.
- Aceita vírgula decimal PT-BR ("12,5").
- Dia sem dado → vazio → exibido como "—".

Cabeçalho (igual aos outros):
- Período (segunda → deriva os 6 dias)
- Data do feedback (dia da semana por extenso)
- Operador (texto)
- Supervisor (automático, gestor logado)

## Cálculos (médias da semana)

Cada uma das 4 colunas tem média (média simples):
- **Média de cada métrica** = soma dos valores dos dias COM dado ÷ quantidade
  de dias com dado.
- Usa todos os dias preenchidos (sem janela/filtro).
- Dias "—" não entram na média.
- Se nenhum dia tem dado numa coluna → média "—".
- Formatar a média com o "%" (ex: "11,8%").

## Tabela do documento

| Período | Indisp. Total | NR17 | Particular | Outras |
|---------|---------------|------|------------|--------|
| Segunda · DD/MM | 12,5% | 8,0% | 3,0% | 1,5% |
| ... | ... | ... | ... | ... |
| CONSOLIDADO DA SEMANA | média% | média% | média% | média% |

- Dias derivados da segunda do período.
- Dia sem dado → "—" nas 4 colunas.
- Todas as 4 colunas do consolidado mostram a média (diferente do Tempo Logado,
  que mesclava as células).

## Geração do Word

- Template em public/templates/feedback_indisponibilidade_template.docx.
- Placeholders: {periodo}, {operador}, {supervisor}, {data_feedback}, e por dia
  {dia_X}, {indisp_X}, {nr17_X}, {part_X}, {outras_X} (X=seg..sab), + as médias
  {indisp_total}, {nr17_total}, {part_total}, {outras_total}.
- docxtemplater, igual aos outros.

## Padrão de sistema (igual aos outros)

- **Navegação por setas**: ↓/↑ entre dias (mesma coluna), ←/→ entre as 4
  colunas do mesmo dia, respeitando posição do cursor.
- **Persistência F5**: datas (segunda + data feedback) no localStorage;
  resultados e operador limpam. Chaves próprias (ex: "indisp_segunda",
  "indisp_data_feedback").
- **Botão Limpar**: zera resultados + operador, mantém datas.
- **Nome do arquivo**: FeedbackIndisponibilidade_<PrimeiroNome>_<Serial>.docx
  (serial sequencial no localStorage, chave própria, contínuo).

## Onde fica

- Aba "Indisponibilidade" do toggle em /feedback/resultado-semanal.
- Substitui o placeholder vazio dessa aba.
- Role GESTOR.

## Decisões técnicas

- Digitação de número puro; o sistema acrescenta "%". "5" = 5% (sem conversão
  pra 0,5).
- As 4 colunas têm média simples (todos os dias com dado).
- Mesmo padrão de sistema dos outros feedbacks.

## Formato dos valores

- Entrada: número puro, vírgula decimal PT-BR ("12,5", "5").
- Exibição/documento: número + "%" ("12,5%", "5%").
- Médias: número + "%", com 1 casa decimal (ex: "11,8%"). Avaliar arredondamento.

## Versão

1.0 — Feedback de Indisponibilidade (médias das 4 métricas), aba do toggle de
Feedback.