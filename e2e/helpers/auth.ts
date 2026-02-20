import type { Page } from "@playwright/test";

export async function login(page: Page, username: string, password: string) {
	await page.goto("/login");
	await page.waitForLoadState("networkidle");
	await page.locator("#username").fill(username);
	await page.locator("#password").fill(password);
	await page.locator('button[type="submit"]').click();

	// Wait for either navigation to /home or error message
	const result = await Promise.race([
		page.waitForURL(/\/home/, { timeout: 15000 }).then(() => "navigated" as const),
		page
			.locator(".bg-crimson\\/15")
			.waitFor({ state: "visible", timeout: 15000 })
			.then(async () => {
				const text = await page.locator(".bg-crimson\\/15").textContent();
				return `error: ${text}` as const;
			}),
	]);

	if (result.startsWith("error:")) {
		throw new Error(`Login failed: ${result}`);
	}
}

export async function logout(page: Page) {
	await page.locator('button:has-text("Sign Out")').click();
	// After logout, the app navigates away from /home (to / or /login)
	await page.waitForURL((url) => !url.pathname.startsWith("/home"), {
		timeout: 10000,
	});
}
