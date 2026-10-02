/**
 * Unit-level check: long telephony mock yields substantive transcript +
 * call analysis (no browser). Run: npx tsx scripts/verify-telephony-long-analysis.mjs
 */
import assert from "node:assert/strict";
import { runLabPipeline } from "../lib/stt-pipeline.ts";
import { analyzeSentiment } from "../lib/sentiment.ts";
import { buildTelephonyMockTranscript } from "../lib/telephony-analysis.ts";

const long = buildTelephonyMockTranscript(503);
assert.ok(long.isLongForm, "503s must be long-form");
assert.ok(long.segments.length >= 8, `expected many segments, got ${long.segments.length}`);
assert.ok(long.text.length > 400, "long transcript text too short");
assert.match(long.text, /eğitim|demo|gizlilik|anket/i);
assert.doesNotMatch(long.text, /vatandaş kimlik numarası|TC kimlik/i);

const sentiment = analyzeSentiment(long.text);
assert.ok(Number.isFinite(sentiment.score), "score must be numeric");
assert.ok(sentiment.summaryTr.length > 40, "sentiment summary required");
assert.ok(
  sentiment.positiveHits.length + sentiment.negativeHits.length > 0,
  "lexicon hits required for speech-like transcript"
);
// Must not be the useless blank case alone
assert.ok(
  Math.abs(sentiment.score) > 0.001 ||
    sentiment.emotion !== "nötr" ||
    sentiment.positiveHits.length > 0,
  "sentiment must reflect content beyond blank 0.00"
);

const lab = await runLabPipeline({
  fileName: "user-sample.mp3",
  durationSec: 503.424,
  sampleRate: 8000,
  mode: "mock",
});

assert.ok(lab.transcript.text.length > 400);
assert.ok(lab.callAnalysis, "callAnalysis required for long unknown upload");
assert.ok(lab.callAnalysis.segmentCount >= 8);
assert.ok(lab.callAnalysis.keyPhrases.length >= 3);
assert.ok(lab.callAnalysis.summaryTr.includes("dk") || lab.callAnalysis.summaryTr.includes("dilim"));
assert.match(lab.callAnalysis.disclaimerTr, /PII|ALO 124/i);
assert.ok(lab.sentiment);
assert.ok(Number.isFinite(lab.sentiment.score));

const short = await runLabPipeline({
  fileName: "telephony-8khz-5s.mp3",
  durationSec: 5,
  sampleRate: 8000,
  mode: "mock",
});
assert.ok(short.callAnalysis, "unknown short upload still gets callAnalysis");
assert.ok(short.transcript.text.length > 40);
assert.match(short.transcript.text, /eğitim|teşekkür|gizlilik/i);

console.log("PASS verify-telephony-long-analysis", {
  longSegments: lab.callAnalysis.segmentCount,
  longScore: lab.sentiment.score,
  longEmotion: lab.sentiment.emotion,
  longPolarity: lab.sentiment.label,
  keyPhrases: lab.callAnalysis.keyPhrases.slice(0, 6),
  shortPolarity: short.sentiment.label,
});
