import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/permissions";
import { isCLevel } from "@/lib/permissions";

const SESSION_COOKIE = "cpo_session";
const SESSION_TTL = 60 * 60 * 24 * 14;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "cpo-portfolio-dev-secret-change-me",
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const role = payload.role;

    if (
      typeof id !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      typeof role !== "string"
    ) {
      return null;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCLevel(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isCLevel(user.role)) redirect("/status");
  return user;
}

export async function getAssignedProjectIds(userId: string): Promise<string[]> {
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return assignments.map((item) => item.projectId);
}
