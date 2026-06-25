# Configurações do Supervisor — Gerenciar Operadores do D-1

## Visão geral

Sub-página em Configurações do supervisor onde ele adiciona e exclui operadores
das guias do D-1 dele (a principal e a "2"), editando diretamente o Google
Sheets. Adicionar escreve o email + o nome do supervisor nas colunas A e B da
próxima linha livre; as fórmulas em C+ (já existentes) preenchem o resto.
Excluir limpa A e B (as fórmulas em C+ retornam 0). Sempre nas duas guias.

## Escopo

- Adicionar operador: escreve email (col A) + nome do supervisor (col B) na
  próxima linha livre, nas DUAS guias.
- Excluir operador: limpa A e B da linha do operador, nas DUAS guias.
- Edição direta no Google Sheets (escrita).
- Por supervisor: cada gestor mexe só nas próprias guias.

## Quem acessa

- Role GESTOR. Cada gestor edita só as guias dele.

## Onde fica

- Sub-página em Configurações: /configuracoes/operadores-d1 (ou uma aba/sub-item
  dentro de Configurações, separada da de nome fantasia).
- Grupo "Configurações" da sidebar do gestor.
- onlyRoles: ["GESTOR"]

## As guias

- Principal: derivada via resolveGuiaGestor (ex: "ANA ANGELICA").
- Tempo logado/indisp: resolveGuiaTempoLogado (ex: "ANA ANGELICA2").
- Estrutura idêntica nas duas: A = email do operador, B = nome do supervisor,
  C+ = fórmulas. Dados começam na linha 2 (linha 1 = cabeçalho).

## Adicionar operador

1. O supervisor digita o email do operador.
2. Validação:
   - Deve terminar em @alloha.com (obrigatório — senão não roda).
   - Formato nome.sobrenome@alloha.com.
   - Não duplicado (não adicionar email que já está na guia).
3. Achar a próxima linha livre na coluna A (primeira vazia após os dados).
4. VERIFICAR O LIMITE DE FÓRMULAS: ler a célula C da linha-destino com
   valueRenderOption FORMULA. Se C NÃO tiver fórmula (passou do limite — linha
   44 na principal, 50 na guia2), REJEITAR com erro amigável ("Limite de
   operadores da planilha atingido — contate o administrador para estender as
   fórmulas").
5. Escrever [email, nomeSupervisor] em A:B da linha livre, nas DUAS guias.
   - nomeSupervisor = full_name do gestor logado (já em maiúsculas, bate com B).
6. As fórmulas em C+ preenchem o resto automaticamente.

## Excluir operador

1. O supervisor seleciona um operador da lista atual.
2. Localizar a linha pelo email na coluna A.
3. Limpar (clear) A e B dessa linha, nas DUAS guias.
   - C em diante fica INTACTO (a fórmula com A vazio retorna 0 → operador some
     dos totais sem quebrar nada).
4. NÃO deletar a linha (só limpar A e B) — preserva as fórmulas.

## Lista atual de operadores

- Ler a coluna A (emails) da guia principal pra mostrar quem já está.
- Cada item: o email (ou nome.sobrenome derivado) + botão de excluir.
- A lista vem da planilha (fonte da verdade).

## Sincronização das duas guias

- Toda operação (add/remove) afeta as DUAS guias na mesma ação, pra ficarem
  sincronizadas.
- Se uma falhar, reportar (idealmente tratar pra não deixar uma guia
  dessincronizada da outra — avaliar ordem e tratamento de erro).

## Limite de fórmulas (importante)

- As fórmulas em C+ existem só até certa linha (atualmente ~44 na principal, ~50
  na guia2). Há um número finito de slots.
- Ao adicionar, verificar dinamicamente se a linha-destino tem fórmula em C. Se
  não tiver, bloquear com mensagem clara (não escrever numa linha sem fórmula,
  senão o operador não entra nos cálculos).
- Não assumir o número fixo (44/50) — verificar em runtime, pois pode mudar.

## Escrita no Sheets

- O cliente atual tem escopo de escrita (spreadsheets) e a service account é
  editora — confirmado, funciona.
- Usar values.update (escrever A:B) e values.clear (limpar A:B).
- Avaliar batchUpdate pra tocar as duas guias de forma eficiente.

## Camada de dados

- listarOperadoresD1(guiaPrincipal): lê a coluna A → lista de emails.
- adicionarOperadorD1(guias, email, nomeSupervisor): valida, acha linha livre,
  verifica fórmula, escreve A:B nas duas guias.
- excluirOperadorD1(guias, email): acha a linha, limpa A:B nas duas guias.
- Gate GESTOR; usa as guias do gestor logado.

## Decisões técnicas

- Editar só A e B (C+ são fórmulas, intocadas).
- Excluir = limpar A:B (não deletar linha) → fórmula retorna 0.
- Nome do supervisor (B) = full_name do gestor logado (maiúsculas, bate com a
  planilha).
- Verificar o limite de fórmulas dinamicamente antes de adicionar.
- Sempre as duas guias juntas.

## Riscos e cuidados

- Escrita em planilha de produção: validar bem (email correto, linha certa,
  não duplicar).
- Limite de slots: bloquear adição além das fórmulas.
- Sincronia das duas guias: tratar falha parcial.

## Versão

1.0 — gerenciar operadores do D-1 (add/remove direto no Sheets), sub-página de
Configurações.