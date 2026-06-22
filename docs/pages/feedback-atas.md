# Feedback — Atas (gerador de comunicado interno)

## Visão geral

Gerador de Ata: comunicado interno de procedimento e ciência de novas práticas,
aplicado à equipe inteira (não por operador). O gestor seleciona um tema (com
descrição-modelo pronta e editável, ou personalizado), define quantos
operadores vão assinar, e gera um .docx pra imprimir: página 1 com o comunicado
e a assinatura do gestor, página 2 (verso) com as linhas numeradas pra
assinatura dos operadores.

## Escopo

- Seleção de tema: modelos prontos (descrição preenchida automaticamente) ou
  "Personalizado" (tema e descrição em branco, escritos pelo gestor).
- Descrição sempre editável (alterar não afeta o modelo salvo).
- Assinatura do gestor automática (nome do gestor logado) + data da aplicação.
- N linhas numeradas pra assinatura dos operadores (quantidade definida pelo
  gestor), sempre no verso (página 2), sem cabeçalho.
- Gera .docx pra baixar.

## Quem acessa

- Role GESTOR. Nome do supervisor = full_name do gestor logado.

## Sidebar

No grupo "Feedback" (já existe, com Resultado Semanal):
📝 Feedback

Resultado Semanal

Atas

- Sub-item "Atas" → /feedback/atas
- Role GESTOR.

## Estrutura do documento

### Página 1 (frente) — com cabeçalho
- Cabeçalho: "Alloha Fibra | Acompanhamento de Desempenho · Retenção"
  (mesmo das outras).
- Título/identificação: "ATA DE ALINHAMENTO" (ou similar) + indicação de que
  é um comunicado interno.
- Tema: em destaque, como um título (ex: "TEMA: TEMPO LOGADO").
- Descrição: o texto do comunicado (do modelo ou personalizado).
- Assinatura do supervisor: nome do gestor logado + data da aplicação da ata
  (próximo ao nome).

### Página 2 (verso) — sem cabeçalho
- Linhas numeradas pra assinatura dos operadores: 1. ___, 2. ___, ... até N.
- Linhas em branco (operador assina à mão na impressão).
- Sem cabeçalho (verso limpo).
- Quebra de página forçada entre a página 1 e as assinaturas → garante que as
  assinaturas vão sempre pro verso (imprimir frente-e-verso = 1 folha física).

## Campos do formulário

1. **Tema** — dropdown com os modelos prontos + opção "Personalizado".
   - Modelo pronto → preenche o tema e a descrição automaticamente.
   - Personalizado → tema (texto livre) e descrição em branco.
2. **Descrição** — textarea, vem preenchida do modelo, editável. Editar não
   afeta o modelo salvo (é só pra aquele documento).
3. **Data da aplicação** — data, exibida perto do nome do gestor.
   - Formato: a definir (ver Decisões — provável "DD/MM/AAAA" ou com dia da
     semana; confirmar). Por ora DD/MM/AAAA.
4. **Quantidade de operadores** — número. Gera N linhas numeradas no verso.
5. **Supervisor** — automático (full_name do gestor logado), não editável.

## Modelos prontos (temas)

Fixos no código (uma estrutura tema → descrição). O gestor pode editar o texto
no formulário sem alterar o modelo. Modelos iniciais:

### TEMPO LOGADO
> O presente documento tem por objetivo registrar e formalizar o alinhamento
> realizado junto à equipe acerca da obrigatoriedade do cumprimento integral da
> jornada diária de trabalho, estabelecida em 6 horas e 20 minutos (06:20:00)
> diárias. [...texto completo conforme fornecido...]

### ADERÊNCIA
> O presente documento tem por objetivo registrar e formalizar o alinhamento
> realizado junto à equipe acerca da obrigatoriedade do login pontual na
> plataforma Five9 [...texto completo...]

### PAUSAS NÃO AUTORIZADAS
> O presente documento tem por objetivo registrar e formalizar o alinhamento
> realizado junto à equipe acerca do uso correto das pausas disponíveis na
> plataforma [...texto completo...]

### ESTOURO DO NR17
> O presente documento tem por objetivo registrar e formalizar o alinhamento
> realizado junto à equipe acerca do cumprimento do indicador de NR17 [...texto
> completo...]

(Os textos completos dos 4 temas ficam guardados no código — em
src/lib/atas/modelos.ts ou similar. Cada modelo: { tema, descricao }.)

## Geração do Word

- Template .docx com placeholders (docxtemplater), igual ao Feedback Semanal.
- Placeholders: {tema}, {descricao}, {supervisor}, {data_aplicacao}, e as
  linhas de assinatura.
- As N linhas numeradas: geradas dinamicamente. Como o número varia, usar um
  loop do docxtemplater ({#assinaturas}{numero}. _______{/assinaturas}) ou
  gerar as linhas no código e injetar. Avaliar na implementação a melhor forma
  (loop docxtemplater é o ideal pra lista dinâmica).
- Quebra de página antes das assinaturas (garante verso).
- Cabeçalho só na página 1 (configuração de seção: "different first page" ou
  seção separada sem header pra página 2). Avaliar na preparação do template.

## Decisões técnicas

- Modelos fixos no código (não banco) — mais simples; o gestor edita por
  documento sem alterar o salvo. Tema "Personalizado" cobre casos fora dos
  modelos.
- Assinaturas sempre no verso (página 2 sem cabeçalho) — quebra de página
  forçada. Imprimir frente-e-verso = 1 folha.
- Supervisor automático (gestor logado).
- N linhas de assinatura dinâmicas (loop no template ou geração no código).

## Estados

- Formulário: selecionar tema → descrição preenche → editar se quiser →
  definir quantidade de operadores → data → gerar.
- Validação: tema e descrição não vazios, quantidade >= 1.
- Preview (opcional): mostrar o texto da ata na tela antes de gerar. Recomendado
  pelo menos mostrar a descrição que será usada.

## Evolução futura (fora do escopo)

- Modelos gerenciáveis por tela (CRUD no banco) — se quiser editar os modelos
  salvos sem mexer no código.
- Pré-preencher os nomes dos operadores da equipe nas linhas (em vez de linhas
  em branco).
- Histórico de atas geradas.

## Versão

1.0 — gerador de Atas (comunicado interno), 4 modelos + personalizado,
assinaturas no verso.