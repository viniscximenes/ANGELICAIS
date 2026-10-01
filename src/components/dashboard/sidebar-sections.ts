import type { UserRole } from "@/lib/auth/get-current-user";
import { can } from "@/lib/auth/permissions";

import type { SidebarSection } from "./sidebar";

const ALL_SECTIONS: SidebarSection[] = [
  {
    id: "coordenador-reports",
    label: "Reports",
    iconName: "chart",
    basePath: "/c/reports",
    permission: "view_coordenador_panel",
    onlyRoles: ["COORDENADOR"],
    items: [{ label: "Consolidado", href: "/c/reports/consolidado" }],
  },
  {
    id: "gestor",
    label: "Reports",
    iconName: "chart",
    basePath: "/s/reports",
    permission: "view_gestor_panel",
    // Só o GESTOR vê — o ADM tem a permissão, mas não acessa esta tela.
    onlyRoles: ["GESTOR"],
    items: [
      { label: "Consolidado", href: "/s/reports/consolidado" },
      { label: "Tempo Logado & Indisp.", href: "/s/reports/tempo-indisponibilidade" },
      { label: "TMA & Peso", href: "/s/reports/tma-peso" },
    ],
  },
  {
    id: "operacional",
    label: "KPI",
    iconName: "headset",
    // Amplo o suficiente pra cobrir /kpi/operadores, /kpi/gestor,
    // /kpi/detalhado-polo e /kpi/evolucao (só o GESTOR vê esta seção —
    // nenhuma outra rota /kpi/* é alcançável por ele, então não há risco de
    // ativar a seção errada).
    basePath: "/kpi",
    permission: "view_gestor_panel",
    onlyRoles: ["GESTOR"],
    items: [
      { label: "Operadores", href: "/s/kpi/operadores" },
      { label: "Gestor", href: "/s/kpi/gestor" },
      { label: "Detalhado Polo", href: "/s/kpi/detalhado-polo" },
      { label: "Evolução", href: "/kpi/evolucao" },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    iconName: "users",
    basePath: "/operacao",
    permission: "view_gestor_panel",
    // Mesmo escopo do grupo anterior: só o GESTOR vê. Sem divisória visível
    // (removida a pedido) — espaçamento uniforme como os demais itens, sem
    // respiro extra de início de grupo (ver sidebar.tsx).
    onlyRoles: ["GESTOR"],
    items: [
      { label: "Diário", href: "/operacao/diario" },
      { label: "Comparativo Consolidado", href: "/operacao/comparativo-consolidado" },
      { label: "Quartil", href: "/operacao/quartil" },
    ],
  },
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
    basePath: "/configuracoes",
    permission: "manage_system",
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
  return ALL_SECTIONS.filter(
    (section) =>
      can(role, section.permission, isAdminSkill) &&
      (!section.onlyRoles || section.onlyRoles.includes(role)),
  );
}
