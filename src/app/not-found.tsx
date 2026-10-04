import { redirect } from "next/navigation";

// Qualquer 404 (rota inexistente ou notFound() chamado numa página) vai pra
// /login em vez de mostrar a tela padrão do Next. Quem já está logado não
// fica no login: a própria /login redireciona pra landing do perfil
// (getPostLoginPath).
export default function NotFound() {
  redirect("/login");
}
