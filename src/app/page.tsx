import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getPostLoginPath } from "@/lib/auth/post-login-path";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Redireciona o usuário para a página padrão de entrada do perfil
  // (ex.: OP/ADM em /kpi/atual-principal).
  redirect(getPostLoginPath(user.profile.role));
}
