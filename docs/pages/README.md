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
| [`bases-kpi.md`](./bases-kpi.md) | Bases — KPI | `/bases/kpi` | documentada |
| [`kpi-atual-principal.md`](./kpi-atual-principal.md) | KPI Atual Principal | `/kpi/atual-principal` | documentada |
| [`kpi-atual-secundario.md`](./kpi-atual-secundario.md) | KPI Atual Secundário | `/kpi/atual-secundario` | documentada |
| [`kpi-passado-principal.md`](./kpi-passado-principal.md) | KPI Passado Principal | `/kpi/passado-principal` | documentada |
| [`kpi-passado-secundario.md`](./kpi-passado-secundario.md) | KPI Passado Secundário | `/kpi/passado-secundario` | documentada |
| [`rv.md`](./rv.md) | RV — Remuneração Variável | `/rv/atual`, `/rv/passado` | documentada |
| [`registros-monitoria.md`](./registros-monitoria.md) | Monitoria de Ligações | `/registros/monitoria` | documentada |
| [`registros-diario.md`](./registros-diario.md) | Diário de Bordo | `/registros/diario`, `/registros/diario/[operator_email]` | documentada |
| [`config-usuarios.md`](./config-usuarios.md) | Gerenciar Usuários | `/config/usuarios` | documentada |
| [`atendimento.md`](./atendimento.md) | Atendimento ao vivo | `/atendimento` | documentada |
| [`config-planos.md`](./config-planos.md) | Configurações — Planos e Descontos | `/config/planos` | documentada |
- [Evolução](docs/pages/evolucao.md) — painel de evolução mensal do operador (gráfico de linha por KPI + consolidado, guia KPI)
- [D-1 Relatório por Supervisor](docs/pages/d-1-relatorio-supervisor.md) — exportação do D-1 por supervisor (empresa toda) + usuário relatorio
- [Painel do Gestor — D-1](docs/pages/gestor-d-1.md) — painel do gestor (equipe própria): D-1 consolidado, motivos, contratos, upload e exportação
- [Painel do Gestor — Tempo Logado](docs/pages/gestor-tempo-logado.md) — aba de tempo logado do gestor (equipe própria): tabela, meta 06:20:00, hora em BASE - 2!S2
- [Painel do Gestor — Indisponibilidade](docs/pages/gestor-indisponibilidade.md) — aba de indisponibilidade do gestor: tabela com NR17, pausa particular e outras pausas, meta 14,5%
- [Operacional — KPI da Equipe (gestor)](docs/pages/operacional-kpi-gestor.md) — KPI dos operadores da equipe do gestor: lista de principais + detalhe de secundários, toggle de mês
- [Operacional — Quartil](docs/pages/operacional-quartil.md) — quartil por tópico (Q1-Q4 + rank + valor) dos operadores da equipe, toggle equipe/empresa
- [Feedback — Resultado Semanal](docs/pages/feedback-resultado-semanal.md) — gerador de Word do feedback semanal (preenche retido/cancelado, calcula o resto, baixa .docx)
- [Feedback — Atas](docs/pages/feedback-atas.md) — gerador de ata/comunicado interno (tema + descrição-modelo editável, N assinaturas no verso)
- [KPI do Gestor](docs/pages/kpi-gestor.md) — base própria de KPI dos supervisores, página "Meus Resultados", metas de gestor configuráveis
- [Configurações do Supervisor — Nome Fantasia](docs/pages/config-supervisor-operadores.md) — apelidos dos operadores nas tabelas do painel do gestor (global por supervisor)
- [Feedback — Tempo Logado](docs/pages/feedback-tempo-logado.md) — gerador de Word do feedback de tempo logado (médias de tempo/login/deslog com janela de horário)
- [Feedback — Indisponibilidade](docs/pages/feedback-indisponibilidade.md) — gerador de Word do feedback de indisponibilidade (médias de NR17, particular e outras pausas)
- [Configurações do Supervisor — Operadores do D-1](docs/pages/config-supervisor-operadores-d1.md) — adicionar/excluir operadores das guias do D-1 (edição direta no Sheets)
- [Dashboard de Retenção — Fundação](docs/pages/dashboard-retencao-fundacao.md) — importação da base de atendimentos para o banco (fundação do dashboard analítico)
- [Dashboard de Retenção](docs/pages/dashboard-retencao.md) — painel analítico da base de retenção (equipe/empresa, temas, evolução, alertas, contribuição pra queda)
- [Diário de Bordo (DB)](docs/pages/diario-de-bordo.md) — registro de pausas atípicas e tempo logado insuficiente, com geração de texto por tema

## Status possíveis

- **rascunho** — placeholder sem conteúdo real
- **documentada** — `.md` preenchido, ainda não implementada em código
- **implementada** — código existe, sincronizado com o `.md`
- **divergente** — código existe mas está fora de sincronia com o `.md` (precisa atualizar um dos dois)