# Documentação por página

Cada página da aplicação tem um arquivo nesta pasta descrevendo objetivo, rota, regras de negócio, estrutura visual, componentes e estados.

## Como criar uma nova página

1. Copie [`_template.md`](./_template.md) renomeando para o slug da página (ex: `login.md`, `dashboard.md`).
2. Preencha cada seção do template — não deixe seção sem conteúdo. Se algo ainda não está decidido, escreva `[a definir]` em vez de remover a seção.
3. Atualize o índice abaixo.
4. Linke a partir de outras páginas relacionadas se houver navegação direta.

## Template padrão

Toda página deve seguir [`_template.md`](./_template.md), que contém as seguintes seções obrigatórias:

- **Objetivo** — por que a página existe e o que o usuário sai sabendo/fazendo.
- **Rota** — o path no App Router.
- **Quem acessa** — perfis e permissões.
- **Regras de negócio** — lista de regras que regem o comportamento.
- **Estrutura visual** — descrição alto-nível, seção por seção (sem pixels).
- **Componentes usados** — quais componentes shadcn/ui aparecem.
- **Estados** — loading / erro / vazio / sucesso.
- **Observações** — particularidades que não cabem nas seções acima.

### Seções opcionais

Quando a página justificar, adicionar:

- **Animações de entrada** — coreografia de entrada via Framer Motion, com timings.
- **Acessibilidade** — ordem de foco, atalhos, roles ARIA específicos.
- **Responsividade** — comportamento em desktop / tablet / mobile.
- **Versão** — controle de versão do documento da página.

## Índice de páginas

| Arquivo                          | Página | Rota      | Status     |
| -------------------------------- | ------ | --------- | ---------- |
| [`login.md`](./login.md)         | Login  | `/login`  | documentada |
| [`pagina-02.md`](./pagina-02.md) | [a definir] | — | rascunho |
| [`pagina-03.md`](./pagina-03.md) | [a definir] | — | rascunho |
| [`pagina-04.md`](./pagina-04.md) | [a definir] | — | rascunho |
| [`pagina-05.md`](./pagina-05.md) | [a definir] | — | rascunho |

## Status possíveis

- **rascunho** — placeholder sem conteúdo real
- **documentada** — `.md` preenchido, ainda não implementada em código
- **implementada** — código existe, sincronizado com o `.md`
- **divergente** — código existe mas está fora de sincronia com o `.md` (precisa atualizar um dos dois)