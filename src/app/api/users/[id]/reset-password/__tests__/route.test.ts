import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("next/headers", () => ({
	headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
	auth: {
		api: {
			getSession: (...args: unknown[]) => mockGetSession(...args),
		},
	},
}));

const mockHashPassword = vi.fn().mockResolvedValue("hashed:password");
vi.mock("better-auth/crypto", () => ({
	hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}));

const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/db", () => ({
	db: {
		update: (...args: unknown[]) => mockUpdate(...args),
		delete: (...args: unknown[]) => mockDelete(...args),
		select: (...args: unknown[]) => mockSelect(...args),
	},
}));

vi.mock("@/db/schema", () => ({
	user: { id: "user.id", role: "user.role", email: "user.email" },
	account: { userId: "account.userId" },
	session: { userId: "session.userId" },
}));

vi.mock("drizzle-orm", () => ({
	eq: (col: unknown, val: unknown) => ({ col, val }),
}));

const mockLogAuditEvent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/audit", () => ({
	logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock("@/lib/crypto", () => ({
	safeDecrypt: (val: string) => `decrypted:${val}`,
}));

const mockSendAdminPasswordResetEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
	sendAdminPasswordResetEmail: (...args: unknown[]) =>
		mockSendAdminPasswordResetEmail(...args),
}));

vi.mock("@/lib/password-rules", () => ({
	PRINTABLE_RE: /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~ ]+$/,
}));

import { POST } from "../route";

// --- Helpers ---

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string) {
	return new NextRequest(
		`http://localhost:3000/api/users/${id}/reset-password`,
		{ method: "POST" },
	);
}

function sessionWith(id: string, role: string) {
	return { user: { id, name: "Test", role } };
}

function setupMockDb(targetRole = "user", targetEmail = "encrypted:email") {
	const accountWhere = vi.fn().mockResolvedValue(undefined);
	const accountSet = vi.fn().mockReturnValue({ where: accountWhere });

	const userWhere = vi.fn().mockResolvedValue(undefined);
	const userSet = vi.fn().mockReturnValue({ where: userWhere });

	let updateCallCount = 0;
	mockUpdate.mockImplementation(() => {
		updateCallCount++;
		// First call = account update, second = user update
		if (updateCallCount === 1) return { set: accountSet };
		return { set: userSet };
	});

	const sessionWhere = vi.fn().mockResolvedValue(undefined);
	mockDelete.mockReturnValue({ where: sessionWhere });

	const fromFn = vi.fn().mockReturnValue({
		where: vi
			.fn()
			.mockResolvedValue([{ role: targetRole, email: targetEmail }]),
	});
	mockSelect.mockReturnValue({ from: fromFn });

	return { accountSet, userSet, accountWhere };
}

// --- Tests ---

describe("POST /api/users/[id]/reset-password", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when unauthenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		const res = await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(res.status).toBe(401);
	});

	it("returns 403 for regular user", async () => {
		mockGetSession.mockResolvedValue(sessionWith("user-1", "user"));
		const res = await POST(makeRequest("user-2"), makeParams("user-2"));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe("Forbidden");
	});

	it("returns 403 on self-reset", async () => {
		mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
		const res = await POST(makeRequest("mod-1"), makeParams("mod-1"));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toContain("your own");
	});

	it("returns 404 when target user not found", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		const fromFn = vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue([]),
		});
		mockSelect.mockReturnValue({ from: fromFn });
		const res = await POST(
			makeRequest("nonexistent"),
			makeParams("nonexistent"),
		);
		expect(res.status).toBe(404);
	});

	it("returns 403 when moderator tries to reset moderator password", async () => {
		mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
		setupMockDb("moderator");
		const res = await POST(makeRequest("mod-2"), makeParams("mod-2"));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toContain("equal or higher");
	});

	it("returns 403 when moderator tries to reset admin password", async () => {
		mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
		setupMockDb("admin");
		const res = await POST(
			makeRequest("admin-1"),
			makeParams("admin-1"),
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toContain("equal or higher");
	});

	it("returns 200 when admin resets user password", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		setupMockDb("user");
		const res = await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it("returns 200 when moderator resets user password", async () => {
		mockGetSession.mockResolvedValue(sessionWith("mod-1", "moderator"));
		setupMockDb("user");
		const res = await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it("hashes the temp password via better-auth hashPassword", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		setupMockDb("user");
		await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(mockHashPassword).toHaveBeenCalledTimes(1);
		expect(typeof mockHashPassword.mock.calls[0][0]).toBe("string");
		expect(mockHashPassword.mock.calls[0][0].length).toBe(16);
	});

	it("sets forcePasswordChange flag on target user", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		const { userSet } = setupMockDb("user");
		await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(userSet).toHaveBeenCalledWith(
			expect.objectContaining({ forcePasswordChange: true }),
		);
	});

	it("terminates all sessions for the target user", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		setupMockDb("user");
		await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(mockDelete).toHaveBeenCalled();
	});

	it("sends email with temp password", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		setupMockDb("user", "enc:test@example.com");
		await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(mockSendAdminPasswordResetEmail).toHaveBeenCalledWith({
			email: "decrypted:enc:test@example.com",
			tempPassword: expect.any(String),
		});
	});

	it("creates audit log entry", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		setupMockDb("user");
		await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(mockLogAuditEvent).toHaveBeenCalledWith({
			action: "password.reset",
			actorId: "admin-1",
			targetId: "user-1",
		});
	});

	it("returns 500 on DB error", async () => {
		mockGetSession.mockResolvedValue(sessionWith("admin-1", "admin"));
		const fromFn = vi.fn().mockReturnValue({
			where: vi
				.fn()
				.mockResolvedValue([{ role: "user", email: "enc:email" }]),
		});
		mockSelect.mockReturnValue({ from: fromFn });
		mockHashPassword.mockRejectedValue(new Error("Hash failure"));
		const res = await POST(makeRequest("user-1"), makeParams("user-1"));
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe("Hash failure");
	});
});
