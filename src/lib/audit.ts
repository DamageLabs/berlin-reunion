import { db } from "@/db";
import { auditLog } from "@/db/schema";

export type AuditAction =
  | "role.change"
  | "user.ban"
  | "user.unban"
  | "invite.create"
  | "invite.revoke";

export async function logAuditEvent(params: {
  action: AuditAction;
  actorId: string;
  targetId?: string;
  targetEmail?: string;
  detail?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: params.action,
    actorId: params.actorId,
    targetId: params.targetId ?? null,
    targetEmail: params.targetEmail ?? null,
    detail: params.detail ? JSON.stringify(params.detail) : null,
    createdAt: new Date(),
  });
}
