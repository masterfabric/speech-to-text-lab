/**
 * Playwright smoke: Minimal (default) + Detay audio stage views, TÜİK toggle.
 * Minimal = single-line timeline player + waveform only (no catalog chrome).
 *   node scripts/verify-audio-stage-views.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.LAB_URL || "http://127.0.0.1:43123/";

function fail(msg, extra) {
  console.error("FAIL:", msg);
  if (extra) console.error(extra);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
mkdirSync(".qa/audio-stage", { recursive: true });

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });

  const toggle = page.locator('[data-testid="audio-stage-view-toggle"]');
  await toggle.waitFor({ state: "visible", timeout: 15000 });

  const minimalBtn = page.locator('[data-testid="audio-stage-view-minimal"]');
  const detailBtn = page.locator('[data-testid="audio-stage-view-detail"]');

  // Default = Minimal
  const defaultPressed = await minimalBtn.getAttribute("aria-pressed");
  if (defaultPressed !== "true") fail("default view should be Minimal", { defaultPressed });

  const minimal = page.locator('[data-testid="audio-stage-minimal"]');
  await minimal.waitFor({ state: "visible", timeout: 5000 });
  if (await page.locator('[data-testid="audio-stage-detail"]').count()) {
    fail("Detay stage should be hidden by default");
  }

  // Compact pieces inside Minimal strip — player + wave only
  await page.locator('[data-testid="audio-player-compact"]').waitFor({ state: "visible" });
  await page.locator('[data-testid="waveform-compact"]').waitFor({ state: "visible" });

  // No sample-catalog chrome in Minimal
  const catalogInMinimal = await minimal.locator("#lab-sample-catalog").count();
  if (catalogInMinimal > 0) fail("Minimal must not include sample catalog chrome");
  if (await page.locator('[data-testid="sample-catalog-row"]').count()) {
    fail("sample catalog row should be hidden in Minimal");
  }

  // Single strip: compact player + compact wave only
  const stripGeom = await minimal.evaluate((el) => {
    const style = getComputedStyle(el);
    const player = el.querySelector('[data-testid="audio-player-compact"]');
    const wave = el.querySelector('[data-testid="waveform-compact"]');
    const cat = el.querySelector("#lab-sample-catalog");
    if (!player || !wave) {
      return { error: "missing child", hasPlayer: !!player, hasWave: !!wave };
    }
    const p = player.getBoundingClientRect();
    const w = wave.getBoundingClientRect();
    return {
      borderColor: style.borderTopColor,
      height: el.getBoundingClientRect().height,
      playerTop: p.top,
      playerBottom: p.bottom,
      playerHeight: p.height,
      waveTop: w.top,
      waveHeight: w.height,
      hasCatalog: !!cat,
      stacked: p.bottom <= w.top + 8,
      playerSingleLine: p.height <= 48,
    };
  });
  console.log("stripGeom:", stripGeom);
  if (stripGeom.error) fail("minimal strip incomplete", stripGeom);
  if (stripGeom.hasCatalog) fail("catalog still inside Minimal strip", stripGeom);
  if (!stripGeom.stacked) fail("player + wave not stacked", stripGeom);
  if (!stripGeom.playerSingleLine) fail("player not single-line height", stripGeom);
  if (stripGeom.waveHeight > 72) fail("waveform not thin enough in Minimal", stripGeom);
  if (stripGeom.height > 160) fail("Minimal strip still too tall / chrome-heavy", stripGeom);

  // TÜİK red on active Minimal toggle
  const minimalBg = await minimalBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log("minimalBtn bg:", minimalBg);
  // expect rgb close to #ae1615 => rgb(174, 22, 21)
  const m = minimalBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) fail("could not parse Minimal button bg", minimalBg);
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (r < 140 || g > 60 || b > 60) fail("Minimal active btn not TÜİK red", { r, g, b });

  await page.screenshot({ path: ".qa/audio-stage/minimal.png", fullPage: false });

  // Switch to Detay
  await detailBtn.click();
  await page.locator('[data-testid="audio-stage-detail"]').waitFor({
    state: "visible",
    timeout: 5000,
  });
  if (await page.locator('[data-testid="audio-stage-minimal"]').count()) {
    fail("Minimal should hide after Detay");
  }
  await page.locator('[data-testid="audio-player-detail"]').waitFor({ state: "visible" });
  await page.locator('[data-testid="waveform-detail"]').waitFor({ state: "visible" });
  await page.locator("#lab-sample-catalog").waitFor({ state: "visible" });
  await page.locator('[data-testid="sample-catalog-row"]').waitFor({ state: "visible" });

  const detailPressed = await detailBtn.getAttribute("aria-pressed");
  if (detailPressed !== "true") fail("Detay button should be pressed");

  const detailBg = await detailBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log("detailBtn bg:", detailBg);

  // Detay has separate player heading
  const hasPlayerH2 = await page.evaluate(() =>
    [...document.querySelectorAll("h2")].some((h) =>
      h.textContent?.includes("Ses oynatıcı")
    )
  );
  if (!hasPlayerH2) fail("Detay should show Ses oynatıcı heading");

  await page.screenshot({ path: ".qa/audio-stage/detail.png", fullPage: false });

  // Back to Minimal
  await minimalBtn.click();
  await page.locator('[data-testid="audio-stage-minimal"]').waitFor({
    state: "visible",
    timeout: 5000,
  });
  if (await page.locator("#lab-sample-catalog").count()) {
    fail("catalog must stay out of Minimal after toggle back");
  }

  console.log("PASS: Minimal = player+wave only; Detay keeps catalog + cards");
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
}
