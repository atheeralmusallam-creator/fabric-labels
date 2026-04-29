import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "annotation_session";
const DEFAULT_SECRET = "change-this-secret-in-railway";

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;

  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

export function hasRole(user: { role: Role; roles?: Role[] | null }, allowedRoles: Role[]) {
  const userRoles = user.roles?.length ? user.roles : [user.role];
  return userRoles.some((role) => allowedRoles.includes(role));
}

export function createSessionCookie(user: {
  id: string;
  role: Role;
  roles?: Role[] | null;
  email: string;
}) {
  const userRoles = user.roles?.length ? user.roles : [user.role];

  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      roles: userRoles,
      email: user.email,
      iat: Date.now(),
    })
  );

  return `${payload}.${sign(payload)}`;
}

export function readSession() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub: string;
      role: Role;
      roles?: Role[];
      email: string;
    };

    return {
      ...session,
      roles: session.roles?.length ? session.roles : [session.role],
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = readSession();
  if (!session?.sub) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      roles: true,
      createdAt: true,
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();

  if (!hasRole(user, roles)) {
    redirect("/dashboard");
  }

  return user;
}

export async function canAccessProject(projectId: string) {
  const user = await requireUser();

  if (hasRole(user, ["ADMIN", "MANAGER"])) {
    return { user, allowed: true };
  }

  const assignment = await prisma.projectAssignment.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: user.id,
      },
    },
  });

  return { user, allowed: Boolean(assignment) };
}

export function setSession(user: {
  id: string;
  role: Role;
  roles?: Role[] | null;
  email: string;
}) {
  cookies().set(SESSION_COOKIE, createSessionCookie(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}
