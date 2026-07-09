export const USER_ROLES = ["c_level", "po", "pm", "marketer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEPARTMENTS = ["product", "development", "marketing"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  c_level: "C-level",
  po: "PO продукта",
  pm: "PM разработки",
  marketer: "Маркетолог",
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  product: "Продукт",
  development: "Разработка",
  marketing: "Маркетинг",
};

export const ROLE_DEPARTMENT: Record<Exclude<UserRole, "c_level">, Department> = {
  po: "product",
  pm: "development",
  marketer: "marketing",
};

export function roleToDepartment(role: UserRole): Department | null {
  if (role === "c_level") return null;
  return ROLE_DEPARTMENT[role];
}

export function isCLevel(role: UserRole): boolean {
  return role === "c_level";
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "c_level";
}

export function canViewFullPortfolio(role: UserRole): boolean {
  return role === "c_level";
}

export function canViewDepartmentStatus(
  viewerRole: UserRole,
  department: Department,
): boolean {
  if (viewerRole === "c_level") return true;
  return roleToDepartment(viewerRole) === department;
}

export function canEditDepartmentStatus(
  userRole: UserRole,
  department: Department,
): boolean {
  if (userRole === "c_level") return true;
  return roleToDepartment(userRole) === department;
}
