/**
 * Playwright: long / 8 kHz telephony uploads produce substantive analysis —
 * non-empty transcript, call segments / key phrases, and sentiment that
 * reflects content (not a blank skor-only 0.00 stub).
 *
 *   node scripts/verify-telephony-upload-scoring.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.LAB_URL || "http://127.0.0.1:43123/";
const FIXTURE_5S = join(__dirname, "fixtures/telephony-8khz-5s.mp3");
const FIXTURE_90S = join(__dirname, "fixtures/telephony-8khz-90s.mp3");
/** Optional real user extract (not committed). */
const USER_30S = "/tmp/sample-audio/user-sample-30s.wav";
const USER_FULL = "/tmp/sample-audio/user-sample.mp3";

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
  const transcriptText = (
    await page.locator('[data-testid="report-panel"]').innerText()
  ).trim();

  const callAnalysisVisible = await page
    .locator('[data-testid="report-call-analysis"]')
    .isVisible()
    .catch(() => false);
  const callSummary = callAnalysisVisible
    ? (
        await page.locator('[data-testid="report-call-summary"]').innerText()
      ).trim()
    : "";
  const keyPhrases = callAnalysisVisible
    ? (
        await page.locator('[data-testid="report-key-phrases"]').innerText()
      ).trim()
    : "";
  const segmentsVisible = await page
    .locator('[data-testid="report-call-segments"]')
    .isVisible()
    .catch(() => false);
  const segmentCount = segmentsVisible
    ? await page.locator('[data-testid="report-call-segments"] > li').count()
    : 0;

  return {
    uploadName,
    polarity,
    emotion,
    scoreText,
    reportPolarity,
    reportScore,
    badge,
    elapsedMs,
    transcriptText,
    callAnalysisVisible,
    callSummary,
    keyPhrases,
    segmentsVisible,
    segmentCount,
  };
}

function assertHasNumericScore(result) {
  if (!/Skor:\s*-?\d+\.\d{2}/i.test(result.scoreText)) {
    fail("sentiment must show numeric score", result);
  }
  if (!/-?\d+\.\d{2}/.test(result.reportScore)) {
    fail("report must show dedicated score stat", result);
  }
}

function assertSubstantiveTranscript(result, { minChars = 80 } = {}) {
  // Report panel includes transcript summary — require educational content words.
  const body = result.transcriptText || "";
  if (body.length < minChars) {
    fail("report transcript area too short / empty", {
      length: body.length,
      minChars,
    });
  }
  const markers = [
    /eğitim/i,
    /demo/i,
    /gizlilik|kvkk|anket|teşekkür|doğrulama|kayıt/i,
  ];
  const hit = markers.some((re) => re.test(body));
  if (!hit) {
    fail("transcript must contain substantive demo call-center Turkish", {
      sample: body.slice(0, 240),
    });
  }
  // Reject the old ultra-short filler-only pattern if it appears alone.
  if (
    /^Merhaba, görüşmeye başlıyoruz\. Konuşma kayda alınmaktadır\./i.test(
      body
    ) &&
    body.length < 200
  ) {
    fail("generic short filler transcript without expansion", result);
  }
}

function assertCallAnalysis(result, { requireSegments = false } = {}) {
  if (!result.callAnalysisVisible) {
    fail("report must show call analysis section for telephony upload", result);
  }
  if (!result.callSummary || result.callSummary.length < 40) {
    fail("call summary must be non-empty and useful", result);
  }
  if (!/PII|ALO 124|eğitim|demo/i.test(result.callSummary)) {
    fail("call summary must stay demo-safe (disclaimer / edu wording)", result);
  }
  if (!result.keyPhrases || result.keyPhrases.length < 3) {
    fail("key phrases must be present for telephony analysis", result);
  }
  if (requireSegments) {
    if (!result.segmentsVisible || result.segmentCount < 2) {
      fail("long call must show multiple duration segments", result);
    }
  }
}

function assertSentimentReflectsContent(result) {
  // Must not be an empty-feeling panel: emotion label present, and either
  // non-zero |score| OR a calm/engaged/memnun/nötr emotion with lexicon summary.
  const scoreMatch = result.scoreText.match(/-?\d+\.\d{2}/);
  const score = scoreMatch ? Number(scoreMatch[0]) : NaN;
  if (!Number.isFinite(score)) {
    fail("could not parse sentiment score", result);
  }
  if (!result.emotion || result.emotion.length < 2) {
    fail("emotion label missing", result);
  }
  // Blank-only failure mode: skor exactly 0.00 AND emotion nötr AND no call analysis.
  // With our richer mock, either score moves or call analysis carries insight.
  if (
    Math.abs(score) < 0.001 &&
    /nötr/i.test(result.emotion) &&
    !result.callAnalysisVisible
  ) {
    fail("useless skor 0.00 / nötr with no call analysis insight", result);
  }
}

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#lab-upload-zone").waitFor({
    state: "visible",
    timeout: 20000,
  });

  // 1) Short 8 kHz mono MP3 — skor + substantive short mock
  {
    const short = await uploadAndScore(
      FIXTURE_5S,
      "telephony-8khz-5s.mp3",
      "audio/mpeg"
    );
    console.log("short", {
      polarity: short.polarity,
      emotion: short.emotion,
      scoreText: short.scoreText,
      callAnalysisVisible: short.callAnalysisVisible,
      elapsedMs: short.elapsedMs,
    });
    assertHasNumericScore(short);
    assertSubstantiveTranscript(short, { minChars: 60 });
    assertCallAnalysis(short, { requireSegments: false });
    assertSentimentReflectsContent(short);
    if (short.elapsedMs > 15000) {
      fail("short upload too slow", short);
    }
  }

  // 2) Longer 8 kHz MP3 (~90s) — chunked phases + segments
  {
    const longer = await uploadAndScore(
      FIXTURE_90S,
      "telephony-8khz-90s.mp3",
      "audio/mpeg"
    );
    console.log("longer", {
      polarity: longer.polarity,
      emotion: longer.emotion,
      scoreText: longer.scoreText,
      segmentCount: longer.segmentCount,
      keyPhrases: longer.keyPhrases.slice(0, 80),
      elapsedMs: longer.elapsedMs,
    });
    assertHasNumericScore(longer);
    assertSubstantiveTranscript(longer, { minChars: 200 });
    assertCallAnalysis(longer, { requireSegments: true });
    assertSentimentReflectsContent(longer);
    if (longer.elapsedMs > 20000) {
      fail("90s upload too slow", longer);
    }
    writeFileSync(
      ".qa/telephony-scoring/long-90s-summary.txt",
      [
        longer.callSummary,
        "",
        longer.keyPhrases,
        "",
        `segments=${longer.segmentCount}`,
        `score=${longer.scoreText}`,
        `emotion=${longer.emotion}`,
      ].join("\n")
    );
  }

  // Web Speech mode must not hang ~12s on blob uploads
  const modes = page.locator('[role="radiogroup"] [role="radio"]');
  await modes.nth(1).click(); // Web Speech
  const web = await uploadAndScore(
    FIXTURE_5S,
    "telephony-webspeech-skip.mp3",
    "audio/mpeg"
  );
  assertHasNumericScore(web);
  assertCallAnalysis(web, { requireSegments: false });
  if (web.elapsedMs > 8000) {
    fail("Web Speech blob path hung", web);
  }

  await page.screenshot({
    path: ".qa/telephony-scoring/after-8khz-score.png",
    fullPage: true,
  });

  // 3) Optional: real user extracts when present on the machine
  if (existsSync(USER_30S)) {
    const u30 = await uploadAndScore(
      USER_30S,
      "user-sample-30s.wav",
      "audio/wav"
    );
    console.log("user-30s", {
      scoreText: u30.scoreText,
      emotion: u30.emotion,
      segmentCount: u30.segmentCount,
      callSummary: u30.callSummary.slice(0, 160),
    });
    assertHasNumericScore(u30);
    assertSubstantiveTranscript(u30);
    assertCallAnalysis(u30, { requireSegments: false });
    assertSentimentReflectsContent(u30);
  }
  if (existsSync(USER_FULL)) {
    const full = await uploadAndScore(
      USER_FULL,
      "user-sample.mp3",
      "audio/mpeg"
    );
    console.log("user-full", {
      scoreText: full.scoreText,
      emotion: full.emotion,
      segmentCount: full.segmentCount,
      keyPhrases: full.keyPhrases.slice(0, 120),
      callSummary: full.callSummary.slice(0, 200),
      elapsedMs: full.elapsedMs,
    });
    assertHasNumericScore(full);
    assertSubstantiveTranscript(full, { minChars: 400 });
    assertCallAnalysis(full, { requireSegments: true });
    assertSentimentReflectsContent(full);
    if (full.segmentCount < 8) {
      fail("8+ min call should yield many duration segments", full);
    }
    if (full.elapsedMs > 35000) {
      fail("full user sample too slow", full);
    }
    writeFileSync(
      ".qa/telephony-scoring/user-full-summary.txt",
      [
        full.callSummary,
        "",
        full.keyPhrases,
        "",
        `segments=${full.segmentCount}`,
        `score=${full.scoreText}`,
        `emotion=${full.emotion}`,
        `polarity=${full.polarity}`,
      ].join("\n")
    );
    await page.screenshot({
      path: ".qa/telephony-scoring/user-full-report.png",
      fullPage: true,
    });
  }

  console.log(
    "PASS: telephony / 8 kHz uploads show substantive transcript, call segments/phrases, and content-aware skorlama"
  );
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
}
