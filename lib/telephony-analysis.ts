/**
 * Educational long-call / telephony analysis helpers.
 * Produces substantive chunked demo transcripts + duration segments for
 * multi-minute 8 kHz uploads — never claims real ALO 124 / citizen PII.
 */
import { analyzeBrowserNlp, type BrowserNlpResult } from "./browser-nlp";
import { formatDuration } from "./metrics";

/** Target length of each educational call segment (seconds). */
export const TELEPHONY_SEGMENT_SEC = 45;

/** Treat uploads longer than this as multi-minute / long-form. */
export const LONG_CALL_THRESHOLD_SEC = 55;

export type CallSegment = {
  index: number;
  startSec: number;
  endSec: number;
  label: string;
  text: string;
  keyPhrases: string[];
};

export type CallAnalysis = {
  isLongForm: boolean;
  segmentCount: number;
  segments: CallSegment[];
  summaryTr: string;
  keyPhrases: string[];
  nlp: BrowserNlpResult;
  disclaimerTr: string;
};

/**
 * Demo-safe phase scripts for unknown telephony uploads.
 * Fictional call-center flow only — no real citizen data.
 */
const PHASE_SCRIPTS: {
  label: string;
  text: string;
  keyPhrases: string[];
}[] = [
  {
    label: "Açılış ve kayıt bilgilendirmesi",
    text:
      "Merhaba, eğitim amaçlı çağrı merkezi demosuna hoş geldiniz. Konuşma kayda alınmaktadır. " +
      "Bugün yalnızca örnek bir istatistik bilgi talebi üzerinden ilerleyeceğiz. Lütfen mikrofonunuzu kontrol edin.",
    keyPhrases: ["eğitim demosu", "kayıt bilgilendirmesi", "istatistik bilgi"],
  },
  {
    label: "Amaç ve konu çerçevesi",
    text:
      "Aramanın amacı adres ve iletişim bilgilerinin doğrulanmasıdır. Gerçek kimlik veya vatandaş " +
      "kişisel verisi kullanılmaz; tüm örnekler sentetiktir. Yardımcı olabilirim, hangi konuda bilgi almak istiyorsunuz?",
    keyPhrases: ["adres doğrulama", "sentetik örnek", "bilgi talebi"],
  },
  {
    label: "Gizlilik / KVKK bilgilendirmesi",
    text:
      "Gizlilik uyarısı: Bu laboratuvar kaydı eğitim içindir. KVKK kapsamında gerçek PII toplanmaz. " +
      "Onayınız yalnızca demo senaryosu içindir. İsterseniz işlemi iptal edebilirsiniz.",
    keyPhrases: ["gizlilik uyarısı", "KVKK", "demo onayı"],
  },
  {
    label: "Örnek kimlik / adres doğrulama",
    text:
      "Demo kayıt numarası olarak DEMO-124-0001 kullanalım. Örnek adres: Atatürk Caddesi numarası elli iki, " +
      "Ankara. Teyit için lütfen evet veya hayır deyin. Teşekkür ederiz, kayıt güncellendi.",
    keyPhrases: ["DEMO-124-0001", "örnek adres", "teyit"],
  },
  {
    label: "Anket / veri soruları",
    text:
      "Kısa bir anket bölümüne geçiyoruz. Son bir ay içinde resmi istatistik yayınına baktınız mı? " +
      "Veri kaynağı olarak TÜİK sitesi yeterli mi, yoksa ek bilgi mi istiyorsunuz? Cevabınız kayda alınır.",
    keyPhrases: ["anket", "istatistik yayını", "veri kaynağı"],
  },
  {
    label: "Bekleme / aktarma",
    text:
      "Bir dakika bekletiyorum, ilgili birime aktarıyorum. Müzik sonrası görüşme devam edecek. " +
      "Bekleme sırasında lütfen hattı kapatmayın. Operatör doğrulama adımlarını özetleyecek.",
    keyPhrases: ["bekletme", "aktarma", "hat açık"],
  },
  {
    label: "Netleştirme ve sorun dinleme",
    text:
      "Anladığım kadarıyla erişimde küçük bir sorun yaşadınız. Bağlantı hatası mı, yoksa yanlış menü mü? " +
      "Lütfen sorunu tekrarlayın. Not aldım: gecikme ve anlaşılmayan menü seçenekleri.",
    keyPhrases: ["erişim sorunu", "bağlantı hatası", "gecikme"],
  },
  {
    label: "Çözüm ve yönlendirme",
    text:
      "Çözüm olarak örnek portal bağlantısını ve randevu slotunu paylaşıyorum. İşlem sıraya alınmıştır. " +
      "İsterseniz yarın için bir bilgilendirme görüşmesi planlayabiliriz. Tamam, kaydı güncelliyorum.",
    keyPhrases: ["çözüm", "randevu", "işlem sırası"],
  },
  {
    label: "Ek bilgi ve özet",
    text:
      "Özet: adres teyidi tamam, anket cevapları alındı, erişim sorunu için yönlendirme yapıldı. " +
      "Ek istatistik bilgi paketini e-posta yerine yerel rapora yazıyoruz. Gerçek ALO yüz yirmi dört kaydı değildir.",
    keyPhrases: ["özet", "adres teyidi", "yerel rapor"],
  },
  {
    label: "Memnuniyet ve kapanış hazırlığı",
    text:
      "Hizmetimizden memnun musunuz? Kısa geri bildirim için teşekkürler. İyi günler dileriz. " +
      "Başka sorunuz yoksa görüşmeyi sonlandıracağız. Rica ederim, yardımcı olabildiysek ne güzel.",
    keyPhrases: ["memnuniyet", "teşekkür", "iyi günler"],
  },
  {
    label: "Son kontrol ve kayıt kapanışı",
    text:
      "Son kontrol: demo numara ve örnek adres doğru mu? Evet ise kayıt kapanır. " +
      "Hayır derseniz düzeltme adımına döneriz. Bilgilendirme tamamlandı, işlem başarılı görünüyor.",
    keyPhrases: ["son kontrol", "kayıt kapanışı", "bilgilendirme"],
  },
  {
    label: "Veda",
    text:
      "Görüşme sona erdi. Eğitim demosu için teşekkür ederiz. Ücretli bulut API kullanılmadı; " +
      "tüm analiz yerelde üretildi. Kolay gelsin, görüşmek üzere.",
    keyPhrases: ["veda", "yerel analiz", "teşekkür"],
  },
];

export const TELEPHONY_DISCLAIMER_TR =
  "Eğitim demosu. Ücretli API yok. Gerçek PII / ALO 124 vatandaş kaydı yoktur; " +
  "metin sentetik çağrı akışıdır, gerçek konuşmanın birebir dökümü değildir.";

/**
 * How many educational segments to emit for a given duration.
 */
export function segmentCountForDuration(durationSec: number): number {
  const duration = Math.max(durationSec, 1);
  if (duration <= LONG_CALL_THRESHOLD_SEC) return 1;
  return Math.min(
    PHASE_SCRIPTS.length,
    Math.max(2, Math.ceil(duration / TELEPHONY_SEGMENT_SEC))
  );
}

/**
 * Build timed call segments with substantive demo Turkish text.
 */
export function buildCallSegments(durationSec: number): CallSegment[] {
  const duration = Math.max(durationSec, 1);
  const count = segmentCountForDuration(duration);
  const segDur = duration / count;
  const segments: CallSegment[] = [];

  for (let i = 0; i < count; i++) {
    const phase = PHASE_SCRIPTS[i % PHASE_SCRIPTS.length];
    const startSec = Number((i * segDur).toFixed(2));
    const endSec = Number(
      (i === count - 1 ? duration : (i + 1) * segDur).toFixed(2)
    );
    segments.push({
      index: i + 1,
      startSec,
      endSec,
      label: phase.label,
      text: phase.text,
      keyPhrases: [...phase.keyPhrases],
    });
  }
  return segments;
}

/**
 * Join segment texts into one transcript for STT / sentiment / NLP.
 */
export function joinSegmentTranscript(segments: CallSegment[]): string {
  if (!segments.length) return PHASE_SCRIPTS[0].text;
  return segments
    .map((s) => {
      const stamp = `[${formatDuration(s.startSec)}–${formatDuration(s.endSec)} · ${s.label}]`;
      return `${stamp} ${s.text}`;
    })
    .join(" ");
}

/**
 * Short default text for brief unknown uploads (still lexicon-friendly).
 */
export function shortTelephonyMockText(): string {
  return (
    "Merhaba, eğitim amaçlı görüşmeye başlıyoruz. Konuşma kayda alınmaktadır. " +
    "Bugün yalnızca örnek adres ve numara doğrulaması yapılacaktır. " +
    "Gizlilik bilgilendirmesi tamam; işlem sıraya alınmıştır. Teşekkürler, iyi günler."
  );
}

/**
 * Full mock transcript for unknown / telephony uploads, scaled to duration.
 */
export function buildTelephonyMockTranscript(durationSec: number): {
  text: string;
  segments: CallSegment[];
  isLongForm: boolean;
} {
  const duration = Math.max(durationSec, 1);
  if (duration <= LONG_CALL_THRESHOLD_SEC) {
    return {
      text: shortTelephonyMockText(),
      segments: [
        {
          index: 1,
          startSec: 0,
          endSec: Number(duration.toFixed(2)),
          label: "Kısa çağrı / tek bölüm",
          text: shortTelephonyMockText(),
          keyPhrases: ["eğitim demosu", "adres doğrulama", "gizlilik"],
        },
      ],
      isLongForm: false,
    };
  }

  const segments = buildCallSegments(duration);
  return {
    text: joinSegmentTranscript(segments),
    segments,
    isLongForm: true,
  };
}

function buildCallSummaryTr(
  durationSec: number,
  segments: CallSegment[],
  nlp: BrowserNlpResult,
  sentimentHint: string
): string {
  const mins = (durationSec / 60).toFixed(1);
  const labels = segments.map((s) => s.label).slice(0, 6);
  const more = segments.length > 6 ? ` (+${segments.length - 6} bölüm)` : "";
  const topKw = nlp.keywords
    .slice(0, 5)
    .map((k) => k.term)
    .join(", ");
  return (
    `Çok dakikalık çağrı özeti (~${mins} dk, ${segments.length} zaman dilimi): ` +
    `${labels.join(" → ")}${more}. ` +
    `Yerel NLP niyeti: ${nlp.intent} (güven %${Math.round(nlp.intentConfidence * 100)}). ` +
    (topKw ? `Anahtar: ${topKw}. ` : "") +
    `Duygu ipucu: ${sentimentHint}. ` +
    TELEPHONY_DISCLAIMER_TR
  );
}

/**
 * Attach NLP + summary for a completed transcript (especially long calls).
 */
export function buildCallAnalysis(options: {
  text: string;
  durationSec: number;
  segments?: CallSegment[];
  sentimentSummaryTr?: string;
}): CallAnalysis {
  const duration = Math.max(options.durationSec, 1);
  const built =
    options.segments && options.segments.length
      ? {
          text: options.text,
          segments: options.segments,
          isLongForm: duration > LONG_CALL_THRESHOLD_SEC,
        }
      : buildTelephonyMockTranscript(duration);

  const segments = built.segments;
  const text = (options.text || built.text).trim() || built.text;
  const nlp = analyzeBrowserNlp(text);
  const keyPhrases = [
    ...new Set([
      ...segments.flatMap((s) => s.keyPhrases),
      ...nlp.keyPhrases.slice(0, 6),
    ]),
  ].slice(0, 12);

  return {
    isLongForm: built.isLongForm || duration > LONG_CALL_THRESHOLD_SEC,
    segmentCount: segments.length,
    segments,
    summaryTr: buildCallSummaryTr(
      duration,
      segments,
      nlp,
      options.sentimentSummaryTr || nlp.summaryTr
    ),
    keyPhrases,
    nlp,
    disclaimerTr: TELEPHONY_DISCLAIMER_TR,
  };
}
