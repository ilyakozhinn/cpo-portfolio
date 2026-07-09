import { ROLE_LABELS, type UserRole } from "@/lib/permissions";

export const DEMO_PASSWORD = "atom2026";

export const DEMO_ACCOUNTS: {
  role: UserRole;
  email: string;
  projects: string;
}[] = [
  {
    role: "c_level",
    email: "cpo@atom.local",
    projects: "Весь портфель + админка",
  },
  {
    role: "po",
    email: "po@atom.local",
    projects: "JGGL App, JGGL Website",
  },
  {
    role: "pm",
    email: "pm@atom.local",
    projects: "JGGL App, JGGL Buddy + devices",
  },
  {
    role: "marketer",
    email: "marketer@atom.local",
    projects: "JGGL Website, JGGL App",
  },
];

export function getDemoAccountLabel(role: UserRole) {
  return ROLE_LABELS[role];
}
