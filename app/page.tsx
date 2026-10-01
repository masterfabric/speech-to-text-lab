import { GraduationCap, Sparkles } from "lucide-react";
import { LabWorkspace } from "@/components/LabWorkspace";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <header className="border-b border-neutral-200 bg-white">
        <div className="accent-bar" aria-hidden />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/tuik-logo.svg"
              alt="TÜİK — Türkiye İstatistik Kurumu logosu"
              width={112}
              height={112}
              className="h-20 w-20 shrink-0 sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-sora)] text-xl font-semibold tracking-tight text-black sm:text-2xl">
                speech-to-text-lab
              </p>
              <div className="mt-2.5 max-w-2xl overflow-hidden rounded-xl border border-tuik/25 bg-gradient-to-r from-tuik-soft via-white to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="flex gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tuik text-white shadow-sm">
                    <GraduationCap className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-sora)] text-[11px] font-semibold uppercase tracking-[0.14em] text-tuik">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Eğitim laboratuvarı
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-800">
                      Bu eğitim laboratuvarı,{" "}
                      <strong className="font-semibold text-black">
                        yapay zeka dönüşümü
                      </strong>{" "}
                      ve{" "}
                      <strong className="font-semibold text-black">
                        yapay zeka okuryazarlığı
                      </strong>{" "}
                      eğitimi kapsamında oluşturulmuştur.
                    </p>
                  </div>
                </div>
                <div className="h-0.5 w-full bg-gradient-to-r from-tuik via-tuik/50 to-transparent" aria-hidden />
              </div>
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-neutral-600">
                TÜİK ALO 124 tarzı çağrı merkezi sesi → STT → duygu/sentiment → rapor.
                Yalnızca sentetik / demo ses; gerçek çağrı kaydı veya kişisel
                veri yoktur. Ücretli API kullanılmaz.
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <a
              href="/slides/index.html"
              className="rounded-lg border border-tuik/30 bg-tuik-soft px-3 py-2 font-medium text-tuik transition hover:border-tuik hover:bg-tuik-muted"
            >
              Slaytlar
            </a>
            <a
              href="https://www.tuik.gov.tr"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-800 transition hover:border-black"
            >
              TÜİK
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-[#fafafa] px-4 py-8 sm:px-6">
        <div className="mx-auto mb-6 max-w-7xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold text-amber-900">Gizlilik notu:</strong>{" "}
          Bu uygulama eğitim amaçlıdır. Gerçek ALO 124 kayıtları, vatandaş
          kişisel verileri veya CATI yanıtları yüklemeyin. Üretim ortamında KVKK
          ve kurum politikalarına uyun.
        </div>
        <div className="mx-auto mb-8 max-w-7xl rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600">
          <strong className="font-semibold text-black">
            Eğitim amaçlı kullanım:
          </strong>{" "}
          TÜİK logosu yalnızca bu laboratuvarın eğitim / demo bağlamında
          gösterilmektedir; resmi bir TÜİK ürünü veya onaylı yayın değildir. Logo
          kaynağı:{" "}
          <a
            href="https://www.tuik.gov.tr"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-tuik underline decoration-tuik/40 underline-offset-2 hover:text-tuik-deep"
          >
            tuik.gov.tr
          </a>
          .
        </div>
        <LabWorkspace />
      </main>
    </div>
  );
}
