import type { UserRole } from "@/lib/auth/get-current-user";

export type { UserRole } from "@/lib/auth/get-current-user";

export type UserProfile = {
  id: string;
  username: string;
  fullName: string;
  emailInterno: string;
  emailCorporativo: string;
  emailCorporativoAliasKpi: string | null;
  role: UserRole;
  /** GESTOR que também acumula acesso administrativo — ver sidebar-sections.ts. */
  isAdminSkill: boolean;
  isActive: boolean;
  themePreference: "dark" | "light";
  createdAt: string | null;
  updatedAt: string | null;
};

export const ALL_ROLES_FOR_CREATION: UserRole[] = ["ADM", "GESTOR"];
