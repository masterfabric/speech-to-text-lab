import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.STT_URL || "http://127.0.0.1:43123";
const OUT = path.resolve(".qa/footer");
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
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(BASE + "/?footerqa=" + Date.now(), {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForSelector("footer", { timeout: 30000 });
await page.waitForTimeout(800);

const footer = page.locator("footer");
await footer.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

await footer.screenshot({ path: path.join(OUT, "footer.png") });
await page.screenshot({
  path: path.join(OUT, "footer-viewport.png"),
  fullPage: false,
});

const metrics = await page.evaluate(() => {
  const footer = document.querySelector("footer");
  if (!footer) return null;
  const grid = footer.querySelector(".grid");
  const cols = grid ? Array.from(grid.children) : [];
  const disclaimerBoxes = footer.querySelectorAll(
    ".rounded-2xl, .rounded-xl.border"
  );
  const disclaimerTexts = Array.from(footer.querySelectorAll("h2, p")).map(
    (el) => el.textContent?.trim() || ""
  );
  const links = Array.from(footer.querySelectorAll("a")).map((a) => ({
    href: a.getAttribute("href"),
    text: a.textContent?.replace(/\s+/g, " ").trim(),
  }));
  const cta = footer.querySelector("button");
  const bottomBar = footer.querySelector(":scope > .border-t") || footer.lastElementChild;

  const colBoxes = cols.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
    };
  });

  return {
    colCount: cols.length,
    colBoxes,
    disclaimerBoxCount: disclaimerBoxes.length,
    hasDuplicateEgitim:
      disclaimerTexts.filter((t) => /Eğitim amaçlı/.test(t)).length > 2,
    links,
    ctaText: cta?.textContent?.replace(/\s+/g, " ").trim() || null,
    ctaW: cta ? Math.round(cta.getBoundingClientRect().width) : 0,
    bottomBarText: bottomBar?.textContent?.replace(/\s+/g, " ").trim() || null,
    footerH: Math.round(footer.getBoundingClientRect().height),
    emojiInFooter: /[\u{1F300}-\u{1FAFF}]/u.test(footer.textContent || ""),
  };
});

check("footer-exists", !!metrics, JSON.stringify(metrics));
if (metrics) {
  check(
    "three-columns",
    metrics.colCount === 3,
    `cols=${metrics.colCount} boxes=${JSON.stringify(metrics.colBoxes)}`
  );

  const widths = metrics.colBoxes.map((c) => c.w);
  const minW = Math.min(...widths);
  const maxW = Math.max(...widths);
  const rhythmOk = maxW - minW < 120; // equal-ish rhythm on desktop
  check(
    "equal-column-rhythm",
    rhythmOk,
    `widths=${widths.join(",")} delta=${maxW - minW}`
  );

  const tops = metrics.colBoxes.map((c) => c.top);
  const topDelta = Math.max(...tops) - Math.min(...tops);
  check(
    "columns-aligned-top",
    topDelta < 8,
    `tops=${tops.join(",")} delta=${topDelta}`
  );

  // Only one educational disclaimer card (the rounded-2xl in center)
  const eduCards = await page.locator("footer h2").count();
  check(
    "single-disclaimer-heading",
    eduCards === 1,
    `h2 count=${eduCards}`
  );

  const hasLinkedIn = metrics.links.some((l) =>
    /linkedin\.com\/in\/gurkanfikretgunak/i.test(l.href || "")
  );
  const hasMasterFabric = metrics.links.some((l) =>
    /masterfabric\.co/i.test(l.href || "")
  );
  const hasSlides = metrics.links.some((l) =>
    /\/slides\//i.test(l.href || "")
  );
  check("link-linkedin", hasLinkedIn, JSON.stringify(metrics.links));
  check("link-masterfabric", hasMasterFabric, "masterfabric.co");
  check("link-slides", hasSlides, "slides");

  check(
    "cta-laboratuvara-git",
    /Laboratuvara git/i.test(metrics.ctaText || ""),
    metrics.ctaText
  );
  check("cta-substantial", metrics.ctaW >= 160, `ctaW=${metrics.ctaW}`);
  check(
    "bottom-copyright",
    /© speech-to-text-lab/i.test(metrics.bottomBarText || ""),
    metrics.bottomBarText
  );
  check("no-emoji", !metrics.emojiInFooter, `emoji=${metrics.emojiInFooter}`);
  check(
    "footer-not-sparse",
    metrics.footerH >= 280 && metrics.footerH <= 520,
    `footerH=${metrics.footerH}`
  );
}

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
