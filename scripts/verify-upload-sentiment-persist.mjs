/**
 * Playwright: arbitrary upload shows score + nötr/polarity, and STT mode
 * switches keep the uploaded clip playable in the audio stage.
 *
 *   node scripts/verify-upload-sentiment-persist.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "fs";

const BASE = process.env.LAB_URL || "http://127.0.0.1:43123/";

function fail(msg, extra) {
  console.error("FAIL:", msg);
  if (extra) console.error(extra);
  process.exit(1);
}

mkdirSync(".qa/upload-sentiment", { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem(
    "stt-lab-consent-v1",
    JSON.stringify({
      version: 1,
      acceptedAt: new Date().toISOString(),
      locale: "tr",
      firstName: "Verify",
      lastName: "Upload",
      reason: "playwright upload sentiment + persist",
    })
  );
});
const page = await context.newPage();

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#lab-upload-zone").waitFor({ state: "visible", timeout: 20000 });

  const wav = readFileSync("public/samples/cv-tr-eve-gidin.wav");
  const uploadName = "arbitrary-outside-random.wav";
  await page.setInputFiles('#lab-upload-zone input[type="file"]', {
    name: uploadName,
    mimeType: "audio/wav",
    buffer: wav,
  });

  await page
    .locator('[data-testid="audio-stage-file-badge"]')
    .filter({ hasText: uploadName })
    .waitFor({ state: "visible", timeout: 10000 });

  const srcBefore = await page.evaluate(() =>
    document.querySelector("audio source")?.getAttribute("src")
  );
  if (!srcBefore || !srcBefore.startsWith("blob:")) {
    fail("upload should bind a blob: URL to the player", { srcBefore });
  }

  await page
    .getByRole("button", { name: "Transkribe et + duygu analizi" })
    .click();

  await page.locator('[data-testid="sentiment-panel"]').waitFor({
    state: "visible",
    timeout: 20000,
  });
  await page.locator('[data-testid="report-panel"]').waitFor({
    state: "visible",
    timeout: 10000,
  });

  const polarity = (
    await page.locator('[data-testid="sentiment-polarity"]').innerText()
  ).trim();
  const scoreText = (
    await page.locator('[data-testid="sentiment-score"]').innerText()
  ).trim();
  const reportPolarity = (
    await page.locator('[data-testid="report-polarity"]').innerText()
  ).trim();
  const reportScore = (
    await page.locator('[data-testid="report-score"]').innerText()
  ).trim();

  console.log({ polarity, scoreText, reportPolarity, reportScore });

  if (!/NÖTR/i.test(polarity)) {
    fail("sentiment panel must show NÖTR for unknown upload", { polarity });
  }
  if (!/Skor:\s*-?\d+\.\d{2}/i.test(scoreText)) {
    fail("sentiment panel must show numeric score (incl. 0.00)", { scoreText });
  }
  if (!/nötr/i.test(reportPolarity)) {
    fail("report must show nötr polarity for upload", { reportPolarity });
  }
  if (!/-?\d+\.\d{2}/.test(reportScore)) {
    fail("report must show dedicated score stat for upload", { reportScore });
  }

  await page.screenshot({
    path: ".qa/upload-sentiment/after-upload-transcribe.png",
    fullPage: true,
  });

  // Cycle STT modes — uploaded clip must remain in the stage and stay playable
  const modes = page.locator('[role="radiogroup"] [role="radio"]');
  const modeCount = await modes.count();
  if (modeCount < 3) fail("expected several STT modes", modeCount);

  for (let i = 0; i < modeCount; i++) {
    await modes.nth(i).click();
    await page.waitForTimeout(350);

    const badge = page.locator('[data-testid="audio-stage-file-badge"]');
    await badge.waitFor({ state: "visible", timeout: 5000 });
    const badgeText = await badge.innerText();
    if (!badgeText.includes(uploadName)) {
      fail(`mode ${i}: file badge lost uploaded name`, { badgeText });
    }

    const stage = await page.evaluate(() => {
      const source = document.querySelector("audio source");
      const audio = document.querySelector("audio");
      const player = document.querySelector(
        '[data-testid="audio-player-compact"]'
      );
      const wave = document.querySelector('[data-testid="waveform-compact"]');
      return {
        src: source?.getAttribute("src") || null,
        readyState: audio?.readyState ?? null,
        emptyPlayer: !!player?.textContent?.includes("Örnek seçince"),
        hasWaveCanvas: !!wave?.querySelector("canvas"),
      };
    });
    console.log(`mode ${i}:`, stage);
    if (!stage.src || !stage.src.startsWith("blob:")) {
      fail(`mode ${i}: blob audio src missing`, stage);
    }
    if (stage.emptyPlayer) {
      fail(`mode ${i}: player fell back to empty state`, stage);
    }
    if (!stage.hasWaveCanvas) {
      fail(`mode ${i}: waveform canvas missing`, stage);
    }

    const playOk = await page.evaluate(async () => {
      const audio = document.querySelector("audio");
      if (!audio) return { ok: false, reason: "no-audio" };
      try {
        await audio.play();
        await new Promise((r) => setTimeout(r, 250));
        const t = audio.currentTime;
        audio.pause();
        return { ok: t > 0 || audio.readyState >= 2, currentTime: t, readyState: audio.readyState };
      } catch (e) {
        return { ok: false, reason: String(e) };
      }
    });
    console.log(`mode ${i} play:`, playOk);
    if (!playOk.ok) {
      fail(`mode ${i}: uploaded audio not playable after STT switch`, playOk);
    }
  }

  await page.screenshot({
    path: ".qa/upload-sentiment/after-mode-cycle.png",
    fullPage: true,
  });

  // Re-transcribe under a staged mode — score + nötr must still appear
  await modes.nth(2).click();
  await page
    .getByRole("button", { name: "Transkribe et + duygu analizi" })
    .click();
  await page.locator('[data-testid="sentiment-panel"]').waitFor({
    state: "visible",
    timeout: 30000,
  });
  const polarity2 = (
    await page.locator('[data-testid="sentiment-polarity"]').innerText()
  ).trim();
  const score2 = (
    await page.locator('[data-testid="sentiment-score"]').innerText()
  ).trim();
  if (!/NÖTR/i.test(polarity2) || !/Skor:\s*-?\d+\.\d{2}/i.test(score2)) {
    fail("re-transcribe after mode switch must still show NÖTR + score", {
      polarity2,
      score2,
    });
  }

  console.log(
    "PASS: upload → score + nötr in sentiment/report; STT mode switches keep playable upload"
  );
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
}
