"use client";

import { LabWorkspace } from "@/components/LabWorkspace";
import { ConsentApprovedBadge } from "@/components/ConsentApprovedBadge";
import { useLocale } from "@/components/LocaleProvider";

export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-full flex-col bg-white">
      <header className="border-b border-neutral-200 bg-white">
        <div className="accent-bar" aria-hidden />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/tuik-logo.svg"
              alt={t("header.logoAlt")}
              width={112}
              height={112}
              className="h-20 w-20 shrink-0 sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-[family-name:var(--font-sora)] text-xl font-semibold tracking-tight text-black sm:text-2xl">
                  speech-to-text-lab
                </p>
                <ConsentApprovedBadge />
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-snug text-neutral-500">
                {t("header.eduLine")}
              </p>
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-neutral-600">
                {t("header.description")}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <a
              href="/slides/index.html"
              className="rounded-lg border border-tuik/30 bg-tuik-soft px-3 py-2 font-medium text-tuik transition hover:border-tuik hover:bg-tuik-muted"
            >
              {t("header.nav.slides")}
            </a>
            <a
              href="https://www.tuik.gov.tr"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-800 transition hover:border-black"
            >
              {t("header.nav.tuik")}
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-[#fafafa] px-4 py-8 sm:px-6">
        <div className="mx-auto mb-6 max-w-7xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold text-amber-900">
            {t("page.privacyTitle")}
          </strong>{" "}
          {t("page.privacyBody")}
        </div>
        <div className="mx-auto mb-8 max-w-7xl rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600">
          <strong className="font-semibold text-black">
            {t("page.eduUseTitle")}
          </strong>{" "}
          {t("page.eduUseBody")}{" "}
          <a
            href="https://www.tuik.gov.tr"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-tuik underline decoration-tuik/40 underline-offset-2 hover:text-tuik-deep"
          >
            {t("page.eduUseSource")}
          </a>
          .
        </div>
        <LabWorkspace />
      </main>
    </div>
  );
}
