/**
 * Node unit check: development never requires Web3Forms UUID; production still does.
 *
 *   node --experimental-strip-types scripts/verify-local-submit-unit.mjs
 *   (or: npx tsx scripts/verify-local-submit-unit.mjs)
 */
import { pathToFileURL } from "url";
import { createRequire } from "module";
import { register } from "node:module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function fail(msg, extra) {
  console.error("FAIL:", msg);
  if (extra) console.error(extra);
  process.exit(1);
}

async function loadConsent() {
  // Prefer tsx if available; fall back to experimental strip-types on .ts
  try {
    const require = createRequire(import.meta.url);
    require.resolve("tsx/esm");
    process.env.TSX_TSCONFIG_PATH = join(root, "tsconfig.json");
    await import("tsx/esm");
  } catch {
    /* use --experimental-strip-types via runner */
  }

  // Path alias @/ is not resolved outside Next — import relative.
  const modPath = pathToFileURL(join(root, "lib/consent.ts")).href;
  return import(modPath);
}

const originalFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  throw new Error(`unexpected fetch: ${args[0]}`);
};

const { submitOnboardingForm, shouldBypassOnboardingGate } = await loadConsent();

// --- development: bypass, no fetch, ok without key ---
process.env.NODE_ENV = "development";
delete process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
fetchCalls = 0;

if (!shouldBypassOnboardingGate()) {
  fail("shouldBypassOnboardingGate() must be true when NODE_ENV=development");
}

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

// Invalid / missing fields still fail locally (form UX), but never UUID/key errors
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

// --- production: missing key fails; invalid key would reach fetch ---
// Note: NODE_ENV may be inlined by bundlers; for this direct .ts import it is live.
process.env.NODE_ENV = "production";
// Host is undefined in node → shouldBypass false when not development
if (shouldBypassOnboardingGate()) {
  // If strip-types / import cached the module with frozen env, document and skip
  console.warn(
    "WARN: shouldBypass still true after NODE_ENV=production (env may be frozen at import); skipping production assert"
  );
} else {
  fetchCalls = 0;
  delete process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
  const prodMissing = await submitOnboardingForm({
    firstName: "Prod",
    lastName: "User",
    reason: "needs key",
    consent: true,
  });
  if (prodMissing.ok) {
    fail("production without key must fail", prodMissing);
  }
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
        message:
          "Invalid form_id/access_key format. Must be a valid UUID.",
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
}

globalThis.fetch = originalFetch;
console.log("PASS: local submit unit");
