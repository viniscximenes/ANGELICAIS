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

| Arquivo                          | Página           | Rota     | Status      |
| -------------------------------- | ---------------- | -------- | ----------- |
| [`login.md`](./login.md)         | Login            | `/login` | documentada |
| [`d-1-consolidado.md`](./d-1-consolidado.md) | D-1 Consolidado | `/d-1/consolidado` | documentada |
| [`d-1-tempo-logado.md`](./d-1-tempo-logado.md) | D-1 Tempo Logado | `/d-1/tempo-logado` | documentada |
| [`d-1-indisponibilidade.md`](./d-1-indisponibilidade.md) | D-1 Indisponibilidade | `/d-1/indisponibilidade` | documentada |
| [`config-kpi.md`](./config-kpi.md) | Configurações — KPI | `/config/kpi` | documentada |
| [`bases-kpi.md`](./bases-kpi.md) | Bases — KPI | `/bases/kpi` | documentada |
| [`kpi-atual-principal.md`](./kpi-atual-principal.md) | KPI Atual Principal | `/kpi/atual-principal` | documentada |
| [`kpi-atual-secundario.md`](./kpi-atual-secundario.md) | KPI Atual Secundário | `/kpi/atual-secundario` | documentada |
| [`kpi-passado-principal.md`](./kpi-passado-principal.md) | KPI Passado Principal | `/kpi/passado-principal` | documentada |
| [`kpi-passado-secundario.md`](./kpi-passado-secundario.md) | KPI Passado Secundário | `/kpi/passado-secundario` | documentada |
| [`rv.md`](./rv.md) | RV — Remuneração Variável | `/config/rv`, `/rv/atual`, `/rv/passado` | documentada |
| [`registros-monitoria.md`](./registros-monitoria.md) | Monitoria de Ligações | `/registros/monitoria` | documentada |
| [`registros-diario.md`](./registros-diario.md) | Diário de Bordo | `/registros/diario`, `/registros/diario/[operator_email]` | documentada |
| [`config-usuarios.md`](./config-usuarios.md) | Gerenciar Usuários | `/config/usuarios` | documentada |
| [`atendimento.md`](./atendimento.md) | Atendimento ao vivo | `/atendimento` | documentada |
| [`config-planos.md`](./config-planos.md) | Configurações — Planos e Descontos | `/config/planos` | documentada |

## Status possíveis

- **rascunho** — placeholder sem conteúdo real
- **documentada** — `.md` preenchido, ainda não implementada em código
- **implementada** — código existe, sincronizado com o `.md`
- **divergente** — código existe mas está fora de sincronia com o `.md` (precisa atualizar um dos dois)