"use client";

import { ShieldCheck } from "lucide-react";
import { useConsent } from "@/components/ConsentProvider";
import { useLocale } from "@/components/LocaleProvider";

/** Small badge for header / chrome when onboarding consent is on file. */
export function ConsentApprovedBadge() {
  const { approved, consent } = useConsent();
  const { t } = useLocale();
  if (!approved || !consent) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200"
      title={consent.acceptedAt}
      data-testid="consent-approved-badge"
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {t("gate.approvedBadge")}
    </span>
  );
}
