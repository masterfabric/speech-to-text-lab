/**
 * Playwright smoke: sample catalog is a horizontal L→R scroll row near the player.
 * Run: npx playwright test is NOT used — this is a standalone script.
 *   node scripts/verify-sample-catalog-row.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.LAB_URL || "http://127.0.0.1:43123/";

function fail(msg, extra) {
  console.error("FAIL:", msg);
  if (extra) console.error(extra);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });

  // Default view is Minimal; Detay restores stacked cards for geometry checks
  const detailBtn = page.locator('[data-testid="audio-stage-view-detail"]');
  await detailBtn.waitFor({ state: "visible", timeout: 15000 });
  await detailBtn.click();
  await page.locator('[data-testid="audio-stage-detail"]').waitFor({
    state: "visible",
    timeout: 5000,
  });

  const catalog = page.locator("#lab-sample-catalog");
  await catalog.waitFor({ state: "visible", timeout: 15000 });

  const row = page.locator('[data-testid="sample-catalog-row"]');
  await row.waitFor({ state: "visible", timeout: 5000 });

  const metrics = await row.evaluate((el) => {
    const style = getComputedStyle(el);
    const chips = [...el.querySelectorAll('[role="option"]')];
    return {
      display: style.display,
      flexWrap: style.flexWrap,
      overflowX: style.overflowX,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      chipCount: chips.length,
      firstChipLabel: chips[0]?.innerText?.replace(/\s+/g, " ").trim() ?? null,
      selectedCount: chips.filter((c) => c.getAttribute("aria-selected") === "true")
        .length,
      // Vertical nested hell check: catalog itself must NOT be a tall overflow-y box
      overflowY: style.overflowY,
      maxHeight: style.maxHeight,
    };
  });

  console.log("metrics:", JSON.stringify(metrics, null, 2));

  if (metrics.display !== "flex") fail("row display is not flex", metrics);
  if (metrics.flexWrap !== "nowrap") fail("row flex-wrap is not nowrap", metrics);
  if (!["auto", "scroll", "overlay"].includes(metrics.overflowX)) {
    fail("row overflow-x is not auto/scroll", metrics);
  }
  if (metrics.chipCount < 5) fail("expected several sample chips", metrics);
  if (metrics.scrollWidth <= metrics.clientWidth + 24) {
    fail(
      "expected meaningful horizontal overflow (scrollWidth >> clientWidth)",
      metrics
    );
  }

  // Vertical hell: the catalog row must not use overflow-y scroll / max-height trap
  if (["auto", "scroll"].includes(metrics.overflowY) && metrics.maxHeight !== "none") {
    fail("catalog row still looks like a vertical nested scroll box", metrics);
  }

  // Click a non-selected chip and confirm selection + player label update
  const options = row.locator('[role="option"]');
  const count = await options.count();
  let targetIdx = -1;
  for (let i = 0; i < count; i++) {
    const sel = await options.nth(i).getAttribute("aria-selected");
    if (sel !== "true") {
      targetIdx = i;
      break;
    }
  }
  if (targetIdx < 0) fail("could not find a non-selected chip");

  const target = options.nth(targetIdx);
  const beforeTitle = await target.getAttribute("title");
  await target.click();
  await page.waitForTimeout(400);

  const afterSelected = await target.getAttribute("aria-selected");
  if (afterSelected !== "true") fail("clicked chip did not become selected");

  // Player sits below catalog in sticky stack
  const geometry = await page.evaluate(() => {
    const cat = document.querySelector("#lab-sample-catalog");
    const playerHeading = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent?.includes("Ses oynatıcı")
    );
    const playerCard = playerHeading?.closest("div.rounded-xl");
    if (!cat || !playerCard) return null;
    const c = cat.getBoundingClientRect();
    const p = playerCard.getBoundingClientRect();
    return {
      catalogTop: c.top,
      catalogBottom: c.bottom,
      playerTop: p.top,
      nearPlayer: Math.abs(p.top - c.bottom) < 80 || p.top > c.top,
      catalogLeftOfPlayerColumn: true,
    };
  });

  console.log("geometry:", JSON.stringify(geometry, null, 2));
  if (!geometry) fail("could not locate catalog + player");
  if (!(geometry.catalogBottom <= geometry.playerTop + 4)) {
    fail("catalog should sit above (near) the player", geometry);
  }

  // Horizontal scroll works
  const scrolled = await row.evaluate((el) => {
    const before = el.scrollLeft;
    el.scrollLeft = el.scrollWidth;
    const after = el.scrollLeft;
    el.scrollLeft = 0;
    return { before, after, maxScroll: Math.max(0, el.scrollWidth - el.clientWidth) };
  });
  console.log("scroll:", scrolled);
  if (scrolled.maxScroll < 80) {
    fail("expected substantial L→R scroll range", scrolled);
  }
  if (scrolled.after <= scrolled.before) {
    fail("horizontal scroll did not move", scrolled);
  }

  // Sidebar upload zone still present; no vertical sample listbox in aside
  const sidebarListboxes = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return { error: "no aside" };
    const lbs = [...aside.querySelectorAll('[role="listbox"]')];
    return {
      asideListboxes: lbs.length,
      uploadZone: !!document.querySelector("#lab-upload-zone"),
    };
  });
  console.log("sidebar:", sidebarListboxes);
  if (sidebarListboxes.asideListboxes !== 0) {
    fail("sidebar still has a sample listbox (vertical nested hell)", sidebarListboxes);
  }
  if (!sidebarListboxes.uploadZone) fail("upload zone missing");

  // TÜİK red accent present on selected chip (bg close to #ae1615)
  const selectedBg = await row
    .locator('[role="option"][aria-selected="true"]')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log("selectedBg:", selectedBg, "title:", beforeTitle);

  console.log("PASS: sample catalog is horizontal L→R near player");
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
}
