"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CONSENT_VERSION,
  localDevConsentRecord,
  readConsent,
  shouldBypassOnboardingGate,
  submitOnboardingForm,
  writeConsent,
  type ConsentRecord,
  type OnboardingFormInput,
  type OnboardingSubmitResult,
} from "@/lib/consent";
import { useLocale } from "@/components/LocaleProvider";

type ConsentContextValue = {
  /** undefined while hydrating from localStorage */
  consent: ConsentRecord | null | undefined;
  approved: boolean;
  /** Persist locally after a successful (or local-only) accept. */
  markApproved: (fields: {
    firstName: string;
    lastName: string;
    reason: string;
  }) => void;
  /** POST form to Web3Forms (browser) then mark approved on success.
   *  Local/dev skips Web3Forms and marks approved immediately. */
  submitAndApprove: (
    fields: Omit<OnboardingFormInput, "locale" | "consent"> & {
      consent: boolean;
    }
  ) => Promise<OnboardingSubmitResult>;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [consent, setConsent] = useState<ConsentRecord | null | undefined>(
    undefined
  );

  useEffect(() => {
    // Local/dev: treat as already consented (in-memory only) so LabConsentGate
    // opens the main lab without /onboarding. Production still reads localStorage.
    if (shouldBypassOnboardingGate()) {
      setConsent(localDevConsentRecord(locale));
      return;
    }
    setConsent(readConsent());
    // Hydrate once on mount (locale only seeds the local-dev bypass record).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  const markApproved = useCallback(
    (fields: { firstName: string; lastName: string; reason: string }) => {
      const record: ConsentRecord = {
        version: CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
        locale,
        firstName: fields.firstName.trim(),
        lastName: fields.lastName.trim(),
        reason: fields.reason.trim(),
      };
      writeConsent(record);
      setConsent(record);
    },
    [locale]
  );

  const submitAndApprove = useCallback(
    async (
      fields: Omit<OnboardingFormInput, "locale" | "consent"> & {
        consent: boolean;
      }
    ): Promise<OnboardingSubmitResult> => {
      const result = await submitOnboardingForm({
        ...fields,
        locale,
      });
      if (result.ok) {
        markApproved({
          firstName: fields.firstName,
          lastName: fields.lastName,
          reason: fields.reason,
        });
      }
      return result;
    },
    [locale, markApproved]
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      approved: Boolean(consent),
      markApproved,
      submitAndApprove,
    }),
    [consent, markApproved, submitAndApprove]
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}
