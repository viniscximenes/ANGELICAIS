import { IconLogout, IconUser } from "@tabler/icons-react";

import { logoutAction } from "@/lib/auth/logout-action";
import { createClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Extrai username do email interno
  const username = user.email?.split("@")[0] || "";

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: "color-mix(in oklch, var(--background) 80%, transparent)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-12">
        {/* Logo / nome do sistema */}
        <div className="flex items-baseline gap-3">
          <span className="ds-mono font-semibold tracking-wider">
            ANGELICAIS
          </span>
          <span className="ds-mono-sm text-muted-foreground hidden sm:inline">
            / gestão operacional
          </span>
        </div>

        {/* Usuário + logout */}
        <div className="flex items-center gap-3">
          <div className="ds-mono-sm text-muted-foreground flex items-center gap-2">
            <IconUser size={14} aria-hidden="true" />
            <span>{username}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="ds-small flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors hover:bg-[var(--elevation-2-bg)]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <IconLogout size={14} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
