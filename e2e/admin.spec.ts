import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { setUserBanned, setUserRole, cleanupInviteByEmail, clearRateLimits } from "./helpers/test-db";

const INVITE_EMAIL = "e2e-invite@test.com";

test.describe("Admin Dashboard", () => {
	test.beforeEach(() => {
		clearRateLimits();
	});
	test.afterAll(() => {
		cleanupInviteByEmail(INVITE_EMAIL);
		setUserBanned("testuser", false);
		setUserRole("testuser", "user");
	});

	test("regular user visiting /admin is redirected to /home", async ({ page }) => {
		await login(page, "testuser", "test1234");
		await page.goto("/admin");
		await page.waitForURL("/home", { timeout: 5000 });
		expect(page.url()).toContain("/home");
	});

	test("admin sees Admin Dashboard", async ({ page }) => {
		await login(page, "admin", "admin123");
		await page.goto("/admin");

		await expect(page.locator("h1")).toContainText("Admin Dashboard");
		await expect(page.locator("h2", { hasText: "Send Invite" })).toBeVisible();
		await expect(page.locator("h2", { hasText: "Users" })).toBeVisible();
		await expect(page.locator("h2", { hasText: "Invites" })).toBeVisible();
	});

	test("admin sends invite", async ({ page }) => {
		await login(page, "admin", "admin123");
		await page.goto("/admin");

		await expect(page.locator("h1")).toContainText("Admin Dashboard");

		// Fill invite form
		await page.fill('input[placeholder="Email address"]', INVITE_EMAIL);
		// Click the form submit button (not the confirmation one)
		await page.locator('form button[type="submit"]').click();

		// Confirm dialog appears
		await expect(page.locator("h3", { hasText: "Send invite?" })).toBeVisible();
		// Click the confirm button in the dialog
		await page.locator("div.fixed").locator('button', { hasText: "Send Invite" }).click();

		// Should see success message
		await expect(
			page.locator(`text=Invite sent to ${INVITE_EMAIL}`),
		).toBeVisible({ timeout: 5000 });
	});

	test("admin changes user role", async ({ page }) => {
		await login(page, "admin", "admin123");
		await page.goto("/admin");

		await expect(page.locator("h1")).toContainText("Admin Dashboard");

		// Wait for users table to load
		const usersTable = page.locator("table").first();
		await expect(usersTable.locator("tbody tr").first()).toBeVisible({ timeout: 10000 });

		// Find the testuser row and change their role
		const testUserRow = usersTable.locator("tr", { hasText: "testuser" });
		await expect(testUserRow).toBeVisible();

		const roleSelect = testUserRow.locator("select");
		await roleSelect.selectOption("moderator");

		// Confirm dialog
		await expect(page.locator("h3", { hasText: "Change role?" })).toBeVisible();
		await page.locator("div.fixed").locator('button', { hasText: "Change Role" }).click();

		// Verify the role was updated in the UI
		await expect(roleSelect).toHaveValue("moderator", { timeout: 5000 });

		// Reset for other tests
		await roleSelect.selectOption("user");
		await expect(page.locator("h3", { hasText: "Change role?" })).toBeVisible();
		await page.locator("div.fixed").locator('button', { hasText: "Change Role" }).click();
		await expect(roleSelect).toHaveValue("user", { timeout: 5000 });
	});

	test("admin bans and unbans user", async ({ page }) => {
		await login(page, "admin", "admin123");
		await page.goto("/admin");

		await expect(page.locator("h1")).toContainText("Admin Dashboard");

		// Wait for users table to load
		const usersTable = page.locator("table").first();
		await expect(usersTable.locator("tbody tr").first()).toBeVisible({ timeout: 10000 });

		// Find testuser row and click Ban
		const testUserRow = usersTable.locator("tr", { hasText: "testuser" });
		await expect(testUserRow).toBeVisible();
		await testUserRow.locator('button', { hasText: "Ban" }).click();

		// Ban modal should appear
		await expect(page.locator("h3", { hasText: /Ban Test User/ })).toBeVisible();
		await page.fill('input[placeholder="e.g. Spam, harassment"]', "Test ban reason");
		await page.locator('button', { hasText: "Confirm Ban" }).click();

		// Status should show "Banned"
		await expect(testUserRow.locator("text=Banned")).toBeVisible({ timeout: 5000 });

		// Now unban
		await testUserRow.locator('button', { hasText: "Unban" }).click();

		// Confirm dialog
		await expect(page.locator("h3", { hasText: "Unban user?" })).toBeVisible();
		await page.locator("div.fixed").locator('button', { hasText: "Unban" }).click();

		// Status should show "Active"
		await expect(testUserRow.locator("text=Active")).toBeVisible({ timeout: 5000 });
	});
});
