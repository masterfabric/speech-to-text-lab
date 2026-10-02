/**
 * Onboarding / KVKK consent persistence (localStorage).
 * Remote submit goes from the browser → Web3Forms (public access_key).
 */

export const CONSENT_STORAGE_KEY = "stt-lab-consent-v1";
export const CONSENT_VERSION = 1 as const;

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

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

/**
 * Local `next dev` / localhost: skip splash → onboarding → Web3Forms.
 * Production (e.g. Vercel / tuik.masterfabric.co) must keep the first-visit flow.
 * Client-only — call after mount (window available for hostname check).
 */
export function shouldBypassOnboardingGate(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** In-memory consent used when the local/dev gate is bypassed (not written to localStorage). */
export function localDevConsentRecord(locale?: string): ConsentRecord {
  return {
    version: CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    locale,
  };
}

export type OnboardingSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

function asNonEmptyString(value: string, max: number): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Submit onboarding from the browser directly to Web3Forms.
 * Free plan requires client-side POST (server IPs need Pro).
 * Uses NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY (domain-restricted public key).
 * Local/dev: never calls Web3Forms and does not require a UUID access key.
 */
export async function submitOnboardingForm(
  input: OnboardingFormInput
): Promise<OnboardingSubmitResult> {
  const firstName = asNonEmptyString(input.firstName, 120);
  const lastName = asNonEmptyString(input.lastName, 120);
  const reason = asNonEmptyString(input.reason, 4000);
  const locale = asNonEmptyString(input.locale ?? "tr", 16) ?? "tr";

  if (!firstName || !lastName || !reason) {
    return {
      ok: false,
      error: "firstName, lastName ve reason zorunludur.",
    };
  }
  if (!input.consent) {
    return {
      ok: false,
      error: "KVKK / yerel veri onayı zorunludur.",
    };
  }

  // Local next dev / localhost: accept without access_key or remote submit.
  if (shouldBypassOnboardingGate()) {
    return { ok: true };
  }

  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY?.trim();
  if (!accessKey) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY yapılandırılmamış (.env.local / Vercel).",
    };
  }

  const payload = {
    access_key: accessKey,
    subject: "speech-to-text-lab onboarding",
    from_name: "speech-to-text-lab",
    name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    message: reason,
    reason,
    kvkk_consent: "yes",
    locale,
    botcheck: false,
  };

  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      body?: { message?: string };
    };
    if (!res.ok || data.success === false) {
      return {
        ok: false,
        error:
          data.message ||
          data.body?.message ||
          `Submit failed (${res.status})`,
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
