import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("displays login page with Veranima title and Zaloguj button", async ({ page }) => {
    await page.goto("/login");

    // Check Title
    await expect(page).toHaveTitle(/Veranima/i);

    // Check Button ONLY (Remove the .or() logic)
    const zalogujButton = page.getByRole("button", { name: /zaloguj/i });
    await expect(zalogujButton).toBeVisible();
  });
});
