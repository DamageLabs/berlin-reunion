import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { clearRateLimits } from "./helpers/test-db";

test.describe("Change Password", () => {
	test.beforeEach(() => {
		clearRateLimits();
	});
	test("change password with valid current password succeeds", async ({ page }) => {
		await login(page, "testuser", "test1234");
		await page.goto("/change-password");

		await page.fill("#currentPassword", "test1234");
		await page.fill("#newPassword", "newpass1234");
		await page.click('button[type="submit"]');

		await expect(page.locator("text=Password changed successfully")).toBeVisible({
			timeout: 5000,
		});

		// Change it back for subsequent tests
		await page.fill("#currentPassword", "newpass1234");
		await page.fill("#newPassword", "test1234");
		await page.click('button[type="submit"]');

		await expect(page.locator("text=Password changed successfully")).toBeVisible({
			timeout: 5000,
		});
	});

	test("change password with wrong current password shows error", async ({ page }) => {
		await login(page, "testuser", "test1234");
		await page.goto("/change-password");

		await page.fill("#currentPassword", "wrongpassword");
		await page.fill("#newPassword", "newpass1234");
		await page.click('button[type="submit"]');

		await expect(
			page.locator('[class*="crimson"]'),
		).toBeVisible({ timeout: 5000 });
	});
});
