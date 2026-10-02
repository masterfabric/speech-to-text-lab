"use client";

import { ExternalLink, GraduationCap, Presentation } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useLocale } from "@/components/LocaleProvider";

function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t("footer.langAria")}
      className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 sm:justify-end"
    >
      {LOCALES.map((code, index) => {
        const active = locale === code;
        return (
          <span key={code} className="inline-flex items-center">
            {index > 0 ? (
              <span className="mx-1 select-none text-black/25" aria-hidden>
                ·
              </span>
            ) : null}
            <button
              type="button"
              aria-pressed={active}
              onClick={() => setLocale(code as Locale)}
              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tuik/40 ${
                active
                  ? "bg-tuik text-white"
                  : "text-black/55 hover:bg-tuik-soft hover:text-tuik"
              }`}
            >
              {LOCALE_LABELS[code]}
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="mt-auto border-t-2 border-tuik bg-white">
      <div className="accent-bar" aria-hidden />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:items-start md:gap-8 lg:gap-12">
          <section className="flex flex-col gap-4" aria-label={t("footer.ariaBrand")}>
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/tuik-logo.svg"
                alt={t("header.logoAlt")}
                width={80}
                height={80}
                className="h-16 w-16 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]"
              />
              <div className="min-w-0 pt-1">
                <p className="font-[family-name:var(--font-sora)] text-base font-bold tracking-tight text-black sm:text-lg">
                  <a
                    href="https://linkedin.com/in/gurkanfikretgunak"
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-tuik focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tuik/40"
                  >
                    Gürkan Fikret Günak
                  </a>
                </p>
                <p className="mt-1.5 text-sm font-medium leading-snug text-tuik">
                  {t("footer.brandRole")}
                </p>
                <p className="mt-1 text-xs leading-snug text-black/60">
                  {t("footer.brandTagline")}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-black/55">
              <a
                href="https://masterfabric.co"
                target="_blank"
                rel="noreferrer"
                className="footer-credit-link"
              >
                <strong>MasterFabric</strong>
              </a>{" "}
              {t("footer.creditAfter")}
            </p>
          </section>

          <section
            className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-[#fafafa] p-5 sm:p-6"
            aria-labelledby="footer-edu-heading"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tuik-soft text-tuik">
                <GraduationCap className="h-4 w-4" aria-hidden />
              </span>
              <h2
                id="footer-edu-heading"
                className="font-[family-name:var(--font-sora)] text-sm font-semibold tracking-tight text-black"
              >
                {t("footer.eduHeading")}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-black/70">
              {t("footer.eduBody")}
            </p>
          </section>

          <section
            className="flex flex-col gap-4"
            aria-label={t("footer.ariaQuick")}
          >
            <div>
              <p className="font-[family-name:var(--font-sora)] text-sm font-semibold tracking-tight text-black">
                {t("footer.tryHeading")}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-black/60">
                {t("footer.tryBody")}
              </p>
            </div>

            <nav
              aria-label={t("footer.ariaNav")}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/8 pt-4 text-sm"
            >
              <a
                href="/slides/index.html"
                className="inline-flex items-center gap-1.5 font-medium text-tuik transition hover:text-tuik-deep"
              >
                <Presentation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("footer.navSlides")}
              </a>
              <a
                href="https://www.tuik.gov.tr"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-black/65 transition hover:text-black"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("footer.navTuik")}
              </a>
            </nav>
          </section>
        </div>
      </div>

      <div className="border-t border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-3.5 text-[11px] text-black/55 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <span className="text-center sm:text-start">{t("footer.copy")}</span>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-center text-tuik/75 sm:text-end">
              {t("footer.logoNote")}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
