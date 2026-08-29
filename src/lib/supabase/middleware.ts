import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Único destino permitido pra role ADM — mantido em sincronia com
// getPostLoginPath() (src/lib/auth/post-login-path.ts), que já manda ADM pra
// cá no pós-login. Path completo (não só prefixo) porque é o alvo do
// redirect, não um filtro de entrada.
const ADMIN_DEFAULT_PATH = "/configuracoes/usuarios";

// Único critério de "é rota administrativa": tudo que já é gated por
// manage_base ou manage_system nas próprias páginas (ver sidebar-sections.ts
// e permissions.ts). ADM só pode navegar dentro destes dois prefixos —
// qualquer outra rota (incluindo novas rotas futuras que alguém esqueça de
// checar na própria página) é bloqueada por padrão aqui.
const ADMIN_ALLOWED_PREFIXES = ["/bases", "/configuracoes"];

// Rotas que nunca precisam da checagem de role — ou porque são públicas
// (login), ou porque já são os próprios prefixos administrativos acima.
const SKIP_ROLE_CHECK_PREFIXES = ["/login", ...ADMIN_ALLOWED_PREFIXES];

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RBAC: ADM só navega dentro de /bases e /configuracoes — reforça a regra
  // em permissions.ts a nível de rota, pra ninguém acessar uma tela
  // operacional digitando a URL direto (ou via link antigo/favorito), mesmo
  // que a própria página não faça essa checagem. Pulado pro login e pros
  // próprios prefixos administrativos, pra não gastar uma query de profile
  // em toda navegação de todo mundo.
  const pathname = request.nextUrl.pathname;
  const skipRoleCheck = SKIP_ROLE_CHECK_PREFIXES.some((prefix) =>
    pathMatchesPrefix(pathname, prefix),
  );

  if (user && !skipRoleCheck) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "ADM") {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_DEFAULT_PATH;
      url.search = "";

      const redirectResponse = NextResponse.redirect(url);
      // Copia os cookies de sessão já atualizados por setAll() acima — senão
      // o refresh de token deste request se perde no redirect.
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
