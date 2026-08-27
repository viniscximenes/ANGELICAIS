import type { UserRole } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";

import type { SidebarSection } from "./sidebar";

const ALL_SECTIONS: SidebarSection[] = [
  {
    id: "gestor",
    label: "Reports",
    iconName: "chart",
    basePath: "/reports",
    permission: "view_gestor_panel",
    // Só o GESTOR vê — o ADM tem a permissão, mas não acessa esta tela.
    onlyRoles: ["GESTOR"],
    // Divisória "MEUS RESULTADOS" acima do grupo Reports — só aparece pro GESTOR
    // porque esta seção já é onlyRoles: ["GESTOR"].
    divider: "MEUS RESULTADOS",
    items: [
      { label: "Consolidado", href: "/reports/consolidado" },
      { label: "Tempo Logado & Indisp.", href: "/reports/tempo-indisponibilidade" },
    ],
  },
  {
    id: "operacional",
    label: "KPI",
    iconName: "headset",
    // Amplo o suficiente pra cobrir /kpi/operadores e /kpi/gestor (só o
    // GESTOR vê esta seção — nenhuma outra rota /kpi/* é alcançável por ele,
    // então não há risco de ativar a seção errada).
    basePath: "/kpi",
    permission: "view_gestor_panel",
    onlyRoles: ["GESTOR"],
    items: [
      { label: "Operadores", href: "/kpi/operadores" },
      { label: "Gestor", href: "/kpi/gestor" },
    ],
  },
  // TEMP: oculto — seção removida da sidebar. As rotas continuam acessíveis via URL direta.
  // {
  //   id: "meus-resultados",
  //   label: "Meus Resultados",
  //   iconName: "target",
  //   basePath: "/meus-resultados",
  //   permission: "view_gestor_panel",
  //   onlyRoles: ["GESTOR"],
  //   items: [{ label: "KPI", href: "/meus-resultados/kpi" }],
  // },
  // TEMP: oculto — seção Feedback removida da sidebar. A rota /feedback/* continua acessível via URL direta.
  // {
  //   id: "feedback",
  //   label: "Feedback",
  //   iconName: "message",
  //   basePath: "/feedback",
  //   permission: "view_gestor_panel",
  //   onlyRoles: ["GESTOR"],
  //   items: [
  //     { label: "Resultado Semanal", href: "/feedback/resultado-semanal" },
  //   ],
  // },
  {
    id: "configuracoes-gestor",
    label: "Configurações",
    iconName: "settings",
    basePath: "/configuracoes",
    permission: "view_gestor_panel",
    onlyRoles: ["GESTOR"],
    items: [
      { label: "Equipe", href: "/configuracoes/equipe" },
    ],
  },
  {
    id: "d-1",
    label: "Reports",
    iconName: "chart",
    basePath: "/d-1",
    permission: "view_d1_personal",
    items: [
      { label: "Consolidado", href: "/d-1/consolidado" },
      { label: "Tempo Logado", href: "/d-1/tempo-logado" },
      { label: "Indisponibilidade", href: "/d-1/indisponibilidade" },
    ],
  },
  {
    id: "kpi",
    label: "KPI",
    iconName: "target",
    basePath: "/kpi",
    permission: "view_kpi",
    items: [
      { label: "Mês Atual", href: "/kpi/atual-principal" },
      { label: "Mês Passado", href: "/kpi/passado-principal" },
    ],
  },
  {
    id: "rv",
    label: "RV",
    iconName: "cash",
    basePath: "/rv",
    permission: "view_kpi",
    items: [
      { label: "Estimativa Atual", href: "/rv/atual" },
      { label: "Estimativa Passada", href: "/rv/passado" },
    ],
  },
  {
    id: "evolucao",
    label: "EVOLUÇÃO",
    iconName: "trending",
    basePath: "/evolucao",
    permission: "view_kpi",
    items: [{ label: "KPI", href: "/evolucao/kpi" }],
  },
  // TEMP: oculto — seção "Registros" removida da sidebar (todos os roles).
  // As rotas /registros/* continuam acessíveis via URL direta; só não
  // aparecem no menu. Para reexibir, descomentar este bloco.
  // {
  //   id: "registros",
  //   label: "Registros",
  //   iconName: "clipboard",
  //   basePath: "/registros",
  //   permission: "view_monitoria",
  //   items: [
  //     { label: "Monitoria", href: "/registros/monitoria" },
  //     { label: "Diário de Bordo", href: "/registros/diario" },
  //   ],
  // },
  {
    id: "bases",
    label: "Bases",
    iconName: "database",
    basePath: "/bases",
    permission: "manage_base",
    divider: "PAINEL ADM",
    items: [
      { label: "KPI", href: "/bases/kpi" },
      { label: "Pausas", href: "/bases/pausas" },
    ],
  },
  {
    id: "config",
    label: "Configurações",
    iconName: "settings",
    basePath: "/config",
    permission: "manage_system",
    // "Diário de Bordo" e "Base de Conhecimento" saíram do menu de propósito
    // (rotas continuam acessíveis via URL direta) — ver /config/db e
    // /config/base-conhecimento. KPI e RV foram removidos por completo: a
    // RV agora é gerenciada direto via código/banco.
    items: [{ label: "Usuários", href: "/configuracoes/usuarios" }],
  },
];

/**
 * @param isAdminSkill Flag aditiva (profiles.is_admin_skill): um GESTOR com
 * essa flag acumula também o que o ADM exclusivo vê, sem perder nada do que
 * já via como GESTOR — nunca substitui o role, só soma. Irrelevante pra
 * qualquer role que não seja GESTOR.
 */
export function getSidebarSectionsForRole(
  role: UserRole,
  isAdminSkill = false,
): SidebarSection[] {
  // GESTOR com is_admin_skill "acumula" o role ADM pra fins de onlyRoles —
  // além da própria permissão (já coberta por can() com isAdminSkill), ele
  // passa a bater também nas seções marcadas onlyRoles: ["ADM"].
  const alsoMatchesAdmin = role === "GESTOR" && isAdminSkill;

  return ALL_SECTIONS.filter(
    (section) =>
      can(role, section.permission, isAdminSkill) &&
      (!section.onlyRoles ||
        section.onlyRoles.includes(role) ||
        (alsoMatchesAdmin && section.onlyRoles.includes("ADM"))),
  );
}
