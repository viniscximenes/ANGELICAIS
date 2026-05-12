# Documentação do sistema

Esta pasta contém documentação técnica sobre subsistemas que NÃO são páginas específicas — autenticação, permissões, integrações externas, jobs em background, etc.

## Como criar nova documentação

1. Copie [`_template.md`](./_template.md) renomeando para o slug do subsistema (ex: `google-sheets.md`, `email-notifications.md`).
2. Preencha cada seção. Se algo ainda não está decidido, escreva `[a definir]` em vez de remover a seção.
3. Atualize o índice abaixo.

## Índice

| Arquivo | Subsistema | Status |
| ------- | ---------- | ------ |
| [`authentication.md`](./authentication.md) | Autenticação e sessão | documentado |
| [`permissions.md`](./permissions.md) | Roles e permissões | documentado |

## Status possíveis

- **rascunho** — placeholder sem conteúdo real
- **documentado** — `.md` preenchido, ainda não implementado em código
- **implementado** — código existe, sincronizado com o `.md`
- **divergente** — código existe mas está fora de sincronia com o `.md`
