
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.STT_URL || "http://127.0.0.1:43123";
const OUT = "/tmp/stt-scroll-qa";
fs.mkdirSync(OUT, { recursive: true });

const report = { ok: true, checks: [], errors: [], at: new Date().toISOString() };

function check(name, pass, detail) {
  report.checks.push({ name, pass, detail });
  if (!pass) {
    report.ok = false;
    report.errors.push(`${name}: ${detail}`);
  }
  console.log(`${pass ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(BASE + "/?scrollqa=" + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector('[aria-label="Örnek kayıt kataloğu"]', { timeout: 30000 });
await page.waitForSelector('canvas[aria-label*="Dalga formu"]', { timeout: 30000 });
await page.waitForTimeout(1000);

const metrics = await page.evaluate(() => {
  const html = document.documentElement;
  const catalog = document.querySelector('[aria-label="Örnek kayıt kataloğu"]');
  const aside = document.querySelector("aside");
  const waveCanvas = document.querySelector('canvas[aria-label*="Dalga formu"]');
  const section = document.querySelector("main section") || document.querySelector("section");
  const stickyBlocks = section
    ? Array.from(section.querySelectorAll("div")).filter((el) =>
        el.className.toString().includes("sticky")
      )
    : [];

  function scrollInfo(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      overflowY: cs.overflowY,
      position: cs.position,
      maxHeight: cs.maxHeight,
      clientH: el.clientHeight,
      scrollH: el.scrollHeight,
      canScrollY: el.scrollHeight > el.clientHeight + 1,
    };
  }

  const scrollables = [];
  const root = document.querySelector("main") || document.body;
  root.querySelectorAll("*").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.overflowY === "auto" || cs.overflowY === "scroll") {
      scrollables.push({
        label: el.getAttribute("aria-label") || el.id || el.tagName.toLowerCase(),
        overflowY: cs.overflowY,
        canScrollY: el.scrollHeight > el.clientHeight + 1,
        inAside: !!(aside && aside.contains(el)),
      });
    }
  });

  const wr = waveCanvas?.getBoundingClientRect();
  return {
    docScrollable: html.scrollHeight > html.clientHeight + 2,
    aside: scrollInfo(aside),
    catalog: scrollInfo(catalog),
    stickyCount: stickyBlocks.length,
    stickyPosition: stickyBlocks[0] ? getComputedStyle(stickyBlocks[0]).position : null,
    waveform: wr
      ? { top: wr.top, height: wr.height, width: wr.width, visible: wr.height > 40 && wr.width > 100 && wr.bottom > 0 && wr.top < innerHeight }
      : null,
    scrollables,
  };
});

check(
  "aside-no-overflow-scroll",
  metrics.aside && metrics.aside.overflowY !== "auto" && metrics.aside.overflowY !== "scroll",
  JSON.stringify(metrics.aside)
);

check(
  "catalog-is-scrollable",
  !!(metrics.catalog && metrics.catalog.canScrollY && metrics.catalog.overflowY === "auto"),
  JSON.stringify(metrics.catalog)
);

const asideScrollables = metrics.scrollables.filter((s) => s.inAside);
check(
  "aside-single-scroll-child",
  asideScrollables.length === 1 && asideScrollables[0].label === "Örnek kayıt kataloğu",
  JSON.stringify(asideScrollables.map((s) => s.label))
);

check(
  "sticky-player-present",
  metrics.stickyCount >= 1 && metrics.stickyPosition === "sticky",
  `count=${metrics.stickyCount} pos=${metrics.stickyPosition}`
);

check(
  "waveform-visible",
  metrics.waveform?.visible === true,
  JSON.stringify(metrics.waveform)
);

const beforeScrollY = await page.evaluate(() => window.scrollY);
const catalogBox = page.locator('[aria-label="Örnek kayıt kataloğu"]');
const beforeCatalogTop = await catalogBox.evaluate((el) => el.scrollTop);
await catalogBox.hover({ position: { x: 40, y: 40 } });
await page.mouse.wheel(0, 480);
await page.waitForTimeout(350);
const afterWheel = await page.evaluate(() => ({
  scrollY: window.scrollY,
  catalogTop: document.querySelector('[aria-label="Örnek kayıt kataloğu"]')?.scrollTop ?? -1,
}));
check(
  "catalog-scrolls-inside-box",
  afterWheel.catalogTop > beforeCatalogTop + 50,
  `catalogTop ${beforeCatalogTop} → ${afterWheel.catalogTop}`
);
check(
  "wheel-on-catalog-no-page-jump",
  Math.abs(afterWheel.scrollY - beforeScrollY) < 2,
  `page scrollY ${beforeScrollY} → ${afterWheel.scrollY}`
);

await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(400);
const afterPageScroll = await page.evaluate(() => {
  const section = document.querySelector("main section") || document.querySelector("section");
  const sticky = section
    ? Array.from(section.querySelectorAll("div")).find((el) =>
        el.className.toString().includes("sticky")
      )
    : null;
  const canvas = document.querySelector('canvas[aria-label*="Dalga formu"]');
  const r = canvas?.getBoundingClientRect();
  const sr = sticky?.getBoundingClientRect();
  return {
    scrollY: window.scrollY,
    stickyTop: sr?.top ?? null,
    stickyPosition: sticky ? getComputedStyle(sticky).position : null,
    wave: r ? { top: r.top, height: r.height, visible: r.height > 40 && r.top < innerHeight && r.bottom > 0 } : null,
  };
});
check(
  "waveform-still-visible-after-scroll",
  afterPageScroll.wave?.visible === true,
  JSON.stringify(afterPageScroll)
);
check(
  "player-sticky-engaged",
  afterPageScroll.stickyPosition === "sticky" &&
    afterPageScroll.stickyTop !== null &&
    afterPageScroll.stickyTop <= 24,
  JSON.stringify({ stickyTop: afterPageScroll.stickyTop, stickyPosition: afterPageScroll.stickyPosition })
);

const bars = await page.evaluate(() => {
  const aside = document.querySelector("aside");
  const catalog = document.querySelector('[aria-label="Örnek kayıt kataloğu"]');
  function hasVScrollBar(el) {
    if (!el) return false;
    return el.scrollHeight > el.clientHeight + 1 && ["auto", "scroll"].includes(getComputedStyle(el).overflowY);
  }
  return {
    asideBar: hasVScrollBar(aside),
    catalogBar: hasVScrollBar(catalog),
    bodyBar: document.documentElement.scrollHeight > document.documentElement.clientHeight + 2,
  };
});
check(
  "no-double-scrollbar-aside-plus-catalog",
  bars.asideBar === false && bars.catalogBar === true,
  JSON.stringify(bars)
);

await page.screenshot({ path: path.join(OUT, "after-scroll.png"), fullPage: false });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, "top.png"), fullPage: false });

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ ...report, metrics, afterWheel, afterPageScroll, bars }, null, 2));
await browser.close();

console.log("\nProof dir:", OUT);
if (!report.ok) {
  console.error("\nFAILED:", report.errors.join("\n"));
  process.exit(1);
}
console.log("\nALL CHECKS PASSED");
