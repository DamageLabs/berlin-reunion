import { encrypt, hmacHash, safeDecrypt } from "./crypto";

type Where = {
	operator?: string;
	value: string | number | boolean | string[] | number[] | Date | null;
	field: string;
	connector?: string;
};

// Model → field → blind index column name (null = encrypt only, no blind index)
const ENCRYPTED_FIELDS: Record<
	string,
	Record<string, { blindIndex: string | null }>
> = {
	user: {
		email: { blindIndex: "emailHash" },
		pendingEmail: { blindIndex: "pendingEmailHash" },
	},
	session: {
		token: { blindIndex: "tokenHash" },
		ipAddress: { blindIndex: null },
	},
	verification: {
		value: { blindIndex: null },
	},
};

function encryptFields(
	model: string,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const config = ENCRYPTED_FIELDS[model];
	if (!config) return data;

	const result = { ...data };
	for (const [field, { blindIndex }] of Object.entries(config)) {
		if (
			field in result &&
			result[field] != null &&
			typeof result[field] === "string"
		) {
			const plaintext = result[field] as string;
			result[field] = encrypt(plaintext);
			if (blindIndex) result[blindIndex] = hmacHash(plaintext);
		} else if (field in result && result[field] === null && blindIndex) {
			result[blindIndex] = null;
		}
	}
	return result;
}

function decryptFields<T>(model: string, data: T): T {
	if (!data || typeof data !== "object") return data;
	const config = ENCRYPTED_FIELDS[model];
	if (!config) return data;

	const result = { ...data } as Record<string, unknown>;
	for (const field of Object.keys(config)) {
		if (
			field in result &&
			result[field] != null &&
			typeof result[field] === "string"
		) {
			result[field] = safeDecrypt(result[field] as string);
		}
	}
	return result as T;
}

function rewriteWhere(model: string, where: Where[]): Where[] {
	const config = ENCRYPTED_FIELDS[model];
	if (!config) return where;

	return where.map((w) => {
		const fieldConfig = config[w.field];
		if (
			fieldConfig?.blindIndex &&
			w.value != null &&
			typeof w.value === "string"
		) {
			return { ...w, field: fieldConfig.blindIndex, value: hmacHash(w.value) };
		}
		return w;
	});
}

// biome-ignore lint/suspicious/noExplicitAny: adapter methods have dynamic signatures
type AnyAdapter = Record<string, (...args: any[]) => any>;

function wrapAdapter(adapter: AnyAdapter): AnyAdapter {
	return {
		...adapter,

		create: async (data: {
			model: string;
			data: Record<string, unknown>;
			[k: string]: unknown;
		}) => {
			const encrypted = encryptFields(data.model, data.data);
			const result = await adapter.create({ ...data, data: encrypted });
			return decryptFields(data.model, result);
		},

		findOne: async (data: {
			model: string;
			where: Where[];
			[k: string]: unknown;
		}) => {
			const newWhere = rewriteWhere(data.model, data.where);
			const result = await adapter.findOne({ ...data, where: newWhere });
			return decryptFields(data.model, result);
		},

		findMany: async (data: {
			model: string;
			where?: Where[];
			[k: string]: unknown;
		}) => {
			const newWhere = data.where
				? rewriteWhere(data.model, data.where)
				: undefined;
			const results = await adapter.findMany({ ...data, where: newWhere });
			return (results as unknown[]).map((r) => decryptFields(data.model, r));
		},

		count: async (data: {
			model: string;
			where?: Where[];
			[k: string]: unknown;
		}) => {
			const newWhere = data.where
				? rewriteWhere(data.model, data.where)
				: undefined;
			return adapter.count({ ...data, where: newWhere });
		},

		update: async (data: {
			model: string;
			where: Where[];
			update: Record<string, unknown>;
		}) => {
			const encrypted = encryptFields(data.model, data.update);
			const newWhere = rewriteWhere(data.model, data.where);
			const result = await adapter.update({
				...data,
				update: encrypted,
				where: newWhere,
			});
			return decryptFields(data.model, result);
		},

		updateMany: async (data: {
			model: string;
			where: Where[];
			update: Record<string, unknown>;
		}) => {
			const encrypted = encryptFields(data.model, data.update);
			const newWhere = rewriteWhere(data.model, data.where);
			return adapter.updateMany({
				...data,
				update: encrypted,
				where: newWhere,
			});
		},

		delete: async (data: { model: string; where: Where[] }) => {
			const newWhere = rewriteWhere(data.model, data.where);
			return adapter.delete({ ...data, where: newWhere });
		},

		deleteMany: async (data: { model: string; where: Where[] }) => {
			const newWhere = rewriteWhere(data.model, data.where);
			return adapter.deleteMany({ ...data, where: newWhere });
		},

		transaction: async <R>(
			callback: (trx: AnyAdapter) => Promise<R>,
		): Promise<R> => {
			return adapter.transaction((trx: AnyAdapter) =>
				callback(wrapAdapter(trx)),
			);
		},
	};
}

/**
 * Wraps a better-auth adapter factory to add transparent field encryption.
 *
 * Usage:
 *   database: createEncryptedAdapter(drizzleAdapter)(db, { provider: "sqlite", schema }),
 */
// biome-ignore lint/suspicious/noExplicitAny: generic factory wrapper needs any for type inference
export function createEncryptedAdapter<
	F extends (...args: any[]) => (...args: any[]) => any,
>(
	baseFactory: F,
): (
	...args: Parameters<F>
) => (...args: Parameters<ReturnType<F>>) => ReturnType<ReturnType<F>> {
	return (...factoryArgs: Parameters<F>) =>
		(...adapterArgs: Parameters<ReturnType<F>>) => {
			const baseAdapter = baseFactory(...factoryArgs)(...adapterArgs);
			return wrapAdapter(baseAdapter) as ReturnType<ReturnType<F>>;
		};
}

/**
 * Additional fields to register in better-auth config so the adapter factory
 * recognizes blind index columns in WHERE clauses and create/update data.
 */
export const BLIND_INDEX_ADDITIONAL_FIELDS = {
	user: {
		emailHash: {
			type: "string",
			required: false,
			input: false,
			returned: false,
		},
		pendingEmail: {
			type: "string",
			required: false,
			input: false,
		},
		pendingEmailHash: {
			type: "string",
			required: false,
			input: false,
			returned: false,
		},
	},
	session: {
		tokenHash: {
			type: "string",
			required: false,
			input: false,
			returned: false,
		},
	},
} as const;
