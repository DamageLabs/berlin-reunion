import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { user, account } from "../src/db/schema";

const ADMIN_EMAIL = "admin@berlin-reunion.com";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

async function seed() {
  const sqlite = new Database("./data/berlin-reunion.db");
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite);

  // Check if admin already exists
  const existing = db
    .select()
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .get();

  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    sqlite.close();
    return;
  }

  const now = new Date();
  const userId = crypto.randomUUID();
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);

  db.insert(user)
    .values({
      id: userId,
      name: "Admin",
      email: ADMIN_EMAIL,
      emailVerified: true,
      username: ADMIN_USERNAME,
      displayUsername: ADMIN_USERNAME,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(account)
    .values({
      id: crypto.randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log("Seeded admin user:", ADMIN_EMAIL);
  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
