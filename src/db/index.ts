import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/berlin-reunion.db";
const path = url.replace(/^file:/, "");

const sqlite = new Database(path);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
