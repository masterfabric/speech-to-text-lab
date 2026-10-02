/**
 * Playwright: long / 8 kHz telephony-style uploads still yield score + nötr
 * after process (chunking + decode fallbacks + no Web Speech hang).
 *
 *   node scripts/verify-telephony-upload-scoring.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.LAB_URL || "http://127.0.0.1:43123/";
const FIXTURE_5S = join(__dirname, "fixtures/telephony-8khz-5s.mp3");
const FIXTURE_90S = join(__dirname, "fixtures/telephony-8khz-90s.mp3");
/** Optional real user extract (not committed). */
const USER_30S = "/tmp/user-sample-audio/user-sample-30s.wav";
const USER_FULL = "/tmp/user-sample-audio/user-sample.mp3";

function fail(msg, extra) {
  console.error("FAIL:", msg);
  if (extra) console.error(extra);
  process.exit(1);
}

function ensureFixtures() {
  if (existsSync(FIXTURE_5S) && existsSync(FIXTURE_90S)) return;
  mkdirSync(join(__dirname, "fixtures"), { recursive: true });
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=440:sample_rate=8000:duration=5" -c:a libmp3lame -b:a 16k -ar 8000 -ac 1 "${FIXTURE_5S}"`,
    { stdio: "inherit" }
  );
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=300:sample_rate=8000:duration=90" -af "volume=0.3" -c:a libmp3lame -b:a 16k -ar 8000 -ac 1 "${FIXTURE_90S}"`,
    { stdio: "inherit" }
  );
}

ensureFixtures();
mkdirSync(".qa/telephony-scoring", { recursive: true });

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
      lastName: "Telephony",
      reason: "playwright telephony upload skorlama",
    })
  );
});
const page = await context.newPage();

async function uploadAndScore(filePath, uploadName, mimeType) {
  const buf = readFileSync(filePath);
  await page.setInputFiles('#lab-upload-zone input[type="file"]', {
    name: uploadName,
    mimeType,
    buffer: buf,
  });

  await page
    .locator('[data-testid="audio-stage-file-badge"]')
    .filter({ hasText: uploadName })
    .waitFor({ state: "visible", timeout: 15000 });

  const t0 = Date.now();
  await page
    .getByRole("button", { name: "Transkribe et + duygu analizi" })
    .click();

  await page.locator('[data-testid="sentiment-panel"]').waitFor({
    state: "visible",
    timeout: 45000,
  });
  await page.locator('[data-testid="report-panel"]').waitFor({
    state: "visible",
    timeout: 10000,
  });
  const elapsedMs = Date.now() - t0;

  const polarity = (
    await page.locator('[data-testid="sentiment-polarity"]').innerText()
  ).trim();
  const emotion = (
    await page.locator('[data-testid="sentiment-emotion"]').innerText()
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
  const badge = (
    await page.locator('[data-testid="audio-stage-file-badge"]').innerText()
  ).trim();

  return {
    uploadName,
    polarity,
    emotion,
    scoreText,
    reportPolarity,
    reportScore,
    badge,
    elapsedMs,
  };
}

function assertSkorlama(result, { maxMs } = {}) {
  console.log(result);
  if (!/NÖTR/i.test(result.polarity)) {
    fail("sentiment polarity must be NÖTR for telephony upload", result);
  }
  if (!/nötr/i.test(result.emotion)) {
    fail("sentiment emotion must surface nötr for neutral upload", result);
  }
  if (!/Skor:\s*-?\d+\.\d{2}/i.test(result.scoreText)) {
    fail("sentiment must show numeric score including 0.00", result);
  }
  if (!/nötr/i.test(result.reportPolarity)) {
    fail("report polarity must show nötr", result);
  }
  if (!/-?\d+\.\d{2}/.test(result.reportScore)) {
    fail("report must show dedicated score stat", result);
  }
  if (maxMs != null && result.elapsedMs > maxMs) {
    fail(`transcribe+score too slow for upload (possible timeout hang)`, {
      ...result,
      maxMs,
    });
  }
}

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#lab-upload-zone").waitFor({
    state: "visible",
    timeout: 20000,
  });

  // 1) Short 8 kHz mono MP3
  assertSkorlama(
    await uploadAndScore(
      FIXTURE_5S,
      "telephony-8khz-5s.mp3",
      "audio/mpeg"
    ),
    { maxMs: 15000 }
  );

  // 2) Longer 8 kHz MP3 (chunked mock transcript path)
  assertSkorlama(
    await uploadAndScore(
      FIXTURE_90S,
      "telephony-8khz-90s.mp3",
      "audio/mpeg"
    ),
    { maxMs: 20000 }
  );

  // Web Speech mode must not hang ~12s on blob uploads
  const modes = page.locator('[role="radiogroup"] [role="radio"]');
  await modes.nth(1).click(); // Web Speech
  const web = await uploadAndScore(
    FIXTURE_5S,
    "telephony-webspeech-skip.mp3",
    "audio/mpeg"
  );
  assertSkorlama(web, { maxMs: 8000 });

  await page.screenshot({
    path: ".qa/telephony-scoring/after-8khz-score.png",
    fullPage: true,
  });

  // 3) Optional: real user extracts when present on the machine
  if (existsSync(USER_30S)) {
    assertSkorlama(
      await uploadAndScore(USER_30S, "user-sample-30s.wav", "audio/wav"),
      { maxMs: 20000 }
    );
  }
  if (existsSync(USER_FULL)) {
    assertSkorlama(
      await uploadAndScore(USER_FULL, "user-sample.mp3", "audio/mpeg"),
      { maxMs: 25000 }
    );
  }

  console.log(
    "PASS: telephony / 8 kHz uploads show skor + nötr; blob Web Speech does not hang"
  );
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
}
