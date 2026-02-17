#!/usr/bin/env node
/**
 * Verify dashboard after sync: Program Summary, workstream cards, sync state.
 * Run: node .code-captain/scripts/verify-dashboard-post-sync.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DASHBOARD_URL = 'http://localhost:3000/dashboard';
const SCREENSHOT_DIR = join(process.cwd(), '.code-captain', 'screenshots');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });
  const page = await browser.newPage();

  const result = {
    url: DASHBOARD_URL,
    programSummary: { visible: false, sprintLabel: null, metrics: [], computedAt: null },
    workstreamCards: { visible: false, count: 0, workstreams: [] },
    syncState: { refreshed: null, inProgress: false, error: null },
    screenshotPath: null,
    errors: [],
  };

  try {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Wait for initial content
    await page.waitForSelector('h1', { timeout: 5000 });

    // If we see loading skeletons, wait for them to disappear or trigger sync
    const hasLoading = await page.locator('[aria-label="Loading dashboard"]').count() > 0;
    if (hasLoading) {
      await page.waitForSelector('[aria-label="Loading dashboard"]', { state: 'hidden', timeout: 15000 }).catch(() => {});
    }

    // If empty/error, click Sync and wait
    const syncBtn = page.locator('button:has-text("Sync")');
    const isEmpty = await page.locator('text=No metrics data available').count() > 0;
    const hasError = await page.locator('text=Error loading metrics').count() > 0;
    if (isEmpty || hasError) {
      await syncBtn.click();
      await page.waitForSelector('button:has-text("Syncing…")', { timeout: 2000 }).catch(() => {});
      await page.waitForSelector('button:has-text("Sync Now")', { timeout: 60000 }).catch(() => {});
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Allow metrics to render
    }

    // Wait for Program Summary or workstream content
    await page.waitForSelector('text=Program Summary, [class*="Card"]', { timeout: 10000 }).catch(() => {});

    // Sync state
    const syncingText = await page.locator('button:has-text("Syncing…")').count() > 0;
    const syncNowText = await page.locator('button:has-text("Sync Now")').count() > 0;
    result.syncState.inProgress = syncingText;
    result.syncState.refreshed = syncNowText && !syncingText;

    const syncError = await page.locator('[data-testid="sync-error-alert"]').textContent().catch(() => null);
    if (syncError) result.syncState.error = syncError.trim().slice(0, 150);

    // Program Summary
    const programSummaryTitle = await page.locator('h2:has-text("Program Summary")').count() > 0;
    result.programSummary.visible = programSummaryTitle;

    if (programSummaryTitle) {
      const summarySection = page.locator('h2:has-text("Program Summary")').locator('..');
      const sprintLabelEl = await summarySection.locator('text=/Sprint|sprint|—/').first().textContent().catch(() => null);
      result.programSummary.sprintLabel = sprintLabelEl?.trim().slice(0, 80) ?? null;

      const metricCards = page.locator('h2:has-text("Program Summary")').locator('..').locator('.mantine-Card');
      const cardCount = await metricCards.count();
      for (let i = 0; i < Math.min(cardCount, 8); i++) {
        const card = metricCards.nth(i);
        const label = await card.locator('text=/VELOCITY|OVERHEAD|PREDICTABILITY|CARRY|carry/i').first().textContent().catch(() => null);
        const value = await card.locator('.mantine-Text').nth(1).textContent().catch(() => null);
        if (label || value) {
          result.programSummary.metrics.push({
            label: label?.trim().slice(0, 30) ?? 'metric',
            value: value?.trim().slice(0, 50) ?? null,
          });
        }
      }
      if (result.programSummary.metrics.length === 0) {
        const allText = await summarySection.textContent().catch(() => '');
        const valueMatch = allText.match(/\d+(\.\d+)?%?/g);
        if (valueMatch) result.programSummary.metrics.push({ label: 'values', value: valueMatch.slice(0, 6).join(', ') });
      }
    }

    // Workstream cards (Cards with workstream names, not Program Summary cards)
    const allCards = page.locator('.mantine-Card');
    const cardCount = await allCards.count();
    const workstreamNames = new Set();
    for (let i = 0; i < cardCount; i++) {
      const card = allCards.nth(i);
      const text = await card.textContent().catch(() => '');
      if (text.includes('Planned:') && text.includes('Completed:') && text.includes('Carry-over:')) {
        const nameMatch = text.match(/^[\s\S]*?([A-Za-z0-9][^\n]+?)(?=\s*(?:VELOCITY|Planned:))/);
        const name = nameMatch ? nameMatch[1].trim().slice(0, 60) : null;
        if (name && !name.includes('Program Summary')) workstreamNames.add(name);
      }
    }
    result.workstreamCards.visible = workstreamNames.size > 0;
    result.workstreamCards.count = workstreamNames.size;
    result.workstreamCards.workstreams = [...workstreamNames];

    // Screenshot
    if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const screenshotPath = join(SCREENSHOT_DIR, `dashboard-post-sync-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    result.screenshotPath = screenshotPath;
  } catch (err) {
    result.errors.push(err?.message ?? String(err));
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
