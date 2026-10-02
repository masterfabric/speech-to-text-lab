/**
 * Direct unit check of lib/consent.ts local bypass (no Next server).
 *
 *   NODE_ENV=development npx tsx scripts/verify-local-submit-unit.mjs
 */
import {
  shouldBypassOnboardingGate,
  submitOnboardingForm,
} from "../lib/consent.ts";

function fail(msg, extra) {
  console.error("FAIL:", msg);
  if (extra) console.error(extra);
  process.exit(1);
}

const originalFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = async (url) => {
  fetchCalls += 1;
  throw new Error(`unexpected fetch: ${url}`);
};

delete process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

// Force development semantics for the local half of this check.
process.env.NODE_ENV = "development";

if (!shouldBypassOnboardingGate()) {
  fail("shouldBypassOnboardingGate() must be true when NODE_ENV=development");
}

fetchCalls = 0;
const localResult = await submitOnboardingForm({
  firstName: "Local",
  lastName: "Dev",
  reason: "skip web3forms",
  consent: true,
  locale: "tr",
});

if (!localResult.ok) {
  fail("development submit must succeed without access key", localResult);
}
if (fetchCalls !== 0) {
  fail("development submit must not call fetch/Web3Forms", { fetchCalls });
}
console.log("OK: development submit skips Web3Forms");

const missing = await submitOnboardingForm({
  firstName: "",
  lastName: "Dev",
  reason: "x",
  consent: true,
});
if (missing.ok || /UUID|access_key|WEB3FORMS/i.test(missing.error || "")) {
  fail("empty fields should fail for form reasons, not access key", missing);
}
console.log("OK: local form validation still applies without key errors");

// Production path: no bypass, missing key → error, no fetch.
process.env.NODE_ENV = "production";
if (typeof window !== "undefined") {
  fail("unexpected window in node unit");
}
if (shouldBypassOnboardingGate()) {
  fail("shouldBypassOnboardingGate() must be false in production node");
}

fetchCalls = 0;
const prodMissing = await submitOnboardingForm({
  firstName: "Prod",
  lastName: "User",
  reason: "needs key",
  consent: true,
});
if (prodMissing.ok) fail("production without key must fail", prodMissing);
if (!/WEB3FORMS|yapılandırılmamış/i.test(prodMissing.error || "")) {
  fail("production missing key should mention WEB3FORMS", prodMissing);
}
if (fetchCalls !== 0) {
  fail("production missing key must not fetch", { fetchCalls });
}

process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY = "not-a-uuid-placeholder";
fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  return {
    ok: false,
    status: 400,
    json: async () => ({
      success: false,
      message: "Invalid form_id/access_key format. Must be a valid UUID.",
    }),
  };
};
const prodBadKey = await submitOnboardingForm({
  firstName: "Prod",
  lastName: "User",
  reason: "bad key",
  consent: true,
});
if (prodBadKey.ok) fail("production with invalid key must fail", prodBadKey);
if (fetchCalls !== 1) {
  fail("production with a key set should attempt Web3Forms", { fetchCalls });
}
if (!/Invalid form_id|UUID/i.test(prodBadKey.error || "")) {
  fail("production should surface Web3Forms UUID error", prodBadKey);
}
console.log("OK: production still requires key and calls Web3Forms");

globalThis.fetch = originalFetch;
console.log("PASS: local submit unit");
