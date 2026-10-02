/**
 * Onboarding / KVKK consent persistence (localStorage).
 * Remote submit goes through /api/onboarding → Web3Forms (server-side access_key).
 */

export const CONSENT_STORAGE_KEY = "stt-lab-consent-v1";
export const CONSENT_VERSION = 1 as const;

export type ConsentRecord = {
  version: typeof CONSENT_VERSION;
  /** ISO timestamp when the user accepted KVKK / correct-use terms. */
  acceptedAt: string;
  /** Locale active at acceptance (chrome UI). */
  locale?: string;
  firstName?: string;
  lastName?: string;
  /** Why they use the lab (neden). */
  reason?: string;
};

export type OnboardingFormInput = {
  firstName: string;
  lastName: string;
  reason: string;
  /** Must be true — KVKK / local-data consent. */
  consent: boolean;
  locale?: string;
};

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (
      parsed &&
      parsed.version === CONSENT_VERSION &&
      typeof parsed.acceptedAt === "string"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeConsent(record: ConsentRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type OnboardingSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Submit onboarding via our Next.js API route, which POSTs to Web3Forms
 * with WEB3FORMS_ACCESS_KEY (server-only). Do not put the key in client code.
 */
export async function submitOnboardingForm(
  input: OnboardingFormInput
): Promise<OnboardingSubmitResult> {
  try {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
    };
    if (!res.ok || !data.success) {
      return {
        ok: false,
        error: data.message || `Submit failed (${res.status})`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
