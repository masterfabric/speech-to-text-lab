/**
 * Playwright: local/dev never hits Web3Forms UUID errors and always reaches the lab.
 *
 *   1) Home opens the main lab without visiting /onboarding.
 *   2) /onboarding form submit succeeds with an invalid/missing access key
 *      and without calling api.web3forms.com, then lands on the lab.
 *
 *   LAB_URL=http://127.0.0.1:43123/ node scripts/verify-local-onboarding-bypass.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.LAB_URL || "http://127.0.0.1:43123/";

function fail(msg, extra) {
  console.error("FAIL:", msg);
  if (extra) console.error(extra);
  process.exit(1);
}

mkdirSync(".qa/local-onboarding-bypass", { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  // --- 1) Fresh local session: land on main lab, no Web3Forms ---
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(() => {
      localStorage.removeItem("stt-lab-consent-v1");
    });
    const page = await context.newPage();
    const web3Hits = [];
    page.on("request", (req) => {
      if (req.url().includes("api.web3forms.com")) web3Hits.push(req.url());
    });

    await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#lab-upload-zone").waitFor({
      state: "visible",
      timeout: 20000,
    });

    const path = new URL(page.url()).pathname;
    if (path !== "/" && path !== "") {
      await page.screenshot({
        path: ".qa/local-onboarding-bypass/home-not-lab.png",
        fullPage: true,
      });
      fail("local home should open the lab (/), not onboarding", {
        path,
        url: page.url(),
      });
    }

    if (web3Hits.length) {
      fail("local home must not call Web3Forms", web3Hits);
    }

    await page.screenshot({
      path: ".qa/local-onboarding-bypass/local-home-lab.png",
      fullPage: true,
    });
    await context.close();
    console.log("OK: local home opens lab without Web3Forms");
  }

  // --- 2) /onboarding form submit with invalid key must succeed ---
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(() => {
      localStorage.removeItem("stt-lab-consent-v1");
    });
    const page = await context.newPage();
    const web3Hits = [];
    page.on("request", (req) => {
      if (req.url().includes("api.web3forms.com")) web3Hits.push(req.url());
    });

    await page.goto(new URL("/onboarding", BASE).href, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // Splash → Continue (wait for splash ready)
    const continueBtn = page.getByRole("button", {
      name: /Devam|Continue|Continuer|继续|続ける|متابعة/i,
    });
    await continueBtn.first().waitFor({ state: "visible", timeout: 15000 });
    // Splash enables after ~900ms
    await page.waitForTimeout(1200);
    await continueBtn.first().click();

    // Onboarding steps → Continue
    await continueBtn.first().waitFor({ state: "visible", timeout: 10000 });
    await continueBtn.first().click();

    await page.locator('input[name="firstName"]').waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page.fill('input[name="firstName"]', "Local");
    await page.fill('input[name="lastName"]', "Dev");
    await page.fill('textarea[name="reason"]', "local bypass verify");
    await page.locator('input[name="consent"]').check();
    await page.locator('button[type="submit"]').click();

    // Must reach lab without UUID / access_key toast
    await page.locator("#lab-upload-zone").waitFor({
      state: "visible",
      timeout: 20000,
    });

    const errVisible = await page.locator('[role="alert"]').isVisible().catch(() => false);
    if (errVisible) {
      const errText = await page.locator('[role="alert"]').innerText();
      if (/Invalid form_id|access_key|UUID|WEB3FORMS/i.test(errText)) {
        await page.screenshot({
          path: ".qa/local-onboarding-bypass/uuid-error.png",
          fullPage: true,
        });
        fail("onboarding submit must not show Web3Forms UUID/key error", {
          errText,
        });
      }
    }

    if (web3Hits.length) {
      fail("/onboarding submit must not call Web3Forms", web3Hits);
    }

    const finalPath = new URL(page.url()).pathname;
    if (finalPath !== "/" && finalPath !== "") {
      fail("after local submit should land on lab /", {
        finalPath,
        url: page.url(),
      });
    }

    await page.screenshot({
      path: ".qa/local-onboarding-bypass/onboarding-submit-ok.png",
      fullPage: true,
    });
    await context.close();
    console.log("OK: /onboarding submit succeeds locally without Web3Forms");
  }

  console.log("PASS: local onboarding bypass");
} finally {
  await browser.close();
}
