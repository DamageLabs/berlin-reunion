import { beforeEach, describe, expect, it, vi } from "vitest";
import { isEncrypted } from "../crypto";

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/db", () => ({
	db: {
		insert: (...args: unknown[]) => mockInsert(...args),
	},
}));

vi.mock("@/db/schema", () => ({
	auditLog: "auditLog",
}));

import { logAuditEvent } from "../audit";

describe("logAuditEvent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInsert.mockReturnValue({ values: mockInsertValues });
	});

	it("inserts a row with correct fields", async () => {
		await logAuditEvent({
			action: "role.change",
			actorId: "actor-1",
			targetId: "target-1",
			detail: { oldRole: "user", newRole: "admin" },
		});

		expect(mockInsert).toHaveBeenCalledWith("auditLog");
		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "role.change",
				actorId: "actor-1",
				targetId: "target-1",
				targetEmail: null,
				detail: JSON.stringify({ oldRole: "user", newRole: "admin" }),
			}),
		);
	});

	it("stores targetEmail encrypted when provided", async () => {
		await logAuditEvent({
			action: "invite.create",
			actorId: "actor-1",
			targetEmail: "test@example.com",
			detail: { role: "user", token: "abc" },
		});

		const call = mockInsertValues.mock.calls[0][0];
		expect(call.targetId).toBeNull();
		expect(call.targetEmail).not.toBe("test@example.com");
		expect(isEncrypted(call.targetEmail)).toBe(true);
	});

	it("stores null detail when not provided", async () => {
		await logAuditEvent({
			action: "user.unban",
			actorId: "actor-1",
			targetId: "target-1",
		});

		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({
				detail: null,
			}),
		);
	});

	it("generates an id and createdAt", async () => {
		await logAuditEvent({
			action: "user.ban",
			actorId: "actor-1",
		});

		const call = mockInsertValues.mock.calls[0][0];
		expect(call.id).toBeDefined();
		expect(typeof call.id).toBe("string");
		expect(call.createdAt).toBeInstanceOf(Date);
	});
});
