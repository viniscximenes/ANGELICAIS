import { redirect } from "next/navigation";

// Unificada com Tempo Logado em /gestor/tempo-logado (mesma guia "<GUIA>2",
// duas tabelas lado a lado). A autenticação/role/dados dessa rota são
// resolvidos na página de destino — não duplicamos o gate aqui.
export default function GestorIndisponibilidadePage() {
  redirect("/gestor/tempo-logado");
}
