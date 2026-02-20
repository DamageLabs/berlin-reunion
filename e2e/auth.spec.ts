import { test, expect } from "@playwright/test";
import { login, logout } from "./helpers/auth";
import { clearRateLimits } from "./helpers/test-db";

test.describe("Authentication", () => {
	test.beforeEach(() => {
		clearRateLimits();
	});
	test("login with valid credentials shows home page", async ({ page }) => {
		await login(page, "testuser", "test1234");
		await expect(page.locator("h1")).toContainText("Hello, Test User");
	});

	test("login with wrong password shows error", async ({ page }) => {
		await page.goto("/login");
		await page.fill("#username", "testuser");
		await page.fill("#password", "wrongpassword");
		await page.click('button[type="submit"]');

		// Error message div has class containing "crimson"
		const errorDiv = page.locator(".bg-crimson\\/15");
		await expect(errorDiv).toBeVisible({ timeout: 5000 });
	});

	test("visiting /home unauthenticated redirects to login", async ({ page }) => {
		await page.goto("/home");
		await page.waitForURL(/\/login/, { timeout: 10000 });
		expect(page.url()).toContain("/login");
	});

	test("logout redirects away from protected pages", async ({ page }) => {
		await login(page, "testuser", "test1234");
		await expect(page.locator("h1")).toContainText("Hello");

		await logout(page);

		// After logout, trying to visit /home should redirect to /login
		await page.goto("/home");
		await page.waitForURL(/\/login/, { timeout: 10000 });
		expect(page.url()).toContain("/login");
	});
});
