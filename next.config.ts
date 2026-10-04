import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
