import type { Metadata } from "next";
import { JetBrains_Mono, Sora, Source_Sans_3 } from "next/font/google";
import {
  ExternalLink,
  GraduationCap,
  Presentation,
} from "lucide-react";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "speech-to-text-lab · ALO 124 STT Laboratuvarı",
  description:
    "TÜİK ALO 124 tarzı çağrı merkezi sesi için eğitim amaçlı speech-to-text laboratuvarı. Sentetik demo sesler; gerçek kişisel veri yoktur.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${sora.variable} ${sourceSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-black">
        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="mt-auto border-t-2 border-tuik bg-white">
          <div className="accent-bar" aria-hidden />

          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8 lg:gap-12 md:items-start">
              {/* Brand */}
              <section className="flex flex-col gap-4" aria-label="Marka">
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/tuik-logo.svg"
                    alt="TÜİK — Türkiye İstatistik Kurumu logosu"
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
                      Eğitmen mühendis
                    </p>
                    <p className="mt-1 text-xs leading-snug text-black/60">
                      speech-to-text-lab · STT eğitim laboratuvarı
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
                  yazılım şirketi kaynaklarıyla geliştirilmiştir.
                </p>
              </section>

              {/* Single educational disclaimer */}
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
                    Eğitim amaçlı kullanım
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-black/70">
                  ALO 124 resmi bir ürün değildir; TÜİK süreçlerini öğretmek için
                  tasarlanmıştır. Logo yalnızca eğitim / demo bağlamında
                  gösterilir — resmi onay veya ürün iddiası taşımaz. Sentetik /
                  demo ses kullanılır; gerçek kişisel veri yoktur.
                </p>
              </section>

              {/* Actions — one CTA + quiet links */}
              <section className="flex flex-col gap-4" aria-label="Hızlı erişim">
                <div>
                  <p className="font-[family-name:var(--font-sora)] text-sm font-semibold tracking-tight text-black">
                    Laboratuvarı deneyin
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-black/60">
                    Sentetik veya demo bir ses seçin; STT, duygu ve rapor
                    akışını tek alanda test edin.
                  </p>
                </div>


                <nav
                  aria-label="Alt gezinme"
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/8 pt-4 text-sm"
                >
                  <a
                    href="/slides/index.html"
                    className="inline-flex items-center gap-1.5 font-medium text-tuik transition hover:text-tuik-deep"
                  >
                    <Presentation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Slaytlar
                  </a>
                  <a
                    href="https://www.tuik.gov.tr"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-black/65 transition hover:text-black"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    TÜİK
                  </a>
                </nav>
              </section>
            </div>
          </div>

          <div className="border-t border-black/10 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3.5 text-center text-[11px] text-black/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
              <span>© speech-to-text-lab · eğitim laboratuvarı</span>
              <span className="text-tuik/75">
                Logo © Türkiye İstatistik Kurumu · eğitim amaçlı kullanım
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
