import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seedVerificationCode, cleanupUser, cleanupInviteByEmail, clearRateLimits } from "./helpers/test-db";

const INVITE_TOKEN = readFileSync(
	resolve(__dirname, "..", "data", "test-invite-token.txt"),
	"utf-8",
).trim();

const NEW_USER_EMAIL = "newuser@test.com";

test.describe("Registration", () => {
	test.beforeEach(() => {
		clearRateLimits();
	});
	test.afterAll(() => {
		cleanupUser(NEW_USER_EMAIL);
		cleanupInviteByEmail(NEW_USER_EMAIL);
	});

	test("register page without invite shows invite required", async ({ page }) => {
		await page.goto("/register");
		await expect(page.getByRole("heading", { name: "Invite Required" })).toBeVisible();
	});

	test("register page with invalid invite shows error", async ({ page }) => {
		await page.goto("/register?invite=bad-token-does-not-exist");
		// Either the heading "Invalid Invite" or error text "Invite not found" should appear
		await expect(
			page.getByRole("heading", { name: "Invalid Invite" }),
		).toBeVisible({ timeout: 10000 });
	});

	test("full registration + email verification flow", async ({ page }) => {
		// Step 1: Visit registration page with valid invite
		await page.goto(`/register?invite=${INVITE_TOKEN}`);

		// Wait for the invite to be validated and email populated
		await expect(page.locator("#email")).toHaveValue(NEW_USER_EMAIL, { timeout: 10000 });

		// Step 2: Fill registration form
		await page.fill("#name", "New User");
		await page.fill("#username", "newuser");
		await page.fill("#password", "newuser123");
		await page.click('button[type="submit"]');

		// Step 3: Should redirect to verify-email page
		await page.waitForURL(/\/verify-email/, { timeout: 15000 });

		// Step 4: Seed a known verification code in DB
		const knownCode = "TESTABCD";
		seedVerificationCode(NEW_USER_EMAIL, knownCode);

		// Step 5: Enter the verification code (formatted with space)
		await page.fill("#code", "TEST ABCD");
		await page.click('button[type="submit"]');

		// Step 6: Should see success and redirect to login
		await expect(page.getByText("Email verified")).toBeVisible({ timeout: 5000 });
		await page.waitForURL(/\/login/, { timeout: 5000 });

		// Step 7: Login with new credentials
		await page.fill("#username", "newuser");
		await page.fill("#password", "newuser123");
		await page.click('button[type="submit"]');
		await page.waitForURL("/home", { timeout: 10000 });
		await expect(page.locator("h1")).toContainText("Hello, New User");
	});
});
