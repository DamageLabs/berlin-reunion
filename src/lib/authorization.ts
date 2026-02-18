import { headers } from "next/headers";
import { auth, type Session } from "./auth";

const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

export async function getServerSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(minimumRole: string): Promise<Session> {
  const session = await requireAuth();
  const userLevel = ROLE_HIERARCHY[session.user.role ?? "user"] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw new Error("Forbidden");
  }
  return session;
}
