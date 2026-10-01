/** Five selectable local/demo STT engines. */
export type SttMode =
  | "mock"
  | "web-speech"
  | "pipeline"
  | "vad-ngram"
  | "keyword-spot";

export type SttModeIconName =
  | "bot"
  | "mic"
  | "workflow"
  | "waveform"
  | "radar";

export type SttModeMeta = {
  id: SttMode;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  details: string[];
  offline: boolean;
  icon: SttModeIconName;
  recommended?: boolean;
  /** Modes that emit live educational stages. */
  hasStages?: boolean;
};

export const STT_MODES: SttModeMeta[] = [
  {
    id: "mock",
    label: "Mock ASR",
    shortLabel: "Mock ASR",
    badge: "Çevrimdışı",
    description:
      "Deterministik, ağ gerektirmeyen demo tanıma. Common Voice TR örnekleri için hazır transkript ve sentez kelime zamanlaması üretir.",
    details: [
      "İnternet veya mikrofon istemez",
      "Örnek dosya adına göre sabit Türkçe metin",
      "Lab metrikleri, duygu ve WER karşılaştırması için ideal",
    ],
    offline: true,
    icon: "bot",
    recommended: true,
  },
  {
    id: "web-speech",
    label: "Web Speech API",
    shortLabel: "Web Speech",
    badge: "Tarayıcı",
    description:
      "Tarayıcının SpeechRecognition arayüzü (Chrome/Edge vb.). Birçok ortamda mikrofon girişi ister; dosya kaynağı desteklenmeyebilir.",
    details: [
      "Destek yoksa veya hata olursa Mock ASR’ye düşer",
      "Kelime zamanlaması yoksa sentez zaman damgası eklenir",
      "Gerçek çağrı kaydı için üretim ASR tercih edilmeli",
    ],
    offline: false,
    icon: "mic",
  },
  {
    id: "pipeline",
    label: "Boru hattı aşamaları",
    shortLabel: "VAD → öznitelik → çözümleme",
    badge: "Eğitim",
    description:
      "Eğitim amaçlı hafif yol: VAD (konuşma etkinliği) → öznitelik özeti → çözümleme (mock decode). Büyük model indirmez; çevrimdışı çalışır.",
    details: [
      "Aşamaları adım adım gösterir (VAD, öznitelik, decode)",
      "Whisper.wasm / transformers.js yerine hafif demo",
      "Sonuç metni Mock ASR ile tutarlı; süreç görünür",
    ],
    offline: true,
    icon: "workflow",
    hasStages: true,
  },
  {
    id: "vad-ngram",
    label: "Enerji/VAD + n-gram hibrit",
    shortLabel: "Demo hibrit — Whisper değil",
    badge: "Hibrit demo",
    description:
      "Tarayıcıda Whisper-tiny (@xenova/transformers) yerine açıkça etiketlenmiş eğitim hibriti: enerji tabanlı VAD → küçük Türkçe n-gram skorlama → mock decode. Model indirmez.",
    details: [
      "Whisper / ONNX indirmez — demoda hibrit yol",
      "Enerji eşiği + unigram/bigram skorları görünür",
      "Örnek dosyalar için metin Mock ASR ile aynı",
    ],
    offline: true,
    icon: "waveform",
    hasStages: true,
  },
  {
    id: "keyword-spot",
    label: "Anahtar kelime + akustik güven",
    shortLabel: "KW spot · MOCK transkript",
    badge: "KW demo",
    description:
      "Çevrimdışı anahtar kelime tespiti ve akustik güven demosu. Tam cümle transkripti bilinen örneklerde yine MOCK metinden gelir; KW isabetleri ve SNR benzeri güven gösterilir.",
    details: [
      "ALO 124 eğitim sözlüğü üzerinde tarama",
      "Akustik güven (SNR benzeri) çerçeve özeti",
      "Tam metin örnekler için MOCK — production KWS değil",
    ],
    offline: true,
    icon: "radar",
    hasStages: true,
  },
];

export function getSttModeMeta(id: SttMode): SttModeMeta {
  return STT_MODES.find((m) => m.id === id) ?? STT_MODES[0];
}

export function sttModeHasStages(id: SttMode): boolean {
  return Boolean(getSttModeMeta(id).hasStages);
}

export function supportsWebSpeech(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}
