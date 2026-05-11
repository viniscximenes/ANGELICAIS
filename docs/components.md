# Componentes

Padrões de uso dos componentes do shadcn/ui dentro deste projeto.

## Diretrizes gerais
- [Quando criar um wrapper em vez de usar o componente direto]
- [Quando estender via `cn()` vs criar variante via `class-variance-authority`]
- [Onde colocar componentes compartilhados (`src/components/ui` vs `src/components/layout`)]

## Componentes instalados
[Liste aqui conforme forem adicionados — ainda nenhum componente shadcn foi instalado.]

| Componente | Caminho | Uso típico |
| ---------- | ------- | ---------- |
| —          | —       | —          |

## Padrões por componente

### Button
- Variantes usadas: [default, secondary, ghost, destructive, ...]
- Quando usar cada uma: [...]

### Input
- Tamanhos: [...]
- Padrão de label e helper text: [...]
- Estados de erro: [...]

### Card
- Estrutura recomendada (Header / Content / Footer): [...]

### Form
- Biblioteca de validação: [react-hook-form / zod / outra]
- Padrão de mensagens de erro: [...]

### Dialog / Sheet
- Quando preferir um sobre o outro: [...]

### Toast / Notification
- Tipos: [success / error / info / warning]
- Duração padrão: [...]

## Composição
[Padrões para combinar componentes — ex: `Card` + `Form` + `Button` em um modal.]

## Anti-padrões
- [O que NÃO fazer — ex: não duplicar wrappers de Button]
