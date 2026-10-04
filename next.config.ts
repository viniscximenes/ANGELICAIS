import type { NextConfig } from "next";

// Headers de segurança aplicados a todas as rotas.
//
// A CSP aqui é propositalmente só "estrutural" (sem script-src/style-src):
// o layout injeta scripts inline antes da hidratação (paleta e favicon) e o
// Next também gera scripts inline — restringir script-src exigiria nonce por
// request. O que entra já fecha clickjacking (frame-ancestors), injeção de
// <base> e plugins (<object>/<embed>), e envio de formulários pra fora.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  // Equivalente ao frame-ancestors pra navegadores antigos.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nenhuma tela usa câmera/microfone/localização. clipboard-write fica
  // liberado (padrão) — os botões de "copiar como imagem" dependem dele.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Só HTTPS por 2 anos. Ignorado pelo navegador em http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Não anuncia "X-Powered-By: Next.js" nas respostas.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      // /operacao/kpi-detalhado migrou pra /s/kpi/detalhado-polo. Mantém o
      // link/favorito antigo funcionando — o gate de acesso roda na rota
      // nova (page.tsx), não aqui.
      {
        source: "/operacao/kpi-detalhado",
        destination: "/s/kpi/detalhado-polo",
        permanent: false,
      },
      // /operacao/analise-operadores migrou pra /s/kpi/evolucao. Mantém o
      // link/favorito antigo funcionando — o gate de acesso roda na rota
      // nova (page.tsx), não aqui.
      {
        source: "/operacao/analise-operadores",
        destination: "/s/kpi/evolucao",
        permanent: false,
      },
      // /bases/kpi migrou pra /s/bases/kpi. Mantém o link/favorito antigo
      // funcionando — o gate de acesso roda na rota nova (page.tsx).
      {
        source: "/bases/kpi",
        destination: "/s/bases/kpi",
        permanent: false,
      },
      // /bases/pausas migrou pra /s/bases/pausas (mesmo motivo acima).
      {
        source: "/bases/pausas",
        destination: "/s/bases/pausas",
        permanent: false,
      },
      // /configuracoes/{usuarios,equipe} migraram pra /s/configuracoes.
      {
        source: "/configuracoes/usuarios",
        destination: "/s/configuracoes/usuarios",
        permanent: false,
      },
      {
        source: "/configuracoes/equipe",
        destination: "/s/configuracoes/equipe",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
