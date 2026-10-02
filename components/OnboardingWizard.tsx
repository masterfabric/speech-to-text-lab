"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  AudioWaveform,
  BookOpen,
  Check,
  Database,
  FileAudio,
  GraduationCap,
  Languages,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useConsent } from "@/components/ConsentProvider";
import { useLocale } from "@/components/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n";

type Step = "splash" | "onboarding" | "form";

const FEATURE_KEYS: TranslationKey[] = [
  "gate.feature.stt",
  "gate.feature.sentiment",
  "gate.feature.report",
  "gate.feature.i18n",
  "gate.feature.local",
];

const ONBOARD_KEYS: TranslationKey[] = [
  "gate.onboard.1",
  "gate.onboard.2",
  "gate.onboard.3",
];

const FEATURE_ICONS = [FileAudio, Sparkles, BookOpen, Languages, Database] as const;

export function OnboardingWizard() {
  const { submitAndApprove } = useConsent();
  const { t } = useLocale();
  const [step, setStep] = useState<Step>("splash");
  const [splashReady, setSplashReady] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSplashReady(false);
    const id = window.setTimeout(() => setSplashReady(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !reason.trim()) {
      setError(t("gate.formRequired"));
      return;
    }
    if (!checked) {
      setError(t("gate.formConsentRequired"));
      return;
    }
    setSubmitting(true);
    const result = await submitAndApprove({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      reason: reason.trim(),
      consent: true,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || t("gate.formSubmitError"));
    }
    // On success LabConsentGate redirects to /
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
      <div className="overflow-hidden rounded-2xl border border-tuik/30 bg-white shadow-xl shadow-tuik/10">
        <div className="accent-bar" aria-hidden />

        <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/tuik-logo.svg"
            alt={t("header.logoAlt")}
            width={88}
            height={88}
            className="h-20 w-20"
          />
          <p className="mt-3 font-[family-name:var(--font-sora)] text-lg font-semibold tracking-tight text-black">
            speech-to-text-lab
          </p>
          <p className="mt-1 text-xs text-tuik">{t("gate.subtitle")}</p>
        </div>

        <div className="space-y-5 px-6 pb-7 pt-2">
          {step === "splash" ? (
            <>
              <h1 className="font-[family-name:var(--font-sora)] text-base font-semibold text-black">
                {t("gate.splashTitle")}
              </h1>
              <ul className="space-y-2.5 text-start">
                {FEATURE_KEYS.map((key, i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <li
                      key={key}
                      className="flex items-start gap-3 rounded-xl border border-black/8 bg-[#fafafa] px-3 py-2.5"
                    >
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tuik-soft text-tuik">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-sm leading-snug text-black/80">
                        {t(key)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-center gap-2 rounded-lg border border-tuik/20 bg-tuik-soft/50 px-3 py-2 text-xs text-tuik-deep">
                {splashReady ? (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("gate.splashReady")}
                  </>
                ) : (
                  <>
                    <Loader2
                      className="h-3.5 w-3.5 shrink-0 animate-spin"
                      aria-hidden
                    />
                    {t("gate.splashLoading")}
                  </>
                )}
              </div>
              <button
                type="button"
                disabled={!splashReady}
                onClick={() => setStep("onboarding")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tuik px-4 py-3 text-sm font-semibold text-white transition hover:bg-tuik-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("gate.continue")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </>
          ) : null}

          {step === "onboarding" ? (
            <>
              <h1 className="font-[family-name:var(--font-sora)] text-base font-semibold text-black">
                {t("gate.onboardTitle")}
              </h1>
              <ol className="space-y-3 text-start">
                {ONBOARD_KEYS.map((key, i) => (
                  <li
                    key={key}
                    className="flex gap-3 rounded-xl border border-black/8 bg-[#fafafa] px-3 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tuik text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-black/80">
                      {t(key)}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("splash")}
                  className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:border-black/30"
                >
                  {t("gate.back")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-tuik px-4 py-3 text-sm font-semibold text-white transition hover:bg-tuik-dim"
                >
                  {t("gate.continue")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </>
          ) : null}

          {step === "form" ? (
            <form className="space-y-4 text-start" onSubmit={(e) => void onSubmit(e)}>
              <h1 className="flex items-center gap-2 font-[family-name:var(--font-sora)] text-base font-semibold text-black">
                <ShieldCheck className="h-5 w-5 text-tuik" aria-hidden />
                {t("gate.consentTitle")}
              </h1>

              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950">
                <p className="flex gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
                  <span>{t("gate.consentBody")}</span>
                </p>
                <p className="flex gap-2">
                  <GraduationCap
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                    aria-hidden
                  />
                  <span>{t("gate.consentLocal")}</span>
                </p>
                <p className="flex gap-2">
                  <AudioWaveform
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                    aria-hidden
                  />
                  <span>{t("gate.consentDemo")}</span>
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-black/80">
                    {t("gate.formFirstName")}
                  </span>
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none ring-tuik/30 focus:border-tuik focus:ring-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-black/80">
                    {t("gate.formLastName")}
                  </span>
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none ring-tuik/30 focus:border-tuik focus:ring-2"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-black/80">
                  {t("gate.formReason")}
                </span>
                <textarea
                  name="reason"
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none ring-tuik/30 focus:border-tuik focus:ring-2"
                  placeholder={t("gate.formReasonPlaceholder")}
                />
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-white px-3 py-3 text-sm text-black/80">
                <input
                  type="checkbox"
                  name="consent"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-black/30 accent-[#ae1615]"
                  required
                />
                <span>{t("gate.consentCheck")}</span>
              </label>

              {error ? (
                <p
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep("onboarding")}
                  className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:border-black/30 disabled:opacity-50"
                >
                  {t("gate.back")}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !checked}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-tuik px-4 py-3 text-sm font-semibold text-white transition hover:bg-tuik-dim disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  {submitting ? t("gate.formSubmitting") : t("gate.accept")}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
