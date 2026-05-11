# Login

## Objetivo
Autenticar membros da equipe ANGELICAIS no sistema. Primeira tela 
que o usuário vê — precisa transmitir solidez e identidade do produto 
desde o primeiro segundo.

## Rota
`/login`

## Quem acessa
Qualquer pessoa que tente acessar o sistema sem sessão ativa é 
redirecionada para esta rota. Após login bem-sucedido, vai para 
`/dashboard`, que internamente decide o conteúdo baseado no `role` 
do usuário (operador, gestor, admin).

## Regras de negócio

- **Identificador de usuário:** formato `nome.sobrenome` (não é 
  email). Internamente, o sistema converte para 
  `nome.sobrenome@interno.angelicais.app` antes de chamar o 
  Supabase Auth — isso é transparente para o usuário.
- **Senha:** definida pelo admin no momento da criação do usuário.
- **Sem auto-cadastro.** Apenas o admin cria usuários.
- **Sem fluxo de "esqueci a senha".** Em caso de esquecimento, 
  usuário deve contatar o administrador, que reseta manualmente 
  pelo painel admin.
- **Validação client-side:**
  - Username: obrigatório, formato `texto.texto` (regex 
    `^[a-z]+\.[a-z]+$`, lowercase)
  - Senha: obrigatória, mínimo 6 caracteres
- **Tentativas erradas:** após 5 tentativas falhas consecutivas, 
  bloqueio temporário de 60 segundos no client (rate limit visual). 
  Backend não é afetado nesta v1.
- **Sessão:** Supabase gerencia. Cookie httpOnly, refresh automático 
  via middleware já existente.
- **Redirect pós-login:** sempre para `/dashboard`. A lógica de 
  role-based routing acontece dentro do dashboard, não aqui.

## Estrutura visual

Layout **split em duas colunas** em desktop (50/50), empilhado em 
mobile (visual primeiro, formulário depois).

### Coluna esquerda — "Hero visual"
Ocupa 50% da viewport em desktop. Centraliza um único elemento 
visual marcante: **um orbe grande com conic gradient arco-íris 
animado** (efeito 7.3 do design system), rotação lenta e contínua, 
com glow violeta difuso ao redor. Abaixo do orbe, o nome do sistema 
em monospace grande:

- Título principal: `ANGELICAIS`
- Subtítulo: `Sistema de gestão operacional`

Background da coluna: um pouco mais escuro que o restante da página, 
com gradiente radial sutil saindo de trás do orbe (violeta muito 
diluído). Grain texture aplicado normalmente.

### Coluna direita — Formulário
Ocupa 50% em desktop. Centralizado vertical e horizontalmente. 
Largura máxima do card de formulário: ~420px.

Conteúdo, de cima para baixo:

1. **Saudação** (ds-h1): "Bem-vindo de volta"
2. **Subtítulo** (ds-body, muted-foreground): "Acesse seu painel ANGELICAIS"
3. **Espaço (space-8)**
4. **Campo Username**
   - Label "Usuário" (ds-small, muted-foreground)
   - Input com placeholder `nome.sobrenome`
   - Ícone de pessoa (Tabler `IconUser`) à esquerda do input
   - Auto-foco ao carregar a página
5. **Campo Senha**
   - Label "Senha" (ds-small, muted-foreground)
   - Input type="password" com toggle de visibilidade (olho à direita)
   - Ícone de cadeado (Tabler `IconLock`) à esquerda
6. **Espaço (space-6)**
7. **Botão "Entrar"**
   - Largura 100% da coluna do formulário
   - Variant primária (violeta), com border-gradient animado no hover
   - Texto em sans (não monospace) — é uma ação, não um dado
8. **Espaço (space-4)**
9. **Microcopy de ajuda** (ds-small, muted-foreground, centralizado): 
   "Esqueceu sua senha? Fale com o administrador."

### Sem header, sem footer
Tela puramente focada na ação de login. Nada distrai.

## Componentes usados

- `Card` (shadcn) — wrapper do formulário
- `Input` (shadcn) — campos
- `Button` (shadcn) — submit
- `Label` (shadcn) — labels dos campos
- Ícones Tabler: `IconUser`, `IconLock`, `IconEye`, `IconEyeOff`, 
  `IconLoader2` (loading), `IconAlertCircle` (erro)
- `PageTransition` (motion) — wrapper geral da página
- `StaggerContainer` + `StaggerItem` (motion) — entrada dos elementos 
  do formulário
- Componente customizado novo: **`AnimatedOrb`** em 
  `src/components/login/animated-orb.tsx` — implementa o conic 
  gradient rotativo (CSS puro + animação, sem JS pesado)

## Estados

### Loading
- Botão "Entrar": texto desaparece, ícone `IconLoader2` aparece 
  rotacionando no centro. Botão fica disabled. Largura preservada.
- Inputs ficam disabled (não readonly) com leve dimming.

### Erro de autenticação
- **Credenciais inválidas:** alerta inline acima do botão "Entrar", 
  usando classe `status-danger` (texto + bg + border vermelho discreto), 
  com ícone `IconAlertCircle` e mensagem: "Usuário ou senha incorretos."
- **Erro de conexão:** mesma posição, mensagem: "Não foi possível 
  conectar. Tente novamente."
- Após qualquer erro, foco volta para o campo username.

### Erro de validação
- Username em formato inválido: texto vermelho pequeno (ds-text-danger 
  + ds-small) abaixo do campo, com mensagem: "Use o formato nome.sobrenome"
- Senha vazia: idem, "Informe sua senha"
- Validação dispara onBlur do campo, não a cada tecla.

### Bloqueio por tentativas
- Após 5 falhas: botão fica disabled com texto "Aguarde 60s..." e 
  contador regressivo no próprio botão. Toast no canto inferior: 
  "Muitas tentativas. Aguarde antes de tentar novamente."

### Sucesso
- Sem mensagem de sucesso visível. Transição direta para `/dashboard` 
  com fade-out da tela atual (usar Framer Motion exit animation).

## Animações de entrada

Coreografia ao carregar a página (orquestrada via Framer Motion):

1. **0ms** — `PageTransition` inicia fade-in geral da página.
2. **200ms** — Orbe aparece com scale 0.8 → 1 + fade-in (duração 800ms, 
   easing ease-out-expo).
3. **400ms** — Nome "ANGELICAIS" + subtítulo fazem fade-in + 
   translateY 16px → 0 (duração 600ms).
4. **600ms** — Bloco do formulário (saudação + campos + botão) entra 
   via StaggerContainer, com 80ms de delay entre cada elemento filho.
5. **Contínuo** — Orbe mantém rotação infinita do conic gradient 
   (animação CSS, ~12s por volta).

## Acessibilidade

- Foco automático no campo username ao carregar.
- Tab navega: username → toggle senha (se visível) → senha → toggle 
  visibilidade → botão entrar.
- Enter em qualquer campo submete o formulário.
- Mensagens de erro têm `role="alert"` para leitores de tela.
- Ícones decorativos têm `aria-hidden="true"`.

## Responsividade

- **≥ 1024px (desktop):** split 50/50 horizontal.
- **640px – 1023px (tablet):** split 50/50 ainda, mas com paddings 
  reduzidos.
- **< 640px (mobile):** empilhado. Hero visual fica em cima (altura 
  fixa ~40vh, orbe menor), formulário embaixo ocupando o resto.

## Observações

- O `AnimatedOrb` é um efeito **de assinatura** desta tela. Não 
  reutilizar em outras páginas. Conforme regra do design system: 
  "Reservado para UM único elemento icônico do site."
- Esta tela é renderizada sem o layout principal da aplicação 
  (sem sidebar, sem header). Usar route group `(auth)` do Next 
  com seu próprio layout.
- Após implementar, validar contraste de texto sobre o orbe 
  brilhante na coluna esquerda — pode precisar de overlay sutil 
  para garantir legibilidade do nome ANGELICAIS.

## Versão
1.0 — criada antes da implementação