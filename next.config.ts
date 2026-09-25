import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      // /operacao/kpi-detalhado migrou pra /kpi/detalhado-polo. Mantém o
      // link/favorito antigo funcionando — o gate de acesso roda na rota
      // nova (page.tsx), não aqui.
      {
        source: "/operacao/kpi-detalhado",
        destination: "/kpi/detalhado-polo",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
