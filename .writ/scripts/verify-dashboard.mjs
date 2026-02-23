#!/usr/bin/env node
/**
 * One-off script to verify dashboard loads and capture screenshot.
 * Run: node .code-captain/scripts/verify-dashboard.mjs
 * Requires: pnpm add -D playwright (or npx playwright)
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const DASHBOARD_URL = 'http://localhost:3000/dashboard';
const SCREENSHOT_DIR = join(process.cwd(), '.code-captain', 'screenshots');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome', // Use system Chrome (avoids Chromium download)
  });
  const page = await browser.newPage();

  const result = {
    url: DASHBOARD_URL,
    status: 'unknown',
    statusCode: null,
    visibleSections: [],
    errors: [],
    screenshotPath: null,
  };

  try {
    const response = await page.goto(DASHBOARD_URL, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    result.statusCode = response?.status() ?? null;
    result.status = response?.ok() ? 'ok' : 'error';

    if (!response?.ok()) {
      result.errors.push(`HTTP ${result.statusCode}`);
    }

    // Wait for main content (Dashboard title or loading state)
    await page.waitForSelector('h1, [aria-label="Loading dashboard"], [role="alert"]', {
      timeout: 5000,
    }).catch(() => {});

    // Extract visible key sections
    const title = await page.locator('h1').first().textContent().catch(() => null);
    if (title) result.visibleSections.push(`Title: "${title.trim()}"`);

    const syncBtn = await page.locator('button:has-text("Sync"), button:has-text("sync")').first().count() > 0;
    if (syncBtn) result.visibleSections.push('Sync control: visible');

    const programSummary = await page.locator('text=Program Summary, text=Program summary').first().count() > 0;
    if (programSummary) result.visibleSections.push('Program Summary: visible');

    const workstreamCards = await page.locator('[data-testid="workstream-card"], .mantine-Card').count();
    if (workstreamCards > 0) result.visibleSections.push(`Workstream/cards: ${workstreamCards} found`);

    const milestonePanel = await page.locator('text=Milestone, text=milestone').first().count() > 0;
    if (milestonePanel) result.visibleSections.push('Milestone panel: visible');

    const loadingSkeleton = await page.locator('[aria-label="Loading dashboard"]').count() > 0;
    if (loadingSkeleton) result.visibleSections.push('Loading skeletons: visible (data may still be loading)');

    const errorAlert = await page.locator('[role="alert"], .mantine-Alert-root').first().textContent().catch(() => null);
    if (errorAlert && errorAlert.includes('Error')) {
      result.visibleSections.push(`Error/alert: "${errorAlert.slice(0, 80)}..."`);
      result.errors.push(errorAlert.slice(0, 200));
    }

    // Take screenshot
    const { mkdirSync, existsSync } = await import('fs');
    if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const screenshotPath = join(SCREENSHOT_DIR, `dashboard-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    result.screenshotPath = screenshotPath;
  } catch (err) {
    result.status = 'error';
    result.errors.push(err?.message ?? String(err));
  } finally {
    await browser.close();
  }

  // Output JSON for parsing
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
