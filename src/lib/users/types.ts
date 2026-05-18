export type UserRole = "ADM" | "AUX" | "OP" | "GESTOR";

export type UserProfile = {
  id: string;
  username: string;
  fullName: string;
  emailInterno: string;
  emailCorporativo: string;
  emailCorporativoAliasKpi: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export const EDITABLE_ROLES: UserRole[] = ["OP", "AUX"];

export const ALL_ROLES_FOR_CREATION: UserRole[] = ["OP", "AUX", "ADM"];
