/**
 * Playwright smoke: NLP / OpenCode tab runs on SAMPLE_CATALOG + MOCK_TRANSCRIPTS
 * without requiring prior Tek dosya STT.
 * Run (dev server on 43123):
 *   node scripts/verify-nlp-opencode-panel.mjs
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

  const tab = page.locator('[data-testid="tab-nlp-opencode"]');
  await tab.waitFor({ state: "visible", timeout: 15000 });
  await tab.click();

  const panel = page.locator('[data-testid="nlp-opencode-panel"]');
  await panel.waitFor({ state: "visible", timeout: 10000 });

  const bodyText = await panel.innerText();
  if (!bodyText.includes("speech-to-text-lab.report.v1")) {
    fail("schema version not shown in NLP panel", bodyText.slice(0, 400));
  }

  // Sample catalog must be present on the NLP tab (no Tek dosya required)
  const catalog = panel.locator('[data-testid="sample-catalog-row"]');
  await catalog.waitFor({ state: "visible", timeout: 10000 });

  // Wait for MOCK_TRANSCRIPTS-backed sample source (auto-select first catalog item)
  const sampleSource = page.locator('[data-testid="nlp-source-sample"]');
  await sampleSource.waitFor({ state: "visible", timeout: 15000 });
  const sourceText = await sampleSource.innerText();
  if (!sourceText.includes("MOCK_TRANSCRIPTS")) {
    fail("sample source banner missing MOCK_TRANSCRIPTS", sourceText);
  }

  const preview = page.locator('[data-testid="nlp-sample-transcript-preview"]');
  await preview.waitFor({ state: "visible", timeout: 5000 });
  const previewText = await preview.innerText();
  if (previewText.length < 20) {
    fail("transcript preview too short", previewText);
  }

  // Pick a second sample to prove selection works without upload / Tek dosya
  const options = catalog.locator('[role="option"]');
  const optionCount = await options.count();
  if (optionCount < 2) fail("expected at least 2 SAMPLE_CATALOG chips", optionCount);
  await options.nth(1).click();
  await sampleSource.waitFor({ state: "visible", timeout: 10000 });
  await preview.waitFor({ state: "visible", timeout: 10000 });

  const modelIdEl = page.locator('[data-testid="opencode-model-id"]');
  await modelIdEl.waitFor({ state: "visible", timeout: 10000 });
  const modelIdText = (await modelIdEl.innerText()).trim();
  if (!modelIdText.includes("muse-spark-1.3")) {
    fail("UI missing Muse Spark 1.3 model id", modelIdText);
  }
  console.log("documented model id:", modelIdText);

  const nlpToggle = page.locator("#toggle-browser-nlp");
  const ocToggle = page.locator("#toggle-opencode");
  await nlpToggle.waitFor({ state: "visible" });
  await ocToggle.waitFor({ state: "visible" });

  // Wait for status to settle so default-on can apply
  await page.waitForTimeout(800);

  if ((await nlpToggle.getAttribute("aria-checked")) !== "true") {
    await nlpToggle.click();
  }

  const statusProbe = await page.evaluate(async () => {
    const res = await fetch("/api/opencode/status");
    return { ok: res.ok, json: await res.json() };
  });
  if (statusProbe.json?.available) {
    if ((await ocToggle.getAttribute("aria-checked")) !== "true") {
      fail("OpenCode toggle should default ON when CLI present");
    }
    console.log("OpenCode default-on: ok");
  }

  // For browser-NLP-only smoke, turn OpenCode off (full OpenCode tested separately)
  if ((await ocToggle.getAttribute("aria-checked")) === "true") {
    await ocToggle.click();
  }

  // Must NOT need Tek dosya — run button enabled from sample alone
  const runBtn = page.locator('[data-testid="nlp-run-button"]');
  await runBtn.waitFor({ state: "visible" });
  if (await runBtn.isDisabled()) {
    fail("nlp-run-button disabled despite SAMPLE_CATALOG selection");
  }

  await runBtn.click();
  await page
    .locator('[data-testid="nlp-browser-result"]')
    .waitFor({ state: "visible", timeout: 20000 });

  const schemaPreview = page.locator('[data-testid="nlp-schema-preview"]');
  const details = page.locator("details").filter({ has: schemaPreview });
  if (await details.count()) {
    await details.first().evaluate((el) => {
      el.open = true;
    });
  }
  await schemaPreview.waitFor({ state: "visible", timeout: 5000 });
  const schemaText = await schemaPreview.innerText();
  if (!schemaText.includes('"schemaVersion": "speech-to-text-lab.report.v1"')) {
    fail("schema preview missing version field", schemaText.slice(0, 500));
  }
  if (!schemaText.includes('"nlp"')) {
    fail("schema preview missing nlp section", schemaText.slice(0, 500));
  }

  const status = await page.evaluate(async () => {
    const res = await fetch("/api/opencode/status");
    return { ok: res.ok, json: await res.json() };
  });
  console.log("opencode status:", JSON.stringify(status.json));
  if (!status.ok) fail("opencode status API not ok", status);
  if (typeof status.json.available !== "boolean") {
    fail("status.available missing", status.json);
  }
  if (typeof status.json.messageTr !== "string") {
    fail("status.messageTr missing", status.json);
  }
  if (typeof status.json.model !== "string" || !status.json.model.includes("muse-spark-1.3")) {
    fail("status.model missing Muse Spark 1.3 id", status.json);
  }


  // --- OpenCode live stream (when CLI available) ---
  if (statusProbe.json?.available) {
    // Re-enable OpenCode for stream smoke
    if ((await ocToggle.getAttribute("aria-checked")) !== "true") {
      await ocToggle.click();
    }
    const streamPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/opencode/analyze") &&
        r.request().method() === "POST",
      { timeout: 120000 }
    );
    await runBtn.click();

    // Terminal should appear while running (not blank)
    const terminal = page.locator('[data-testid="opencode-live-terminal"]');
    await terminal.waitFor({ state: "visible", timeout: 15000 });
    const progress = page.locator('[data-testid="opencode-progress"]');
    await progress.waitFor({ state: "visible", timeout: 15000 });
    const percentEl = page.locator('[data-testid="opencode-progress-percent"]');
    await percentEl.waitFor({ state: "visible", timeout: 15000 });
    const steps = page.locator('[data-testid="opencode-progress-steps"]');
    await steps.waitFor({ state: "visible", timeout: 15000 });
    const log = page.locator('[data-testid="opencode-stream-log"]');
    await log.waitFor({ state: "visible", timeout: 5000 });

    // Running indicator should appear (not blank OpenCode section)
    const runningPanel = page.locator('[data-testid="opencode-agent-running"]');
    await runningPanel.waitFor({ state: "visible", timeout: 20000 }).catch(() => {
      console.log("note: running panel not seen (fast finish?)");
    });

    const analyzeRes = await streamPromise;
    const ctype = analyzeRes.headers()["content-type"] || "";
    if (!ctype.includes("ndjson") && !ctype.includes("json")) {
      fail("analyze content-type not ndjson/json", ctype);
    }
    console.log("analyze content-type:", ctype);

    // Percent + steps should have been visible during stream
    const pctText = await percentEl.innerText();
    if (!pctText.includes("%")) fail("progress percent missing %", pctText);
    console.log("progress percent sample:", pctText);

    await page
      .locator('[data-testid="nlp-opencode-result"]')
      .waitFor({ state: "visible", timeout: 120000 });
    const agentText = await page.locator('[data-testid="nlp-opencode-result"]').innerText();
    if (/File not found/i.test(agentText)) {
      fail("Muse Spark File-not-found still present in agent UI", agentText.slice(0, 500));
    }
    if (!agentText.includes("ok") && !agentText.includes("error") && !agentText.includes("missing")) {
      fail("agent result missing status", agentText.slice(0, 400));
    }
    console.log("OpenCode stream UI smoke: ok (no File-not-found)");
  } else {
    console.log("OpenCode CLI unavailable — skipped live stream UI smoke");
  }

  // --- Archive + history (localStorage) ---
  const archiveBtn = page.locator('[data-testid="nlp-archive-case"]');
  await archiveBtn.waitFor({ state: "visible", timeout: 5000 });
  if (await archiveBtn.isDisabled()) {
    fail("archive button disabled after NLP run");
  }
  await archiveBtn.click();
  const notice = page.locator('[data-testid="nlp-archive-notice"]');
  await notice.waitFor({ state: "visible", timeout: 5000 });
  const noticeText = await notice.innerText();
  if (!/arşivlendi|Arşivden/i.test(noticeText)) {
    fail("archive notice missing expected text", noticeText);
  }

  const historyToggle = page.locator('[data-testid="nlp-history-toggle"]');
  await historyToggle.waitFor({ state: "visible" });
  // Sidebar should open after archive
  const historyList = page.locator('[data-testid="nlp-history-list"]');
  await historyList.waitFor({ state: "visible", timeout: 5000 });
  const historyItems = page.locator('[data-testid="nlp-history-item"]');
  const histCount = await historyItems.count();
  if (histCount < 1) fail("history list empty after archive", histCount);
  console.log("archive + history: ok (", histCount, "items)");

  // Reopen first case
  await historyItems.first().click();
  await page.locator('[data-testid="nlp-browser-result"]').waitFor({ state: "visible", timeout: 10000 });

  // Lucide/TÜİK: archive button label + tuik classes present
  const archiveLabel = await archiveBtn.innerText();
  if (!archiveLabel.includes("Bu vakayı arşivle")) {
    fail("archive button label missing", archiveLabel);
  }
  const panelHtml = await panel.innerHTML();
  if (!panelHtml.includes("text-tuik") && !panelHtml.includes("border-tuik")) {
    fail("TÜİK utility classes missing from panel markup");
  }

  // --- Action questions after Muse Spark (when CLI produced ok) ---
  if (statusProbe.json?.available) {
    const actions = page.locator('[data-testid="nlp-action-questions"]');
    const actionsVisible = await actions.isVisible().catch(() => false);
    if (actionsVisible) {
      const qs = page.locator('[data-testid="nlp-action-question"]');
      const qCount = await qs.count();
      if (qCount < 1) fail("action questions section empty");
      console.log("action questions visible:", qCount);
      // Click first generative/agent question — continues OpenCode (terminal kept)
      const streamPromise2 = page.waitForResponse(
        (r) =>
          r.url().includes("/api/opencode/analyze") &&
          r.request().method() === "POST",
        { timeout: 120000 }
      );
      await qs.first().click();
      const terminal2 = page.locator('[data-testid="opencode-live-terminal"]');
      await terminal2.waitFor({ state: "visible", timeout: 15000 });
      await page.locator('[data-testid="opencode-progress"]').waitFor({
        state: "visible",
        timeout: 15000,
      });
      const analyze2 = await streamPromise2;
      const reqBody = analyze2.request().postDataJSON();
      if (!reqBody?.followUpQuestion || typeof reqBody.followUpQuestion !== "string") {
        fail("follow-up analyze missing followUpQuestion", reqBody);
      }
      console.log("follow-up question sent:", reqBody.followUpQuestion.slice(0, 80));
      await page
        .locator('[data-testid="nlp-opencode-result"]')
        .waitFor({ state: "visible", timeout: 120000 });
      console.log("action-question continue OpenCode: ok (terminal kept)");
    } else {
      console.log("note: action questions not visible (agent status not ok?)");
    }
  }

  // localStorage key present
  const ls = await page.evaluate(() => {
    const raw = localStorage.getItem("stt-lab-archives-v1");
    if (!raw) return { ok: false };
    try {
      const arr = JSON.parse(raw);
      return { ok: Array.isArray(arr) && arr.length > 0, count: arr.length };
    } catch {
      return { ok: false };
    }
  });
  if (!ls.ok) fail("localStorage archives missing/empty", ls);
  console.log("localStorage archives:", ls.count);

  console.log("PASS: NLP / OpenCode panel works with SAMPLE_CATALOG sample (no Tek dosya STT)");
} finally {
  await browser.close();
}
