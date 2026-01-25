import { test, expect } from '../fixtures';

test.describe('Public Inquiry Submission', () => {
  test('should submit inquiry with valid data', async ({ page }) => {
    // Visit public properties page
    await page.goto('/properties');
    
    // Wait for properties to load
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
    
    // Click on first property
    await page.click('[data-testid="property-card"]:first-child');
    
    // Wait for property detail page
    await page.waitForSelector('[data-testid="inquiry-form"]');
    
    // Fill inquiry form
    await page.fill('[name="guestName"]', 'Test Guest');
    await page.fill('[name="guestPhone"]', '0991234567');
    await page.fill('[name="guestEmail"]', 'test@example.com');
    
    // Select dates (tomorrow and day after)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    await page.fill('[name="checkInDate"]', tomorrow);
    await page.fill('[name="checkOutDate"]', dayAfter);
    await page.fill('[name="numberOfGuests"]', '2');
    await page.fill('[name="message"]', 'Looking forward to staying here');
    
    // Submit form
    await page.click('[type="submit"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should show validation errors for invalid data', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]');
    await page.click('[data-testid="property-card"]:first-child');
    await page.waitForSelector('[data-testid="inquiry-form"]');
    
    // Try to submit without required fields
    await page.click('[type="submit"]');
    
    // Verify error messages appear
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Phone is required')).toBeVisible();
  });

  test('should reject check-out before check-in', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]');
    await page.click('[data-testid="property-card"]:first-child');
    await page.waitForSelector('[data-testid="inquiry-form"]');
    
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Fill form with inverted dates
    await page.fill('[name="guestName"]', 'Test Guest');
    await page.fill('[name="guestPhone"]', '0991234567');
    await page.fill('[name="checkInDate"]', dayAfter); // Later date
    await page.fill('[name="checkOutDate"]', tomorrow); // Earlier date
    await page.fill('[name="numberOfGuests"]', '2');
    
    await page.click('[type="submit"]');
    
    // Verify error message
    await expect(page.locator('text=/check.*out.*after.*check.*in/i')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/properties');
    await page.waitForSelector('[data-testid="property-card"]');
    
    // Verify mobile layout
    const card = page.locator('[data-testid="property-card"]:first-child');
    await expect(card).toBeVisible();
    
    // Check that touch targets are large enough (≥44px)
    const cardBox = await card.boundingBox();
    expect(cardBox?.height).toBeGreaterThanOrEqual(44);
  });
});
