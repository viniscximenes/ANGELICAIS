# Documentação do projeto

Esta pasta concentra toda a documentação interna: decisões de design, arquitetura, convenções e descrição de cada página da aplicação.

## Índice

| Arquivo / Pasta                      | Conteúdo                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| [`design-system.md`](./design-system.md) | Tokens visuais (cores, tipografia, espaçamento, radius) e princípios de design. |
| [`components.md`](./components.md)       | Padrões de uso dos componentes shadcn/ui no projeto.                           |
| [`architecture.md`](./architecture.md)   | Estrutura de pastas, camadas e decisões técnicas.                              |
| [`conventions.md`](./conventions.md)     | Convenções de código, nomenclatura, mensagens de commit e fluxo de PR.         |
| [`pages/`](./pages/README.md)            | Uma página = um arquivo. Cada arquivo descreve objetivo, rota, regras, estados, etc. |

## Como contribuir com a documentação

1. Atualize o documento relevante sempre que tomar uma decisão arquitetural ou visual.
2. Para novas páginas, copie [`pages/_template.md`](./pages/_template.md) e renomeie.
3. Mantenha placeholders entre colchetes `[...]` quando ainda não houver decisão final.
