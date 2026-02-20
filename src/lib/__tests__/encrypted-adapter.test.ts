import { describe, expect, it, vi } from "vitest";
import { encrypt, hmacHash, isEncrypted } from "../crypto";
import { createEncryptedAdapter } from "../encrypted-adapter";

// Keys are set globally in vitest.setup.unit.ts

function createMockAdapter() {
	const store: Record<string, Record<string, unknown>[]> = {};

	const base = {
		id: "mock",
		create: vi.fn(
			async ({
				model,
				data,
			}: {
				model: string;
				data: Record<string, unknown>;
			}) => {
				if (!store[model]) store[model] = [];
				const row = { id: "1", ...data };
				store[model].push(row);
				return { ...row };
			},
		),
		findOne: vi.fn(
			async ({
				model,
				where,
			}: {
				model: string;
				where: { field: string; value: unknown }[];
			}) => {
				const rows = store[model] ?? [];
				return (
					rows.find((r) => where.every((w) => r[w.field] === w.value)) ?? null
				);
			},
		),
		findMany: vi.fn(
			async ({
				model,
				where,
			}: {
				model: string;
				where?: { field: string; value: unknown }[];
			}) => {
				const rows = store[model] ?? [];
				if (!where) return [...rows];
				return rows.filter((r) => where.every((w) => r[w.field] === w.value));
			},
		),
		update: vi.fn(
			async ({
				model,
				where,
				update,
			}: {
				model: string;
				where: { field: string; value: unknown }[];
				update: Record<string, unknown>;
			}) => {
				const rows = store[model] ?? [];
				const row = rows.find((r) =>
					where.every((w) => r[w.field] === w.value),
				);
				if (!row) return null;
				Object.assign(row, update);
				return { ...row };
			},
		),
		updateMany: vi.fn(async () => 0),
		delete: vi.fn(
			async ({
				model,
				where,
			}: {
				model: string;
				where: { field: string; value: unknown }[];
			}) => {
				const rows = store[model] ?? [];
				const idx = rows.findIndex((r) =>
					where.every((w) => r[w.field] === w.value),
				);
				if (idx >= 0) rows.splice(idx, 1);
			},
		),
		deleteMany: vi.fn(async () => 0),
		count: vi.fn(async () => 0),
		transaction: vi.fn(async <R>(cb: (trx: unknown) => Promise<R>) => cb(base)),
	};

	return { base, store };
}

function wrapMock() {
	const { base, store } = createMockAdapter();
	// Factory shape: (db, config) => (options) => adapter
	const factory = (_db: unknown, _config: unknown) => (_options: unknown) =>
		base;
	const wrapped = createEncryptedAdapter(factory)(undefined, undefined)(
		undefined,
	);
	return { wrapped, base, store };
}

describe("encrypted-adapter", () => {
	describe("create", () => {
		it("encrypts email and adds emailHash for user model", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.create({
				model: "user",
				data: { email: "test@example.com", name: "Test" },
			});

			const createCall = base.create.mock.calls[0][0];
			expect(createCall.data.email).not.toBe("test@example.com");
			expect(isEncrypted(createCall.data.email as string)).toBe(true);
			expect(createCall.data.emailHash).toBe(hmacHash("test@example.com"));
			expect(createCall.data.name).toBe("Test"); // non-sensitive passes through
		});

		it("encrypts token and ipAddress for session model", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.create({
				model: "session",
				data: { token: "abc123", ipAddress: "1.2.3.4", userId: "u1" },
			});

			const createCall = base.create.mock.calls[0][0];
			expect(isEncrypted(createCall.data.token as string)).toBe(true);
			expect(createCall.data.tokenHash).toBe(hmacHash("abc123"));
			expect(isEncrypted(createCall.data.ipAddress as string)).toBe(true);
			expect(createCall.data.userId).toBe("u1");
		});

		it("decrypts result before returning", async () => {
			const { wrapped } = wrapMock();
			const result = await wrapped.create({
				model: "user",
				data: { email: "test@example.com", name: "Test" },
			});

			expect(result.email).toBe("test@example.com");
		});

		it("passes through non-encrypted models unchanged", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.create({
				model: "rateLimit",
				data: { key: "test", count: 1 },
			});

			const createCall = base.create.mock.calls[0][0];
			expect(createCall.data.key).toBe("test");
		});

		it("handles null pendingEmail correctly", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.create({
				model: "user",
				data: { email: "test@example.com", pendingEmail: null },
			});

			const createCall = base.create.mock.calls[0][0];
			expect(createCall.data.pendingEmailHash).toBeNull();
		});
	});

	describe("findOne", () => {
		it("rewrites email WHERE to emailHash for user model", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.findOne({
				model: "user",
				where: [{ field: "email", value: "test@example.com" }],
			});

			const findCall = base.findOne.mock.calls[0][0];
			expect(findCall.where[0].field).toBe("emailHash");
			expect(findCall.where[0].value).toBe(hmacHash("test@example.com"));
		});

		it("rewrites token WHERE to tokenHash for session model", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.findOne({
				model: "session",
				where: [{ field: "token", value: "abc123" }],
			});

			const findCall = base.findOne.mock.calls[0][0];
			expect(findCall.where[0].field).toBe("tokenHash");
			expect(findCall.where[0].value).toBe(hmacHash("abc123"));
		});

		it("does not rewrite WHERE for fields without blind index", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.findOne({
				model: "session",
				where: [{ field: "ipAddress", value: "1.2.3.4" }],
			});

			const findCall = base.findOne.mock.calls[0][0];
			expect(findCall.where[0].field).toBe("ipAddress");
			expect(findCall.where[0].value).toBe("1.2.3.4");
		});

		it("does not rewrite WHERE for non-encrypted models", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.findOne({
				model: "rateLimit",
				where: [{ field: "key", value: "test" }],
			});

			const findCall = base.findOne.mock.calls[0][0];
			expect(findCall.where[0].field).toBe("key");
		});

		it("decrypts result fields", async () => {
			const { wrapped, store } = wrapMock();
			// Pre-populate store with encrypted data
			store.user = [
				{
					id: "1",
					email: encrypt("test@example.com"),
					emailHash: hmacHash("test@example.com"),
					name: "Test",
				},
			];

			const result = await wrapped.findOne({
				model: "user",
				where: [{ field: "id", value: "1" }],
			});

			expect(result?.email).toBe("test@example.com");
			expect(result?.name).toBe("Test");
		});

		it("returns null when not found", async () => {
			const { wrapped } = wrapMock();
			const result = await wrapped.findOne({
				model: "user",
				where: [{ field: "email", value: "missing@test.com" }],
			});
			expect(result).toBeNull();
		});
	});

	describe("update", () => {
		it("encrypts update payload and rewrites WHERE", async () => {
			const { wrapped, base, store } = wrapMock();
			store.user = [
				{
					id: "1",
					email: encrypt("old@test.com"),
					emailHash: hmacHash("old@test.com"),
				},
			];

			await wrapped.update({
				model: "user",
				where: [{ field: "email", value: "old@test.com" }],
				update: { email: "new@test.com" },
			});

			const updateCall = base.update.mock.calls[0][0];
			expect(isEncrypted(updateCall.update.email as string)).toBe(true);
			expect(updateCall.update.emailHash).toBe(hmacHash("new@test.com"));
			expect(updateCall.where[0].field).toBe("emailHash");
		});
	});

	describe("delete", () => {
		it("rewrites WHERE clause for blind-indexed field", async () => {
			const { wrapped, base } = wrapMock();
			await wrapped.delete({
				model: "user",
				where: [{ field: "email", value: "test@example.com" }],
			});

			const deleteCall = base.delete.mock.calls[0][0];
			expect(deleteCall.where[0].field).toBe("emailHash");
			expect(deleteCall.where[0].value).toBe(hmacHash("test@example.com"));
		});
	});

	describe("findMany", () => {
		it("decrypts all results", async () => {
			const { wrapped, store } = wrapMock();
			store.user = [
				{
					id: "1",
					email: encrypt("a@test.com"),
					emailHash: hmacHash("a@test.com"),
					name: "A",
				},
				{
					id: "2",
					email: encrypt("b@test.com"),
					emailHash: hmacHash("b@test.com"),
					name: "B",
				},
			];

			const results = await wrapped.findMany({ model: "user" });
			expect(results).toHaveLength(2);
			expect(results[0].email).toBe("a@test.com");
			expect(results[1].email).toBe("b@test.com");
		});
	});
});
