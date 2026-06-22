# Feedback — Resultado Semanal (gerador de Word)

## Visão geral

Gerador de documento Word do "Relatório da Semana" (feedback de resultado
aplicado semanalmente). O supervisor preenche os dados de retido/cancelado de
cada dia, o sistema calcula o resto e gera um arquivo .docx idêntico ao modelo,
pronto pra baixar.

## Escopo

- Formulário simples: período, data do feedback, operador, e retido/cancelado
  de cada dia (seg a sáb).
- O sistema calcula: tx de retenção do dia, pedido do dia, e o consolidado da
  semana.
- Gera um .docx idêntico ao template (mesmo cabeçalho, fontes, tabela,
  assinaturas).
- Nome do supervisor = automático, do usuário logado.

## Quem acessa

- Role GESTOR (o supervisor). O nome do supervisor no documento vem do
  full_name do gestor logado.
- Avaliar se outros roles precisam — por ora, GESTOR.

## Sidebar

Novo grupo:
📝 Feedback

Resultado Semanal

- Grupo "Feedback"
- Sub-item "Resultado Semanal" → /feedback/resultado-semanal
- Visível pra role GESTOR (mesmo padrão dos painéis do gestor).

## Estrutura do documento (template fixo)

Baseado no modelo enviado (Feedback Semanal). Layout idêntico:

- Cabeçalho: "Alloha Fibra | Acompanhamento de Desempenho · Retenção"
- Título: "RELATÓRIO DA SEMANA"
- Período avaliado: [editável]
- Operador: [editável]
- Supervisor: [automático, do usuário logado]
- Data do feedback: [editável]
- Seção "Objetivo do feedback" (texto fixo)
- Seção "Resultados da semana" (tabela)
- Seção "Validação e ciência" (assinaturas)

Tudo com a mesma formatação do .docx original (negritos, fontes, estrutura de
tabela).

## Campos editáveis (formulário)

1. **Período avaliado** — ex: "01/06 a 06/06". O usuário informa a data inicial
   (segunda) e o sistema deriva os 6 dias (seg a sáb), OU o usuário digita o
   texto do período. Decidir na implementação: recomendado informar a data da
   segunda-feira e derivar os 6 dias automaticamente (datas das linhas da
   tabela + texto do período).
2. **Data do feedback** — ex: "Sexta-feira, 12/06/2026". O usuário escolhe a
   data; o sistema formata com o dia da semana por extenso em PT-BR.
3. **Operador** — nome completo (texto). Aparece no topo e na assinatura.
4. **Retido e Cancelado de cada dia** (seg a sáb, 6 dias):
   - Dois campos por dia: Retido e Cancelado (números).
   - Se o operador não teve dados no dia, deixar vazio → exibido como "—" na
     tabela.

NÃO editável (automático):
- **Supervisor** — full_name do gestor logado (topo + assinatura).
- **Tx Retenção do dia, Pedido do dia, Consolidado** — calculados.

## Cálculos

### Por dia
- **Pedido** = Retido + Cancelado
- **Tx Retenção** = Retido ÷ Pedido (= Retido ÷ (Retido + Cancelado)), em %
- Dia sem dados (Retido e Cancelado vazios) → todas as células do dia = "—"
  (não calcula).

### Consolidado da semana (taxa real)
- **Retido** = soma dos retidos dos dias com dados
- **Cancelado** = soma dos cancelados
- **Pedido** = soma dos pedidos (= soma retidos + soma cancelados)
- **Tx Retenção** = soma dos retidos ÷ soma dos pedidos, em % (TAXA REAL — não
  é média das taxas diárias)
- Dias com "—" não entram na soma (não contribuem).

Formatação:
- Tx em % com 1 casa decimal e vírgula PT-BR (ex: "82,5%").
- Retido/Cancelado/Pedido como inteiros. Manter o padrão do modelo (ex: "07"
  com zero à esquerda? No modelo aparece "07", "05" — avaliar se zero-pad em
  números < 10; replicar o estilo do template).

## Datas da tabela

As linhas da tabela mostram o dia da semana + data (ex: "Segunda · 01/06").
- Derivar das 6 datas a partir da segunda-feira informada (segunda + 0 a 5
  dias).
- Formato "Dia · DD/MM" (Segunda, Terça, Quarta, Quinta, Sexta, Sábado).

## Assinaturas

- "Assinatura do Supervisor — [nome do gestor logado]"
- "Assinatura do Operador — [operador informado]"
- Sempre puxam do topo (supervisor automático, operador do formulário).

## Geração do Word

- Usar o .docx original como TEMPLATE com placeholders (docxtemplater ou
  equivalente), pra o resultado sair idêntico ao modelo (mesma formatação).
- Os placeholders no template: período, operador, supervisor, data do feedback,
  e os valores de cada célula da tabela (6 dias × 4 colunas + consolidado).
- O sistema preenche os placeholders e gera o arquivo pra download.
- Nome do arquivo: ex "Feedback_Semanal_<Operador>_<periodo>.docx".

Decisão técnica (geração):
- Avaliar geração client-side (browser monta e baixa) vs server-side (endpoint
  Next gera e devolve). Com template docx + docxtemplater, ambos funcionam.
  Server-side é mais robusto pra manipular o .docx template. Decidir na
  implementação.
- O template .docx fica no projeto (ex: public/templates/ ou src/templates/),
  com os placeholders no lugar dos dados variáveis.

## Estados

- Formulário em branco: campos vazios, tabela de preview zerada/—.
- Preview (opcional): mostrar a tabela calculada na tela antes de gerar, pro
  usuário conferir. Recomendado — vê o resultado antes de baixar.
- Gerar: botão "Gerar Word" → calcula, preenche o template, baixa o .docx.
- Validação: alertar se nenhum dia foi preenchido, ou se operador/período
  faltam.

## Decisões técnicas

- Supervisor sempre automático (full_name do gestor logado) — não digitável.
- Consolidado = taxa real (soma retidos / soma pedidos), não média das diárias.
- Template .docx real (não recriar o layout em código) → fidelidade total ao
  modelo.
- Datas dos 6 dias derivadas da segunda-feira do período.

## Evolução futura (fora do escopo)

- Pré-preencher os dados puxando do D-1/KPI (selecionar operador + semana → o
  sistema busca retido/cancelado de cada dia automaticamente, sem digitar).
- Histórico de feedbacks gerados.
- Comparação com a semana anterior (o modelo menciona isso no objetivo).

## Versão

1.0 — gerador de Feedback Semanal (.docx por template), grupo Feedback.