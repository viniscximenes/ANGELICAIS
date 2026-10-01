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
    ];
  },
};

export default nextConfig;
