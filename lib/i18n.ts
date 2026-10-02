/** UI chrome locales for speech-to-text-lab. */

export type Locale = "tr" | "en" | "fr" | "cn" | "jp" | "ar";

export const LOCALES: readonly Locale[] = [
  "tr",
  "en",
  "fr",
  "cn",
  "jp",
  "ar",
] as const;

/** Visible switcher labels (user-requested). */
export const LOCALE_LABELS: Record<Locale, string> = {
  tr: "TR",
  en: "EN",
  fr: "FR",
  cn: "CN",
  jp: "JP",
  ar: "AR",
};

export const LOCALE_STORAGE_KEY = "stt-lab-locale-v1";
export const DEFAULT_LOCALE: Locale = "tr";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (LOCALES as readonly string[]).includes(value)
  );
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** BCP 47 / HTML lang values. */
export function localeHtmlLang(locale: Locale): string {
  switch (locale) {
    case "tr":
      return "tr";
    case "en":
      return "en";
    case "fr":
      return "fr";
    case "cn":
      return "zh-Hans";
    case "jp":
      return "ja";
    case "ar":
      return "ar";
  }
}

export type Dict = {
  // Header / page
  "header.eduLine": string;
  "header.description": string;
  "header.nav.slides": string;
  "header.nav.tuik": string;
  "header.logoAlt": string;
  "page.privacyTitle": string;
  "page.privacyBody": string;
  "page.eduUseTitle": string;
  "page.eduUseBody": string;
  "page.eduUseSource": string;

  // Footer
  "footer.brandRole": string;
  "footer.brandTagline": string;
  "footer.creditAfter": string;
  "footer.eduHeading": string;
  "footer.eduBody": string;
  "footer.tryHeading": string;
  "footer.tryBody": string;
  "footer.navSlides": string;
  "footer.navTuik": string;
  "footer.ariaBrand": string;
  "footer.ariaQuick": string;
  "footer.ariaNav": string;
  "footer.copy": string;
  "footer.logoNote": string;
  "footer.langAria": string;

  // Lab workspace
  "lab.ariaWorkspace": string;
  "lab.tab.single": string;
  "lab.tab.batch": string;
  "lab.tab.nlp": string;
  "lab.step.upload": string;
  "lab.step.listen": string;
  "lab.step.transcribe": string;
  "lab.step.sentiment": string;
  "lab.step.report": string;
  "lab.dropHere": string;
  "lab.formats": string;
  "lab.ariaAudioView": string;
  "lab.viewMinimal": string;
  "lab.viewDetail": string;
  "lab.playerTitle": string;
  "lab.playerHint": string;
  "lab.waveformTitle": string;
  "lab.noFile": string;
  "lab.transcribeBtn": string;
  "lab.transcribing": string;
  "lab.processed": string;
  "lab.source": string;
  "lab.sentiment": string;
  "lab.sec": string;
  "lab.playerLabel": string;
  "lab.dropInvalid": string;
  "lab.errSelectFirst": string;
  "lab.errSampleMissing": string;
  "lab.errSampleLoad": string;
  "lab.errDecode": string;
  "lab.errTranscribe": string;

  // Upload
  "upload.title": string;
  "upload.hint": string;
  "upload.drop": string;
  "upload.formats": string;
  "upload.privacy": string;
  "upload.release": string;
  "upload.invalid": string;
  "upload.unsupported": string;
  "upload.loaded": string;

  // NLP tab — external audio upload
  "nlp.upload.title": string;
  "nlp.upload.hint": string;
  "nlp.upload.loaded": string;
  "nlp.upload.processing": string;
  "nlp.source.upload": string;
  "nlp.source.sample": string;
  "nlp.source.lab": string;
  "nlp.source.waiting": string;
  "nlp.errNeedSource": string;
  "nlp.errUpload": string;
  "nlp.errSample": string;

  // STT selector
  "stt.title": string;
  "stt.tools": string;
  "stt.aria": string;
  "stt.recommended": string;
  "stt.unavailable": string;

  // Panels
  "panel.transcript": string;
  "panel.transcriptEmpty": string;
  "panel.transcriptError": string;
  "panel.confidence": string;
  "panel.wordTimings": string;
  "panel.word": string;
  "panel.start": string;
  "panel.end": string;
  "panel.sentiment": string;
  "panel.sentimentEmpty": string;
  "panel.sentimentOffline": string;
  "panel.score": string;
  "panel.report": string;
  "panel.reportEmpty": string;
  "panel.reportEmptyHint": string;
  "panel.reportSubtitle": string;
  "panel.metricsEmpty": string;
  "panel.callDuration": string;
  "panel.speakingRatio": string;
  "panel.speakingHint": string;
  "panel.silenceGaps": string;
  "panel.silenceHint": string;
  "panel.sampleRate": string;
  "panel.avgConfidence": string;
  "panel.keywordHits": string;
  "panel.keywordDemo": string;
  "panel.noMatch": string;
  "panel.pipelineStages": string;
  "panel.running": string;
  "panel.waiting": string;
  "panel.copied": string;
  "panel.copyClipboard": string;
  "panel.duration": string;
  "panel.polarity": string;
  "panel.approxAccuracy": string;
  "panel.asrConfidence": string;
  "panel.transcriptSummary": string;
  "panel.emotionScores": string;
  "panel.werQuality": string;
  "panel.noReference": string;
  "panel.exportPreview": string;
  "panel.copyFailed": string;
  "panel.emotion": string;
  "panel.accuracy": string;
  "panel.proxyHint": string;
  // First-visit gate
  "gate.subtitle": string;
  "gate.splashTitle": string;
  "gate.splashLoading": string;
  "gate.splashReady": string;
  "gate.feature.stt": string;
  "gate.feature.sentiment": string;
  "gate.feature.report": string;
  "gate.feature.i18n": string;
  "gate.feature.local": string;
  "gate.onboardTitle": string;
  "gate.onboard.1": string;
  "gate.onboard.2": string;
  "gate.onboard.3": string;
  "gate.consentTitle": string;
  "gate.consentBody": string;
  "gate.consentLocal": string;
  "gate.consentDemo": string;
  "gate.consentCheck": string;
  "gate.continue": string;
  "gate.back": string;
  "gate.accept": string;
  "gate.approvedBadge": string;
  "gate.formFirstName": string;
  "gate.formLastName": string;
  "gate.formReason": string;
  "gate.formReasonPlaceholder": string;
  "gate.formRequired": string;
  "gate.formConsentRequired": string;
  "gate.formSubmitError": string;
  "gate.formSubmitting": string;
};

const tr: Dict = {
  "header.eduLine":
    "Yapay zeka dönüşümü ve yapay zeka okuryazarlığı eğitimi kapsamında.",
  "header.description":
    "TÜİK ALO 124 tarzı çağrı merkezi sesi → STT → duygu/sentiment → rapor. Yalnızca sentetik / demo ses; gerçek çağrı kaydı veya kişisel veri yoktur. Ücretli API kullanılmaz.",
  "header.nav.slides": "Slaytlar",
  "header.nav.tuik": "TÜİK",
  "header.logoAlt": "TÜİK — Türkiye İstatistik Kurumu logosu",
  "page.privacyTitle": "Gizlilik notu:",
  "page.privacyBody":
    "Bu uygulama eğitim amaçlıdır. Gerçek ALO 124 kayıtları, vatandaş kişisel verileri veya CATI yanıtları yüklemeyin. Üretim ortamında KVKK ve kurum politikalarına uyun.",
  "page.eduUseTitle": "Eğitim amaçlı kullanım:",
  "page.eduUseBody":
    "TÜİK logosu yalnızca bu laboratuvarın eğitim / demo bağlamında gösterilmektedir; resmi bir TÜİK ürünü veya onaylı yayın değildir. Logo kaynağı:",
  "page.eduUseSource": "tuik.gov.tr",

  "footer.brandRole": "Eğitmen mühendis",
  "footer.brandTagline": "speech-to-text-lab · STT eğitim laboratuvarı",
  "footer.creditAfter": "yazılım şirketi kaynaklarıyla geliştirilmiştir.",
  "footer.eduHeading": "Eğitim amaçlı kullanım",
  "footer.eduBody":
    "ALO 124 resmi bir ürün değildir; TÜİK süreçlerini öğretmek için tasarlanmıştır. Logo yalnızca eğitim / demo bağlamında gösterilir — resmi onay veya ürün iddiası taşımaz. Sentetik / demo ses kullanılır; gerçek kişisel veri yoktur.",
  "footer.tryHeading": "Laboratuvarı deneyin",
  "footer.tryBody":
    "Sentetik veya demo bir ses seçin; STT, duygu ve rapor akışını tek alanda test edin.",
  "footer.navSlides": "Slaytlar",
  "footer.navTuik": "TÜİK",
  "footer.ariaBrand": "Marka",
  "footer.ariaQuick": "Hızlı erişim",
  "footer.ariaNav": "Alt gezinme",
  "footer.copy": "© speech-to-text-lab · eğitim laboratuvarı",
  "footer.logoNote":
    "Logo © Türkiye İstatistik Kurumu · eğitim amaçlı kullanım",
  "footer.langAria": "Arayüz dili",

  "lab.ariaWorkspace": "Çalışma alanı modu",
  "lab.tab.single": "Tek dosya",
  "lab.tab.batch": "Toplu işleme",
  "lab.tab.nlp": "NLP / OpenCode",
  "lab.step.upload": "Yükle / Örnek",
  "lab.step.listen": "Dinle",
  "lab.step.transcribe": "Transkribe",
  "lab.step.sentiment": "Duygu",
  "lab.step.report": "Rapor",
  "lab.dropHere": "Ses dosyasını buraya sürükleyin",
  "lab.formats": "WAV · MP3 · M4A",
  "lab.ariaAudioView": "Ses sahnesi görünümü",
  "lab.viewMinimal": "Minimal",
  "lab.viewDetail": "Detay",
  "lab.playerTitle": "Ses oynatıcı",
  "lab.playerHint":
    "Seçilen örneği dinleyin — WAV (PCM) + M4A (AAC) yedek kaynak",
  "lab.waveformTitle": "Dalga formu",
  "lab.noFile": "Dosya seçilmedi",
  "lab.transcribeBtn": "Transkribe et + duygu analizi",
  "lab.transcribing": "İşleniyor: STT → duygu → rapor…",
  "lab.processed": "İşlendi",
  "lab.source": "Kaynak",
  "lab.sentiment": "Duygu",
  "lab.sec": "sn",
  "lab.playerLabel": "Ses oynatıcı",
  "lab.dropInvalid":
    "Lütfen geçerli bir ses dosyası bırakın (WAV/MP3/M4A).",
  "lab.errSelectFirst": "Önce bir örnek seçin veya dosya yükleyin.",
  "lab.errSampleMissing": "Örnek dosya bulunamadı",
  "lab.errSampleLoad":
    "Örnek ses yüklenirken hata oluştu. scripts/generate-samples.sh çalıştırın.",
  "lab.errDecode": "Ses dosyası çözümlenemedi. WAV/MP3 deneyin.",
  "lab.errTranscribe": "Transkripsiyon sırasında hata oluştu.",

  "upload.title": "Dosya yükle",
  "upload.hint":
    "Örnekler Detay görünümündeki yatay katalogda. Buraya kendi WAV/MP3/M4A dosyanızı sürükleyin.",
  "upload.drop": "Ses dosyasını buraya sürükleyin",
  "upload.formats": "WAV · MP3 · M4A — tıklayarak da seçebilirsiniz",
  "upload.privacy":
    "Yalnızca demo / sentetik ses — kişisel veri yüklemeyin",
  "upload.release":
    "Dosyayı bırakın — ana oynatıcıya ve boru hattına yüklenecek",
  "upload.invalid":
    "Geçerli bir ses dosyası bulunamadı. WAV, MP3 veya M4A deneyin.",
  "upload.unsupported":
    "Desteklenmeyen tür. WAV / MP3 / M4A yükleyin.",
  "upload.loaded": "Yüklendi — ana oynatıcıya yüklendi.",

  "nlp.upload.title": "Harici ses yükle",
  "nlp.upload.hint":
    "NLP sekmesinde dışarıdan WAV/MP3/M4A sürükleyin veya seçin. STT sonrası duygu ve tarayıcı NLP aynı transkript üzerinde çalışır.",
  "nlp.upload.loaded": "Yüklendi — NLP için STT çalıştırılıyor.",
  "nlp.upload.processing": "Harici ses işleniyor: STT → duygu…",
  "nlp.source.upload":
    "Kaynak: harici yükleme · STT → duygu hazır · NLP / OpenCode çalıştırabilirsiniz",
  "nlp.source.sample":
    "Kaynak: SAMPLE_CATALOG → MOCK_TRANSCRIPTS · yükleme / Tek dosya STT gerekmez",
  "nlp.source.lab": "Kaynak lab sonucu (Tek dosya sekmesi)",
  "nlp.source.waiting":
    "Kaynak bekleniyor: Common Voice örneği seçin, harici ses yükleyin veya Tek dosya sekmesinde transkribe edin.",
  "nlp.errNeedSource":
    "Önce bir Common Voice örneği seçin, harici ses yükleyin veya Tek dosya sekmesinde transkribe edin.",
  "nlp.errUpload": "Harici ses yüklenirken / STT sırasında hata oluştu.",
  "nlp.errSample": "Örnek MOCK_TRANSCRIPTS yüklenirken hata oluştu.",

  "stt.title": "Yerel STT motoru",
  "stt.tools": "araç",
  "stt.aria": "STT motoru seçimi",
  "stt.recommended": "Önerilen",
  "stt.unavailable": "Bu tarayıcıda yok",

  "panel.transcript": "Transkript",
  "panel.transcriptEmpty":
    'Henüz transkript yok. Örnek bir kayıt seçin veya dosya yükleyip "Transkribe et" düğmesine basın.',
  "panel.transcriptError": "Transkripsiyon hatası",
  "panel.confidence": "Güven",
  "panel.wordTimings": "Kelime zamanlamaları",
  "panel.word": "Kelime",
  "panel.start": "Başlangıç",
  "panel.end": "Bitiş",
  "panel.sentiment": "Duygu / duygu durumu analizi",
  "panel.sentimentEmpty":
    "Transkripsiyon sonrası duygu / duygu durumu (olumlu · nötr · olumsuz + sakin/gergin…) burada görünür.",
  "panel.sentimentOffline": "Türkçe sözlük · çevrimdışı",
  "panel.score": "Skor",
  "panel.report": "Analiz raporu",
  "panel.reportEmpty": "Analiz raporu henüz hazır değil",
  "panel.reportEmptyHint":
    "Transkript, duygu skorları, süre, WER-ish metrikler ve PDF / TXT / JSON dışa aktarma burada toplanır.",
  "panel.reportSubtitle":
    "Tek dosya özeti · transkript · duygu · WER · dışa aktarım",
  "panel.metricsEmpty":
    "Transkripsiyon sonrası süre, konuşma oranı, sessizlik ve anahtar kelime metrikleri burada listelenir.",
  "panel.callDuration": "Çağrı süresi",
  "panel.speakingRatio": "Konuşma oranı",
  "panel.speakingHint": "Kelime zaman damgalarından tahmin",
  "panel.silenceGaps": "Sessizlik boşlukları",
  "panel.silenceHint": "≥ 0,45 sn boşluklar",
  "panel.sampleRate": "Örnekleme hızı",
  "panel.avgConfidence": "Ort. güven",
  "panel.keywordHits": "Anahtar kelime eşleşmeleri",
  "panel.keywordDemo":
    "Demo terimler: anket, gizlilik, TÜİK, randevu (+ alo, veri, istatistik)",
  "panel.noMatch": "Eşleşme yok",
  "panel.pipelineStages": "Boru hattı aşamaları",
  "panel.running": "Çalışıyor…",
  "panel.waiting": "Bekliyor",
  "panel.copied": "Kopyalandı",
  "panel.copyClipboard": "Panoya kopyala",
  "panel.duration": "Süre",
  "panel.polarity": "Polarite",
  "panel.approxAccuracy": "Yaklaşık doğruluk",
  "panel.asrConfidence": "ASR güven",
  "panel.transcriptSummary": "Transkript özeti",
  "panel.emotionScores": "Duygu skorları",
  "panel.werQuality": "WER-ish / kalite",
  "panel.noReference": "Referans yok — proxy doğruluk kullanıldı",
  "panel.exportPreview":
    "Dışa aktarım önizlemesi (düz metin · TXT ile aynı)",
  "panel.copyFailed":
    "Kopyalama başarısız. Metni aşağıdan seçip kopyalayın.",
  "panel.emotion": "Duygu",
  "panel.accuracy": "Doğruluk",
  "panel.proxyHint": "güven proxy",
  "gate.subtitle": "Eğitim amaçlı STT laboratuvarı",
  "gate.splashTitle": "Bu sitede neler var?",
  "gate.splashLoading": "Arayüz hazırlanıyor…",
  "gate.splashReady": "Hazır — devam edebilirsiniz",
  "gate.feature.stt": "Çağrı merkezi tarzı ses → yerel STT motorları (Mock, Web Speech, boru hattı demoları)",
  "gate.feature.sentiment": "Türkçe duygu / duygu durumu analizi (çevrimdışı sözlük)",
  "gate.feature.report": "Metrikler, transkript, WER-ish ve PDF / TXT / JSON rapor",
  "gate.feature.i18n": "Arayüz dilleri: TR · EN · FR · CN · JP · AR (AR sağdan sola)",
  "gate.feature.local": "Veriler tarayıcınızda kalır; ücretli bulut STT zorunlu değildir",
  "gate.onboardTitle": "Kısa tur",
  "gate.onboard.1": "Örnek bir ses seçin veya kendi demo WAV/MP3/M4A dosyanızı yükleyin.",
  "gate.onboard.2": "Bir STT motoru seçip «Transkribe et» ile duygu ve raporu üretin.",
  "gate.onboard.3": "Minimal görünüm yalnızca oynatıcı + dalga formu gösterir; Detay katalog ve kartları açar.",
  "gate.consentTitle": "KVKK ve doğru kullanım",
  "gate.consentBody": "Bu laboratuvar eğitim amaçlıdır. Gerçek ALO 124 kayıtları, vatandaş kişisel verileri veya CATI yanıtları yüklenmemelidir. Üretim ortamında KVKK ve kurum politikalarına uyulmalıdır.",
  "gate.consentLocal": "Onay ve dil tercihi bu cihazda localStorage içinde saklanır. Form gönderimi tarayıcıdan Web3Forms ile iletilir.",
  "gate.consentDemo": "Yalnızca sentetik / demo ses kullanın. Logo eğitim / demo bağlamındadır; resmi TÜİK ürünü değildir.",
  "gate.consentCheck": "KVKK ve yerel veri / doğru kullanım koşullarını okudum ve kabul ediyorum.",
  "gate.continue": "Devam",
  "gate.back": "Geri",
  "gate.accept": "Kabul et ve başla",
  "gate.approvedBadge": "Onaylandı",
  "gate.formFirstName": "Ad",
  "gate.formLastName": "Soyad",
  "gate.formReason": "Bu laboratuvarı neden kullanıyorsunuz?",
  "gate.formReasonPlaceholder": "Örn. eğitim, demo, ekip içi STT denemesi…",
  "gate.formRequired": "Ad, soyad ve kullanım nedeni zorunludur.",
  "gate.formConsentRequired": "Devam etmek için KVKK / doğru kullanım onayını işaretleyin.",
  "gate.formSubmitError": "Gönderim başarısız. Lütfen tekrar deneyin.",
  "gate.formSubmitting": "Gönderiliyor…",
};

const en: Dict = {
  "header.eduLine":
    "Built for AI transformation and AI literacy training.",
  "header.description":
    "TÜİK ALO 124–style call-center audio → STT → sentiment → report. Synthetic / demo audio only; no real call recordings or personal data. No paid APIs required.",
  "header.nav.slides": "Slides",
  "header.nav.tuik": "TÜİK",
  "header.logoAlt": "TÜİK — Turkish Statistical Institute logo",
  "page.privacyTitle": "Privacy note:",
  "page.privacyBody":
    "This app is for education only. Do not upload real ALO 124 recordings, citizen personal data, or CATI responses. In production, follow KVKK and institutional policies.",
  "page.eduUseTitle": "Educational use:",
  "page.eduUseBody":
    "The TÜİK logo is shown only in this lab’s educational / demo context; this is not an official TÜİK product or endorsed publication. Logo source:",
  "page.eduUseSource": "tuik.gov.tr",

  "footer.brandRole": "Instructor engineer",
  "footer.brandTagline": "speech-to-text-lab · STT education lab",
  "footer.creditAfter": "built with resources from the software company.",
  "footer.eduHeading": "Educational use",
  "footer.eduBody":
    "ALO 124 here is not an official product; it is designed to teach TÜİK-style processes. The logo appears only in an educational / demo context — no official endorsement or product claim. Synthetic / demo audio only; no real personal data.",
  "footer.tryHeading": "Try the lab",
  "footer.tryBody":
    "Pick a synthetic or demo clip; test STT, sentiment, and reporting in one place.",
  "footer.navSlides": "Slides",
  "footer.navTuik": "TÜİK",
  "footer.ariaBrand": "Brand",
  "footer.ariaQuick": "Quick access",
  "footer.ariaNav": "Footer navigation",
  "footer.copy": "© speech-to-text-lab · education laboratory",
  "footer.logoNote":
    "Logo © Turkish Statistical Institute · educational use",
  "footer.langAria": "Interface language",

  "lab.ariaWorkspace": "Workspace mode",
  "lab.tab.single": "Single file",
  "lab.tab.batch": "Batch",
  "lab.tab.nlp": "NLP / OpenCode",
  "lab.step.upload": "Upload / Sample",
  "lab.step.listen": "Listen",
  "lab.step.transcribe": "Transcribe",
  "lab.step.sentiment": "Sentiment",
  "lab.step.report": "Report",
  "lab.dropHere": "Drop an audio file here",
  "lab.formats": "WAV · MP3 · M4A",
  "lab.ariaAudioView": "Audio stage view",
  "lab.viewMinimal": "Minimal",
  "lab.viewDetail": "Detail",
  "lab.playerTitle": "Audio player",
  "lab.playerHint":
    "Listen to the selected sample — WAV (PCM) + M4A (AAC) fallback",
  "lab.waveformTitle": "Waveform",
  "lab.noFile": "No file selected",
  "lab.transcribeBtn": "Transcribe + sentiment analysis",
  "lab.transcribing": "Processing: STT → sentiment → report…",
  "lab.processed": "Processed",
  "lab.source": "Source",
  "lab.sentiment": "Sentiment",
  "lab.sec": "s",
  "lab.playerLabel": "Audio player",
  "lab.dropInvalid": "Please drop a valid audio file (WAV/MP3/M4A).",
  "lab.errSelectFirst": "Select a sample or upload a file first.",
  "lab.errSampleMissing": "Sample file not found",
  "lab.errSampleLoad":
    "Failed to load sample audio. Run scripts/generate-samples.sh.",
  "lab.errDecode": "Could not decode the audio file. Try WAV/MP3.",
  "lab.errTranscribe": "An error occurred during transcription.",

  "upload.title": "Upload file",
  "upload.hint":
    "Samples live in the horizontal catalog in Detail view. Drop your own WAV/MP3/M4A here.",
  "upload.drop": "Drop an audio file here",
  "upload.formats": "WAV · MP3 · M4A — or click to choose",
  "upload.privacy": "Demo / synthetic audio only — do not upload personal data",
  "upload.release": "Release to load into the main player and pipeline",
  "upload.invalid":
    "No valid audio file found. Try WAV, MP3, or M4A.",
  "upload.unsupported": "Unsupported type. Upload WAV / MP3 / M4A.",
  "upload.loaded": "Loaded into the main player.",

  "nlp.upload.title": "Upload external audio",
  "nlp.upload.hint":
    "Drop or pick a WAV/MP3/M4A on the NLP tab. After STT, sentiment and browser NLP run on the same transcript.",
  "nlp.upload.loaded": "Loaded — running STT for NLP.",
  "nlp.upload.processing": "Processing external audio: STT → sentiment…",
  "nlp.source.upload":
    "Source: external upload · STT → sentiment ready · you can run NLP / OpenCode",
  "nlp.source.sample":
    "Source: SAMPLE_CATALOG → MOCK_TRANSCRIPTS · no upload / Single-file STT required",
  "nlp.source.lab": "Source: lab result (Single-file tab)",
  "nlp.source.waiting":
    "Waiting for a source: pick a Common Voice sample, upload external audio, or transcribe on the Single-file tab.",
  "nlp.errNeedSource":
    "First pick a Common Voice sample, upload external audio, or transcribe on the Single-file tab.",
  "nlp.errUpload": "Error while uploading external audio / running STT.",
  "nlp.errSample": "Error loading sample MOCK_TRANSCRIPTS.",

  "stt.title": "Local STT engine",
  "stt.tools": "tools",
  "stt.aria": "STT engine selection",
  "stt.recommended": "Recommended",
  "stt.unavailable": "Not in this browser",

  "panel.transcript": "Transcript",
  "panel.transcriptEmpty":
    'No transcript yet. Pick a sample or upload a file and press "Transcribe".',
  "panel.transcriptError": "Transcription error",
  "panel.confidence": "Confidence",
  "panel.wordTimings": "Word timings",
  "panel.word": "Word",
  "panel.start": "Start",
  "panel.end": "End",
  "panel.sentiment": "Sentiment / emotion analysis",
  "panel.sentimentEmpty":
    "After transcription, sentiment / emotion (positive · neutral · negative + calm/tense…) appears here.",
  "panel.sentimentOffline": "Turkish lexicon · offline",
  "panel.score": "Score",
  "panel.report": "Analysis report",
  "panel.reportEmpty": "Analysis report not ready yet",
  "panel.reportEmptyHint":
    "Transcript, sentiment scores, duration, WER-ish metrics, and PDF / TXT / JSON export gather here.",
  "panel.reportSubtitle":
    "Single-file summary · transcript · sentiment · WER · export",
  "panel.metricsEmpty":
    "After transcription, duration, speaking ratio, silence, and keyword metrics list here.",
  "panel.callDuration": "Call duration",
  "panel.speakingRatio": "Speaking ratio",
  "panel.speakingHint": "Estimated from word timestamps",
  "panel.silenceGaps": "Silence gaps",
  "panel.silenceHint": "Gaps ≥ 0.45 s",
  "panel.sampleRate": "Sample rate",
  "panel.avgConfidence": "Avg. confidence",
  "panel.keywordHits": "Keyword hits",
  "panel.keywordDemo":
    "Demo terms: survey, privacy, TÜİK, appointment (+ hello, data, statistics)",
  "panel.noMatch": "No matches",
  "panel.pipelineStages": "Pipeline stages",
  "panel.running": "Running…",
  "panel.waiting": "Waiting",
  "panel.copied": "Copied",
  "panel.copyClipboard": "Copy to clipboard",
  "panel.duration": "Duration",
  "panel.polarity": "Polarity",
  "panel.approxAccuracy": "Approx. accuracy",
  "panel.asrConfidence": "ASR confidence",
  "panel.transcriptSummary": "Transcript summary",
  "panel.emotionScores": "Emotion scores",
  "panel.werQuality": "WER-ish / quality",
  "panel.noReference": "No reference — proxy accuracy used",
  "panel.exportPreview": "Export preview (plain text · same as TXT)",
  "panel.copyFailed": "Copy failed. Select and copy the text below.",
  "panel.emotion": "Emotion",
  "panel.accuracy": "Accuracy",
  "panel.proxyHint": "confidence proxy",
  "gate.subtitle": "Educational STT laboratory",
  "gate.splashTitle": "What this site includes",
  "gate.splashLoading": "Preparing the interface…",
  "gate.splashReady": "Ready — you can continue",
  "gate.feature.stt": "Call-center style audio → local STT engines (Mock, Web Speech, pipeline demos)",
  "gate.feature.sentiment": "Turkish sentiment / emotion analysis (offline lexicon)",
  "gate.feature.report": "Metrics, transcript, WER-ish scores, and PDF / TXT / JSON reports",
  "gate.feature.i18n": "UI languages: TR · EN · FR · CN · JP · AR (Arabic is RTL)",
  "gate.feature.local": "Data stays in your browser; paid cloud STT is not required",
  "gate.onboardTitle": "Quick tour",
  "gate.onboard.1": "Pick a sample clip or upload your own demo WAV/MP3/M4A file.",
  "gate.onboard.2": "Choose an STT engine and run Transcribe to get sentiment and a report.",
  "gate.onboard.3": "Minimal view shows player + waveform only; Detail opens the catalog and cards.",
  "gate.consentTitle": "KVKK and correct use",
  "gate.consentBody": "This lab is for education only. Do not upload real ALO 124 recordings, citizen personal data, or CATI responses. In production, follow KVKK and institutional policies.",
  "gate.consentLocal": "Consent and language preference are stored in localStorage on this device. Form submit goes from the browser to Web3Forms.",
  "gate.consentDemo": "Use synthetic / demo audio only. The logo is educational / demo context; not an official TÜİK product.",
  "gate.consentCheck": "I have read and accept the KVKK and local-data / correct-use terms.",
  "gate.continue": "Continue",
  "gate.back": "Back",
  "gate.accept": "Accept and start",
  "gate.approvedBadge": "Approved",
  "gate.formFirstName": "First name",
  "gate.formLastName": "Last name",
  "gate.formReason": "Why are you using this lab?",
  "gate.formReasonPlaceholder": "e.g. training, demo, internal STT practice…",
  "gate.formRequired": "First name, last name, and reason are required.",
  "gate.formConsentRequired": "Please accept the KVKK / correct-use terms to continue.",
  "gate.formSubmitError": "Submission failed. Please try again.",
  "gate.formSubmitting": "Submitting…",
};

const fr: Dict = {
  "header.eduLine":
    "Conçu pour la formation à la transformation et à la littératie en IA.",
  "header.description":
    "Audio type centre d’appels ALO 124 / TÜİK → STT → sentiment → rapport. Audio synthétique / démo uniquement ; pas d’enregistrements réels ni de données personnelles. Pas d’API payante requise.",
  "header.nav.slides": "Diapositives",
  "header.nav.tuik": "TÜİK",
  "header.logoAlt": "TÜİK — logo de l’Institut statistique turc",
  "page.privacyTitle": "Note de confidentialité :",
  "page.privacyBody":
    "Cette application est éducative. N’importez pas de vrais appels ALO 124, de données personnelles ou de réponses CATI. En production, respectez le KVKK et les politiques institutionnelles.",
  "page.eduUseTitle": "Usage éducatif :",
  "page.eduUseBody":
    "Le logo TÜİK n’apparaît que dans le contexte éducatif / démo de ce laboratoire ; ce n’est pas un produit officiel TÜİK. Source du logo :",
  "page.eduUseSource": "tuik.gov.tr",

  "footer.brandRole": "Ingénieur formateur",
  "footer.brandTagline": "speech-to-text-lab · laboratoire STT éducatif",
  "footer.creditAfter":
    "développé avec les ressources de l’entreprise logicielle.",
  "footer.eduHeading": "Usage éducatif",
  "footer.eduBody":
    "ALO 124 ici n’est pas un produit officiel ; il sert à enseigner des processus de type TÜİK. Le logo n’apparaît qu’en contexte éducatif / démo. Audio synthétique / démo uniquement.",
  "footer.tryHeading": "Essayez le laboratoire",
  "footer.tryBody":
    "Choisissez un clip synthétique ou démo ; testez STT, sentiment et rapport au même endroit.",
  "footer.navSlides": "Diapositives",
  "footer.navTuik": "TÜİK",
  "footer.ariaBrand": "Marque",
  "footer.ariaQuick": "Accès rapide",
  "footer.ariaNav": "Navigation pied de page",
  "footer.copy": "© speech-to-text-lab · laboratoire éducatif",
  "footer.logoNote":
    "Logo © Institut statistique turc · usage éducatif",
  "footer.langAria": "Langue de l’interface",

  "lab.ariaWorkspace": "Mode de l’espace de travail",
  "lab.tab.single": "Fichier unique",
  "lab.tab.batch": "Lot",
  "lab.tab.nlp": "NLP / OpenCode",
  "lab.step.upload": "Importer / Échantillon",
  "lab.step.listen": "Écouter",
  "lab.step.transcribe": "Transcrire",
  "lab.step.sentiment": "Sentiment",
  "lab.step.report": "Rapport",
  "lab.dropHere": "Déposez un fichier audio ici",
  "lab.formats": "WAV · MP3 · M4A",
  "lab.ariaAudioView": "Vue de la scène audio",
  "lab.viewMinimal": "Minimal",
  "lab.viewDetail": "Détail",
  "lab.playerTitle": "Lecteur audio",
  "lab.playerHint":
    "Écoutez l’échantillon — WAV (PCM) + secours M4A (AAC)",
  "lab.waveformTitle": "Forme d’onde",
  "lab.noFile": "Aucun fichier sélectionné",
  "lab.transcribeBtn": "Transcrire + analyse de sentiment",
  "lab.transcribing": "Traitement : STT → sentiment → rapport…",
  "lab.processed": "Traité",
  "lab.source": "Source",
  "lab.sentiment": "Sentiment",
  "lab.sec": "s",
  "lab.playerLabel": "Lecteur audio",
  "lab.dropInvalid":
    "Veuillez déposer un fichier audio valide (WAV/MP3/M4A).",
  "lab.errSelectFirst":
    "Sélectionnez d’abord un échantillon ou importez un fichier.",
  "lab.errSampleMissing": "Fichier d’échantillon introuvable",
  "lab.errSampleLoad":
    "Échec du chargement. Exécutez scripts/generate-samples.sh.",
  "lab.errDecode": "Impossible de décoder le fichier. Essayez WAV/MP3.",
  "lab.errTranscribe": "Erreur pendant la transcription.",

  "upload.title": "Importer un fichier",
  "upload.hint":
    "Les échantillons sont dans le catalogue horizontal (vue Détail). Déposez votre WAV/MP3/M4A ici.",
  "upload.drop": "Déposez un fichier audio ici",
  "upload.formats": "WAV · MP3 · M4A — ou cliquez pour choisir",
  "upload.privacy":
    "Audio démo / synthétique uniquement — pas de données personnelles",
  "upload.release":
    "Relâchez pour charger dans le lecteur et le pipeline",
  "upload.invalid":
    "Aucun fichier audio valide. Essayez WAV, MP3 ou M4A.",
  "upload.unsupported": "Type non pris en charge. Importez WAV / MP3 / M4A.",
  "upload.loaded": "Chargé dans le lecteur principal.",

  "nlp.upload.title": "Importer un audio externe",
  "nlp.upload.hint":
    "Déposez ou choisissez un WAV/MP3/M4A dans l’onglet NLP. Après le STT, le sentiment et le NLP navigateur s’appliquent au même transcript.",
  "nlp.upload.loaded": "Chargé — STT en cours pour le NLP.",
  "nlp.upload.processing": "Traitement audio externe : STT → sentiment…",
  "nlp.source.upload":
    "Source : import externe · STT → sentiment prêt · vous pouvez lancer NLP / OpenCode",
  "nlp.source.sample":
    "Source : SAMPLE_CATALOG → MOCK_TRANSCRIPTS · pas besoin d’import / STT Fichier unique",
  "nlp.source.lab": "Source : résultat du lab (onglet Fichier unique)",
  "nlp.source.waiting":
    "En attente d’une source : choisissez un échantillon Common Voice, importez un audio externe ou transcrivez dans l’onglet Fichier unique.",
  "nlp.errNeedSource":
    "Choisissez d’abord un échantillon Common Voice, importez un audio externe ou transcrivez dans l’onglet Fichier unique.",
  "nlp.errUpload": "Erreur lors de l’import audio / du STT.",
  "nlp.errSample": "Erreur lors du chargement de MOCK_TRANSCRIPTS.",

  "stt.title": "Moteur STT local",
  "stt.tools": "outils",
  "stt.aria": "Sélection du moteur STT",
  "stt.recommended": "Recommandé",
  "stt.unavailable": "Indisponible dans ce navigateur",

  "panel.transcript": "Transcript",
  "panel.transcriptEmpty":
    "Pas encore de transcript. Choisissez un échantillon ou importez un fichier, puis appuyez sur « Transcrire ».",
  "panel.transcriptError": "Erreur de transcription",
  "panel.confidence": "Confiance",
  "panel.wordTimings": "Alignements de mots",
  "panel.word": "Mot",
  "panel.start": "Début",
  "panel.end": "Fin",
  "panel.sentiment": "Analyse de sentiment / émotion",
  "panel.sentimentEmpty":
    "Après transcription, le sentiment / l’émotion apparaît ici.",
  "panel.sentimentOffline": "Lexique turc · hors ligne",
  "panel.score": "Score",
  "panel.report": "Rapport d’analyse",
  "panel.reportEmpty": "Rapport pas encore prêt",
  "panel.reportEmptyHint":
    "Transcript, scores, durée, métriques WER-ish et export PDF / TXT / JSON.",
  "panel.reportSubtitle":
    "Résumé fichier · transcript · sentiment · WER · export",
  "panel.metricsEmpty":
    "Après transcription, durée, ratio de parole, silences et mots-clés listés ici.",
  "panel.callDuration": "Durée de l’appel",
  "panel.speakingRatio": "Ratio de parole",
  "panel.speakingHint": "Estimé à partir des horodatages",
  "panel.silenceGaps": "Silences",
  "panel.silenceHint": "Pauses ≥ 0,45 s",
  "panel.sampleRate": "Fréquence d’échantillonnage",
  "panel.avgConfidence": "Confiance moy.",
  "panel.keywordHits": "Occurrences de mots-clés",
  "panel.keywordDemo":
    "Termes démo : enquête, confidentialité, TÜİK, rendez-vous",
  "panel.noMatch": "Aucune correspondance",
  "panel.pipelineStages": "Étapes du pipeline",
  "panel.running": "En cours…",
  "panel.waiting": "En attente",
  "panel.copied": "Copié",
  "panel.copyClipboard": "Copier",
  "panel.duration": "Durée",
  "panel.polarity": "Polarité",
  "panel.approxAccuracy": "Exactitude approx.",
  "panel.asrConfidence": "Confiance ASR",
  "panel.transcriptSummary": "Résumé du transcript",
  "panel.emotionScores": "Scores d’émotion",
  "panel.werQuality": "WER-ish / qualité",
  "panel.noReference": "Pas de référence — exactitude proxy",
  "panel.exportPreview": "Aperçu d’export (texte · comme TXT)",
  "panel.copyFailed": "Échec de la copie. Sélectionnez le texte ci-dessous.",
  "panel.emotion": "Émotion",
  "panel.accuracy": "Exactitude",
  "panel.proxyHint": "proxy de confiance",
  "gate.subtitle": "Laboratoire STT éducatif",
  "gate.splashTitle": "Contenu de ce site",
  "gate.splashLoading": "Préparation de l’interface…",
  "gate.splashReady": "Prêt — vous pouvez continuer",
  "gate.feature.stt": "Audio type centre d’appels → moteurs STT locaux (Mock, Web Speech, démos pipeline)",
  "gate.feature.sentiment": "Analyse de sentiment / émotion en turc (lexique hors ligne)",
  "gate.feature.report": "Métriques, transcript, scores WER-ish et rapports PDF / TXT / JSON",
  "gate.feature.i18n": "Langues UI : TR · EN · FR · CN · JP · AR (arabe en RTL)",
  "gate.feature.local": "Les données restent dans le navigateur ; STT cloud payant non requis",
  "gate.onboardTitle": "Visite rapide",
  "gate.onboard.1": "Choisissez un échantillon ou importez un WAV/MP3/M4A de démo.",
  "gate.onboard.2": "Sélectionnez un moteur STT et lancez Transcrire pour sentiment et rapport.",
  "gate.onboard.3": "La vue Minimal n’affiche que lecteur + forme d’onde ; Détail ouvre le catalogue.",
  "gate.consentTitle": "KVKK et usage correct",
  "gate.consentBody": "Ce laboratoire est éducatif. N’importez pas de vrais appels ALO 124 ni de données personnelles. En production, respectez le KVKK.",
  "gate.consentLocal": "Le consentement et la langue sont stockés en localStorage. L’envoi du formulaire part du navigateur vers Web3Forms.",
  "gate.consentDemo": "Audio synthétique / démo uniquement. Logo en contexte éducatif ; pas un produit officiel TÜİK.",
  "gate.consentCheck": "J’ai lu et j’accepte les conditions KVKK et d’usage correct des données locales.",
  "gate.continue": "Continuer",
  "gate.back": "Retour",
  "gate.accept": "Accepter et commencer",
  "gate.approvedBadge": "Approuvé",
  "gate.formFirstName": "Prénom",
  "gate.formLastName": "Nom",
  "gate.formReason": "Pourquoi utilisez-vous ce laboratoire ?",
  "gate.formReasonPlaceholder": "ex. formation, démo, essai STT interne…",
  "gate.formRequired": "Prénom, nom et motif sont obligatoires.",
  "gate.formConsentRequired": "Veuillez accepter les conditions KVKK / usage correct.",
  "gate.formSubmitError": "Échec de l’envoi. Réessayez.",
  "gate.formSubmitting": "Envoi…",
};

const cn: Dict = {
  "header.eduLine": "面向人工智能转型与人工智能素养培训。",
  "header.description":
    "TÜİK ALO 124 风格呼叫中心音频 → 语音转写 → 情感分析 → 报告。仅合成 / 演示音频；无真实通话或个人数据。无需付费 API。",
  "header.nav.slides": "幻灯片",
  "header.nav.tuik": "TÜİK",
  "header.logoAlt": "TÜİK — 土耳其统计局标志",
  "page.privacyTitle": "隐私说明：",
  "page.privacyBody":
    "本应用仅用于教育。请勿上传真实 ALO 124 录音、公民个人数据或 CATI 答复。生产环境请遵守 KVKK 与机构政策。",
  "page.eduUseTitle": "教育用途：",
  "page.eduUseBody":
    "TÜİK 标志仅在本实验室的教育 / 演示场景中展示；并非官方 TÜİK 产品或授权发布。标志来源：",
  "page.eduUseSource": "tuik.gov.tr",

  "footer.brandRole": "讲师工程师",
  "footer.brandTagline": "speech-to-text-lab · STT 教育实验室",
  "footer.creditAfter": "由该软件公司的资源开发。",
  "footer.eduHeading": "教育用途",
  "footer.eduBody":
    "此处的 ALO 124 并非官方产品，用于教学 TÜİK 风格流程。标志仅在教育 / 演示语境中出现。仅使用合成 / 演示音频。",
  "footer.tryHeading": "试用实验室",
  "footer.tryBody":
    "选择合成或演示音频；在同一界面测试转写、情感与报告。",
  "footer.navSlides": "幻灯片",
  "footer.navTuik": "TÜİK",
  "footer.ariaBrand": "品牌",
  "footer.ariaQuick": "快捷入口",
  "footer.ariaNav": "页脚导航",
  "footer.copy": "© speech-to-text-lab · 教育实验室",
  "footer.logoNote": "标志 © 土耳其统计局 · 教育用途",
  "footer.langAria": "界面语言",

  "lab.ariaWorkspace": "工作区模式",
  "lab.tab.single": "单文件",
  "lab.tab.batch": "批量",
  "lab.tab.nlp": "NLP / OpenCode",
  "lab.step.upload": "上传 / 样例",
  "lab.step.listen": "收听",
  "lab.step.transcribe": "转写",
  "lab.step.sentiment": "情感",
  "lab.step.report": "报告",
  "lab.dropHere": "将音频拖放到此处",
  "lab.formats": "WAV · MP3 · M4A",
  "lab.ariaAudioView": "音频舞台视图",
  "lab.viewMinimal": "精简",
  "lab.viewDetail": "详情",
  "lab.playerTitle": "音频播放器",
  "lab.playerHint": "收听所选样例 — WAV (PCM) + M4A (AAC) 备用",
  "lab.waveformTitle": "波形",
  "lab.noFile": "未选择文件",
  "lab.transcribeBtn": "转写 + 情感分析",
  "lab.transcribing": "处理中：STT → 情感 → 报告…",
  "lab.processed": "已处理",
  "lab.source": "来源",
  "lab.sentiment": "情感",
  "lab.sec": "秒",
  "lab.playerLabel": "音频播放器",
  "lab.dropInvalid": "请拖放有效音频文件（WAV/MP3/M4A）。",
  "lab.errSelectFirst": "请先选择样例或上传文件。",
  "lab.errSampleMissing": "未找到样例文件",
  "lab.errSampleLoad":
    "加载样例失败。请运行 scripts/generate-samples.sh。",
  "lab.errDecode": "无法解码音频。请尝试 WAV/MP3。",
  "lab.errTranscribe": "转写过程中出错。",

  "upload.title": "上传文件",
  "upload.hint":
    "样例在详情视图的横向目录中。请将自己的 WAV/MP3/M4A 拖到此处。",
  "upload.drop": "将音频拖放到此处",
  "upload.formats": "WAV · MP3 · M4A — 也可点击选择",
  "upload.privacy": "仅演示 / 合成音频 — 请勿上传个人数据",
  "upload.release": "松开以加载到主播放器与流水线",
  "upload.invalid": "未找到有效音频。请尝试 WAV、MP3 或 M4A。",
  "upload.unsupported": "不支持的类型。请上传 WAV / MP3 / M4A。",
  "upload.loaded": "已加载到主播放器。",

  "nlp.upload.title": "上传外部音频",
  "nlp.upload.hint":
    "在 NLP 选项卡拖放或选择 WAV/MP3/M4A。STT 后，情感与浏览器 NLP 基于同一转写运行。",
  "nlp.upload.loaded": "已加载 — 正在为 NLP 运行 STT。",
  "nlp.upload.processing": "正在处理外部音频：STT → 情感…",
  "nlp.source.upload":
    "来源：外部上传 · STT → 情感已就绪 · 可运行 NLP / OpenCode",
  "nlp.source.sample":
    "来源：SAMPLE_CATALOG → MOCK_TRANSCRIPTS · 无需上传 / 单文件 STT",
  "nlp.source.lab": "来源：实验室结果（单文件选项卡）",
  "nlp.source.waiting":
    "等待来源：选择 Common Voice 样本、上传外部音频，或在单文件选项卡转写。",
  "nlp.errNeedSource":
    "请先选择 Common Voice 样本、上传外部音频，或在单文件选项卡转写。",
  "nlp.errUpload": "上传外部音频 / 运行 STT 时出错。",
  "nlp.errSample": "加载样本 MOCK_TRANSCRIPTS 时出错。",

  "stt.title": "本地 STT 引擎",
  "stt.tools": "工具",
  "stt.aria": "STT 引擎选择",
  "stt.recommended": "推荐",
  "stt.unavailable": "此浏览器不可用",

  "panel.transcript": "转写文本",
  "panel.transcriptEmpty":
    "尚无转写。请选择样例或上传文件并点击“转写”。",
  "panel.transcriptError": "转写错误",
  "panel.confidence": "置信度",
  "panel.wordTimings": "词级时间戳",
  "panel.word": "词",
  "panel.start": "开始",
  "panel.end": "结束",
  "panel.sentiment": "情感 / 情绪分析",
  "panel.sentimentEmpty": "转写完成后，情感 / 情绪结果将显示于此。",
  "panel.sentimentOffline": "土耳其语词典 · 离线",
  "panel.score": "分数",
  "panel.report": "分析报告",
  "panel.reportEmpty": "分析报告尚未就绪",
  "panel.reportEmptyHint":
    "转写、情感分数、时长、WER 类指标与 PDF / TXT / JSON 导出集中于此。",
  "panel.reportSubtitle": "单文件摘要 · 转写 · 情感 · WER · 导出",
  "panel.metricsEmpty":
    "转写后，时长、说话比例、静音与关键词指标将列于此。",
  "panel.callDuration": "通话时长",
  "panel.speakingRatio": "说话比例",
  "panel.speakingHint": "由词时间戳估计",
  "panel.silenceGaps": "静音间隔",
  "panel.silenceHint": "≥ 0.45 秒的间隙",
  "panel.sampleRate": "采样率",
  "panel.avgConfidence": "平均置信度",
  "panel.keywordHits": "关键词命中",
  "panel.keywordDemo": "演示词：调查、隐私、TÜİK、预约",
  "panel.noMatch": "无匹配",
  "panel.pipelineStages": "流水线阶段",
  "panel.running": "运行中…",
  "panel.waiting": "等待中",
  "panel.copied": "已复制",
  "panel.copyClipboard": "复制到剪贴板",
  "panel.duration": "时长",
  "panel.polarity": "极性",
  "panel.approxAccuracy": "近似准确率",
  "panel.asrConfidence": "ASR 置信度",
  "panel.transcriptSummary": "转写摘要",
  "panel.emotionScores": "情绪分数",
  "panel.werQuality": "WER 类 / 质量",
  "panel.noReference": "无参考 — 使用代理准确率",
  "panel.exportPreview": "导出预览（纯文本 · 与 TXT 相同）",
  "panel.copyFailed": "复制失败。请选择下方文本手动复制。",
  "panel.emotion": "情绪",
  "panel.accuracy": "准确率",
  "panel.proxyHint": "置信度代理",
  "gate.subtitle": "教育用途语音转写实验室",
  "gate.splashTitle": "本站功能",
  "gate.splashLoading": "正在准备界面…",
  "gate.splashReady": "就绪 — 可以继续",
  "gate.feature.stt": "呼叫中心风格音频 → 本地 STT 引擎（Mock、Web Speech、流水线演示）",
  "gate.feature.sentiment": "土耳其语情感 / 情绪分析（离线词典）",
  "gate.feature.report": "指标、转写、WER 类分数与 PDF / TXT / JSON 报告",
  "gate.feature.i18n": "界面语言：TR · EN · FR · CN · JP · AR（阿拉伯语为 RTL）",
  "gate.feature.local": "数据留在浏览器；无需付费云端 STT",
  "gate.onboardTitle": "快速导览",
  "gate.onboard.1": "选择样例或上传自己的演示 WAV/MP3/M4A。",
  "gate.onboard.2": "选择 STT 引擎并运行转写以获得情感与报告。",
  "gate.onboard.3": "精简视图仅显示播放器 + 波形；详情视图打开目录与卡片。",
  "gate.consentTitle": "KVKK 与正确使用",
  "gate.consentBody": "本实验室仅用于教育。请勿上传真实 ALO 124 录音或个人数据。生产环境请遵守 KVKK。",
  "gate.consentLocal": "同意与语言偏好保存在本机 localStorage。表单由浏览器直接提交至 Web3Forms。",
  "gate.consentDemo": "仅使用合成 / 演示音频。标志为教育 / 演示语境；非官方 TÜİK 产品。",
  "gate.consentCheck": "我已阅读并接受 KVKK 与本地数据 / 正确使用条款。",
  "gate.continue": "继续",
  "gate.back": "返回",
  "gate.accept": "接受并开始",
  "gate.approvedBadge": "已批准",
  "gate.formFirstName": "名",
  "gate.formLastName": "姓",
  "gate.formReason": "您为何使用本实验室？",
  "gate.formReasonPlaceholder": "例如：培训、演示、内部 STT 练习…",
  "gate.formRequired": "姓名与使用原因均为必填。",
  "gate.formConsentRequired": "请勾选 KVKK / 正确使用条款以继续。",
  "gate.formSubmitError": "提交失败，请重试。",
  "gate.formSubmitting": "提交中…",
};

const jp: Dict = {
  "header.eduLine":
    "AI 変革および AI リテラシー研修向けに作成されています。",
  "header.description":
    "TÜİK ALO 124 風コールセンター音声 → STT → 感情分析 → レポート。合成 / デモ音声のみ。実通話や個人データはありません。有料 API 不要。",
  "header.nav.slides": "スライド",
  "header.nav.tuik": "TÜİK",
  "header.logoAlt": "TÜİK — トルコ統計機構ロゴ",
  "page.privacyTitle": "プライバシー注記：",
  "page.privacyBody":
    "本アプリは教育用途です。実際の ALO 124 録音、市民の個人データ、CATI 回答をアップロードしないでください。本番では KVKK と機関ポリシーに従ってください。",
  "page.eduUseTitle": "教育用途：",
  "page.eduUseBody":
    "TÜİK ロゴはこのラボの教育 / デモ文脈でのみ表示されます。公式製品や承認済み公開物ではありません。ロゴ出典：",
  "page.eduUseSource": "tuik.gov.tr",

  "footer.brandRole": "講師エンジニア",
  "footer.brandTagline": "speech-to-text-lab · STT 教育ラボ",
  "footer.creditAfter": "ソフトウェア企業のリソースで開発されました。",
  "footer.eduHeading": "教育用途",
  "footer.eduBody":
    "ここでの ALO 124 は公式製品ではなく、TÜİK 風プロセスを教えるためのものです。ロゴは教育 / デモ文脈のみ。合成 / デモ音声のみ使用。",
  "footer.tryHeading": "ラボを試す",
  "footer.tryBody":
    "合成またはデモ音声を選び、STT・感情・レポートを一か所で試せます。",
  "footer.navSlides": "スライド",
  "footer.navTuik": "TÜİK",
  "footer.ariaBrand": "ブランド",
  "footer.ariaQuick": "クイックアクセス",
  "footer.ariaNav": "フッターナビ",
  "footer.copy": "© speech-to-text-lab · 教育ラボ",
  "footer.logoNote": "ロゴ © トルコ統計機構 · 教育用途",
  "footer.langAria": "UI 言語",

  "lab.ariaWorkspace": "ワークスペースモード",
  "lab.tab.single": "単一ファイル",
  "lab.tab.batch": "一括",
  "lab.tab.nlp": "NLP / OpenCode",
  "lab.step.upload": "アップロード / サンプル",
  "lab.step.listen": "再生",
  "lab.step.transcribe": "書き起こし",
  "lab.step.sentiment": "感情",
  "lab.step.report": "レポート",
  "lab.dropHere": "音声ファイルをここにドロップ",
  "lab.formats": "WAV · MP3 · M4A",
  "lab.ariaAudioView": "音声ステージ表示",
  "lab.viewMinimal": "ミニマル",
  "lab.viewDetail": "詳細",
  "lab.playerTitle": "音声プレーヤー",
  "lab.playerHint":
    "選択サンプルを聴く — WAV (PCM) + M4A (AAC) フォールバック",
  "lab.waveformTitle": "波形",
  "lab.noFile": "ファイル未選択",
  "lab.transcribeBtn": "書き起こし + 感情分析",
  "lab.transcribing": "処理中：STT → 感情 → レポート…",
  "lab.processed": "処理済み",
  "lab.source": "ソース",
  "lab.sentiment": "感情",
  "lab.sec": "秒",
  "lab.playerLabel": "音声プレーヤー",
  "lab.dropInvalid": "有効な音声ファイルをドロップしてください（WAV/MP3/M4A）。",
  "lab.errSelectFirst": "先にサンプルを選ぶかファイルをアップロードしてください。",
  "lab.errSampleMissing": "サンプルファイルが見つかりません",
  "lab.errSampleLoad":
    "サンプル読み込みに失敗。scripts/generate-samples.sh を実行してください。",
  "lab.errDecode": "音声を解読できません。WAV/MP3 を試してください。",
  "lab.errTranscribe": "書き起こし中にエラーが発生しました。",

  "upload.title": "ファイルをアップロード",
  "upload.hint":
    "サンプルは詳細ビューの横カタログにあります。WAV/MP3/M4A をここにドロップ。",
  "upload.drop": "音声ファイルをここにドロップ",
  "upload.formats": "WAV · MP3 · M4A — クリックでも選択可",
  "upload.privacy": "デモ / 合成音声のみ — 個人データをアップロードしないでください",
  "upload.release": "離すとメインプレーヤーとパイプラインに読み込みます",
  "upload.invalid": "有効な音声がありません。WAV、MP3、M4A を試してください。",
  "upload.unsupported": "未対応の形式です。WAV / MP3 / M4A をアップロード。",
  "upload.loaded": "メインプレーヤーに読み込みました。",

  "nlp.upload.title": "外部音声をアップロード",
  "nlp.upload.hint":
    "NLP タブで WAV/MP3/M4A をドロップまたは選択。STT 後、感情とブラウザ NLP は同じ文字起こしで動きます。",
  "nlp.upload.loaded": "読み込み済み — NLP 用に STT を実行中。",
  "nlp.upload.processing": "外部音声を処理中：STT → 感情…",
  "nlp.source.upload":
    "ソース：外部アップロード · STT → 感情準備完了 · NLP / OpenCode を実行できます",
  "nlp.source.sample":
    "ソース：SAMPLE_CATALOG → MOCK_TRANSCRIPTS · アップロード / 単一ファイル STT 不要",
  "nlp.source.lab": "ソース：ラボ結果（単一ファイルタブ）",
  "nlp.source.waiting":
    "ソース待ち：Common Voice サンプルを選ぶ、外部音声をアップロード、または単一ファイルタブで文字起こし。",
  "nlp.errNeedSource":
    "先に Common Voice サンプルを選ぶ、外部音声をアップロード、または単一ファイルタブで文字起こししてください。",
  "nlp.errUpload": "外部音声のアップロード / STT 中にエラーが発生しました。",
  "nlp.errSample": "サンプル MOCK_TRANSCRIPTS の読み込み中にエラーが発生しました。",

  "stt.title": "ローカル STT エンジン",
  "stt.tools": "ツール",
  "stt.aria": "STT エンジン選択",
  "stt.recommended": "推奨",
  "stt.unavailable": "このブラウザでは不可",

  "panel.transcript": "書き起こし",
  "panel.transcriptEmpty":
    "まだ書き起こしがありません。サンプルを選ぶかアップロードし、「書き起こし」を押してください。",
  "panel.transcriptError": "書き起こしエラー",
  "panel.confidence": "信頼度",
  "panel.wordTimings": "単語タイミング",
  "panel.word": "単語",
  "panel.start": "開始",
  "panel.end": "終了",
  "panel.sentiment": "感情 / 情動分析",
  "panel.sentimentEmpty":
    "書き起こし後、感情 / 情動がここに表示されます。",
  "panel.sentimentOffline": "トルコ語辞書 · オフライン",
  "panel.score": "スコア",
  "panel.report": "分析レポート",
  "panel.reportEmpty": "分析レポートはまだありません",
  "panel.reportEmptyHint":
    "書き起こし、感情スコア、長さ、WER 系指標、PDF / TXT / JSON エクスポートがここに集まります。",
  "panel.reportSubtitle":
    "単一ファイル要約 · 書き起こし · 感情 · WER · エクスポート",
  "panel.metricsEmpty":
    "書き起こし後、長さ・発話比率・無音・キーワード指標がここに並びます。",
  "panel.callDuration": "通話時間",
  "panel.speakingRatio": "発話比率",
  "panel.speakingHint": "単語タイムスタンプから推定",
  "panel.silenceGaps": "無音ギャップ",
  "panel.silenceHint": "≥ 0.45 秒の間",
  "panel.sampleRate": "サンプリングレート",
  "panel.avgConfidence": "平均信頼度",
  "panel.keywordHits": "キーワード一致",
  "panel.keywordDemo": "デモ用語：調査、プライバシー、TÜİK、予約",
  "panel.noMatch": "一致なし",
  "panel.pipelineStages": "パイプライン段階",
  "panel.running": "実行中…",
  "panel.waiting": "待機中",
  "panel.copied": "コピー済み",
  "panel.copyClipboard": "クリップボードにコピー",
  "panel.duration": "長さ",
  "panel.polarity": "極性",
  "panel.approxAccuracy": "おおよその精度",
  "panel.asrConfidence": "ASR 信頼度",
  "panel.transcriptSummary": "書き起こし要約",
  "panel.emotionScores": "情動スコア",
  "panel.werQuality": "WER 系 / 品質",
  "panel.noReference": "参照なし — プロキシ精度を使用",
  "panel.exportPreview": "エクスポートプレビュー（プレーンテキスト · TXT と同じ）",
  "panel.copyFailed": "コピー失敗。下のテキストを選択してコピーしてください。",
  "panel.emotion": "情動",
  "panel.accuracy": "精度",
  "panel.proxyHint": "信頼度プロキシ",
  "gate.subtitle": "教育向け STT ラボ",
  "gate.splashTitle": "このサイトの内容",
  "gate.splashLoading": "インターフェースを準備中…",
  "gate.splashReady": "準備完了 — 続行できます",
  "gate.feature.stt": "コールセンター風音声 → ローカル STT（Mock、Web Speech、パイプラインデモ）",
  "gate.feature.sentiment": "トルコ語の感情 / 情動分析（オフライン辞書）",
  "gate.feature.report": "指標、書き起こし、WER 系スコア、PDF / TXT / JSON レポート",
  "gate.feature.i18n": "UI 言語：TR · EN · FR · CN · JP · AR（アラビア語は RTL）",
  "gate.feature.local": "データはブラウザ内；有料クラウド STT は不要",
  "gate.onboardTitle": "短いツアー",
  "gate.onboard.1": "サンプルを選ぶか、デモ WAV/MP3/M4A をアップロードします。",
  "gate.onboard.2": "STT エンジンを選び、書き起こしで感情とレポートを得ます。",
  "gate.onboard.3": "ミニマルはプレーヤー + 波形のみ；詳細はカタログとカードを開きます。",
  "gate.consentTitle": "KVKK と正しい利用",
  "gate.consentBody": "本ラボは教育用途です。実 ALO 124 録音や個人データをアップロードしないでください。本番では KVKK に従ってください。",
  "gate.consentLocal": "同意と言語は localStorage に保存されます。フォーム送信はブラウザから Web3Forms へ直接送られます。",
  "gate.consentDemo": "合成 / デモ音声のみ。ロゴは教育 / デモ文脈；公式 TÜİK 製品ではありません。",
  "gate.consentCheck": "KVKK およびローカルデータ / 正しい利用条件を読み、同意します。",
  "gate.continue": "続ける",
  "gate.back": "戻る",
  "gate.accept": "同意して開始",
  "gate.approvedBadge": "承認済み",
  "gate.formFirstName": "名",
  "gate.formLastName": "姓",
  "gate.formReason": "このラボを使う理由は？",
  "gate.formReasonPlaceholder": "例：研修、デモ、社内 STT 練習…",
  "gate.formRequired": "名・姓・利用理由は必須です。",
  "gate.formConsentRequired": "続行するには KVKK / 正しい利用への同意が必要です。",
  "gate.formSubmitError": "送信に失敗しました。再試行してください。",
  "gate.formSubmitting": "送信中…",
};

const ar: Dict = {
  "header.eduLine":
    "ضمن تدريب تحوّل الذكاء الاصطناعي ومحو أمية الذكاء الاصطناعي.",
  "header.description":
    "صوت مركز اتصال بأسلوب TÜİK ALO 124 ← تحويل كلام إلى نص ← مشاعر ← تقرير. صوت تركيبي / تجريبي فقط؛ بلا تسجيلات حقيقية أو بيانات شخصية. لا حاجة لواجهات مدفوعة.",
  "header.nav.slides": "الشرائح",
  "header.nav.tuik": "TÜİK",
  "header.logoAlt": "TÜİK — شعار معهد الإحصاء التركي",
  "page.privacyTitle": "ملاحظة الخصوصية:",
  "page.privacyBody":
    "هذا التطبيق تعليمي فقط. لا ترفع تسجيلات ALO 124 الحقيقية أو بيانات شخصية أو إجابات CATI. في الإنتاج التزم بـ KVKK وسياسات المؤسسة.",
  "page.eduUseTitle": "استخدام تعليمي:",
  "page.eduUseBody":
    "يُعرض شعار TÜİK فقط في سياق التعليم / العرض لهذا المختبر؛ وليس منتجًا رسميًا. مصدر الشعار:",
  "page.eduUseSource": "tuik.gov.tr",

  "footer.brandRole": "مهندس مدرّب",
  "footer.brandTagline": "speech-to-text-lab · مختبر تعليم STT",
  "footer.creditAfter": "طُوّر بموارد شركة البرمجيات.",
  "footer.eduHeading": "استخدام تعليمي",
  "footer.eduBody":
    "ALO 124 هنا ليس منتجًا رسميًا؛ صُمّم لتعليم عمليات بأسلوب TÜİK. الشعار للتعليم / العرض فقط. صوت تركيبي / تجريبي بلا بيانات شخصية حقيقية.",
  "footer.tryHeading": "جرّب المختبر",
  "footer.tryBody":
    "اختر مقطعًا تركيبيًا أو تجريبيًا؛ اختبر التحويل والمشاعر والتقرير في مكان واحد.",
  "footer.navSlides": "الشرائح",
  "footer.navTuik": "TÜİK",
  "footer.ariaBrand": "العلامة",
  "footer.ariaQuick": "وصول سريع",
  "footer.ariaNav": "تنقل التذييل",
  "footer.copy": "© speech-to-text-lab · مختبر تعليمي",
  "footer.logoNote": "الشعار © معهد الإحصاء التركي · استخدام تعليمي",
  "footer.langAria": "لغة الواجهة",

  "lab.ariaWorkspace": "وضع مساحة العمل",
  "lab.tab.single": "ملف واحد",
  "lab.tab.batch": "دفعة",
  "lab.tab.nlp": "NLP / OpenCode",
  "lab.step.upload": "رفع / عيّنة",
  "lab.step.listen": "استماع",
  "lab.step.transcribe": "تحويل",
  "lab.step.sentiment": "مشاعر",
  "lab.step.report": "تقرير",
  "lab.dropHere": "أسقط ملف الصوت هنا",
  "lab.formats": "WAV · MP3 · M4A",
  "lab.ariaAudioView": "عرض مسرح الصوت",
  "lab.viewMinimal": "مبسّط",
  "lab.viewDetail": "تفصيلي",
  "lab.playerTitle": "مشغّل الصوت",
  "lab.playerHint":
    "استمع للعيّنة — WAV (PCM) مع احتياطي M4A (AAC)",
  "lab.waveformTitle": "شكل الموجة",
  "lab.noFile": "لم يُختَر ملف",
  "lab.transcribeBtn": "تحويل + تحليل المشاعر",
  "lab.transcribing": "جارٍ المعالجة: STT ← مشاعر ← تقرير…",
  "lab.processed": "تمت المعالجة",
  "lab.source": "المصدر",
  "lab.sentiment": "المشاعر",
  "lab.sec": "ث",
  "lab.playerLabel": "مشغّل الصوت",
  "lab.dropInvalid": "يرجى إسقاط ملف صوت صالح (WAV/MP3/M4A).",
  "lab.errSelectFirst": "اختر عيّنة أو ارفع ملفًا أولًا.",
  "lab.errSampleMissing": "ملف العيّنة غير موجود",
  "lab.errSampleLoad":
    "فشل تحميل العيّنة. شغّل scripts/generate-samples.sh.",
  "lab.errDecode": "تعذّر فك ترميز الصوت. جرّب WAV/MP3.",
  "lab.errTranscribe": "حدث خطأ أثناء التحويل.",

  "upload.title": "رفع ملف",
  "upload.hint":
    "العيّنات في الكتالوج الأفقي بوضع التفصيل. أسقط WAV/MP3/M4A هنا.",
  "upload.drop": "أسقط ملف الصوت هنا",
  "upload.formats": "WAV · MP3 · M4A — أو انقر للاختيار",
  "upload.privacy": "صوت تجريبي / تركيبي فقط — لا ترفع بيانات شخصية",
  "upload.release": "أفلت للتحميل إلى المشغّل وخط الأنابيب",
  "upload.invalid": "لم يُعثر على صوت صالح. جرّب WAV أو MP3 أو M4A.",
  "upload.unsupported": "نوع غير مدعوم. ارفع WAV / MP3 / M4A.",
  "upload.loaded": "حُمّل إلى المشغّل الرئيسي.",

  "nlp.upload.title": "رفع صوت خارجي",
  "nlp.upload.hint":
    "أسقط أو اختر WAV/MP3/M4A في تبويب NLP. بعد التحويل، يعمل تحليل المشاعر وNLP المتصفح على نفس النص.",
  "nlp.upload.loaded": "حُمّل — جارٍ تشغيل STT لـ NLP.",
  "nlp.upload.processing": "جارٍ معالجة الصوت الخارجي: STT → مشاعر…",
  "nlp.source.upload":
    "المصدر: رفع خارجي · STT → المشاعر جاهزة · يمكنك تشغيل NLP / OpenCode",
  "nlp.source.sample":
    "المصدر: SAMPLE_CATALOG → MOCK_TRANSCRIPTS · لا حاجة للرفع / STT الملف الواحد",
  "nlp.source.lab": "المصدر: نتيجة المختبر (تبويب الملف الواحد)",
  "nlp.source.waiting":
    "بانتظار مصدر: اختر عيّنة Common Voice، أو ارفع صوتًا خارجيًا، أو انسخ في تبويب الملف الواحد.",
  "nlp.errNeedSource":
    "اختر أولًا عيّنة Common Voice، أو ارفع صوتًا خارجيًا، أو انسخ في تبويب الملف الواحد.",
  "nlp.errUpload": "خطأ أثناء رفع الصوت الخارجي / تشغيل STT.",
  "nlp.errSample": "خطأ أثناء تحميل عيّنة MOCK_TRANSCRIPTS.",

  "stt.title": "محرّك STT محلي",
  "stt.tools": "أدوات",
  "stt.aria": "اختيار محرّك STT",
  "stt.recommended": "موصى به",
  "stt.unavailable": "غير متاح في هذا المتصفح",

  "panel.transcript": "النص المحوَّل",
  "panel.transcriptEmpty":
    "لا يوجد نص بعد. اختر عيّنة أو ارفع ملفًا ثم اضغط «تحويل».",
  "panel.transcriptError": "خطأ في التحويل",
  "panel.confidence": "الثقة",
  "panel.wordTimings": "توقيت الكلمات",
  "panel.word": "كلمة",
  "panel.start": "بداية",
  "panel.end": "نهاية",
  "panel.sentiment": "تحليل المشاعر / العاطفة",
  "panel.sentimentEmpty":
    "بعد التحويل تظهر المشاعر / العاطفة هنا.",
  "panel.sentimentOffline": "معجم تركي · دون اتصال",
  "panel.score": "الدرجة",
  "panel.report": "تقرير التحليل",
  "panel.reportEmpty": "تقرير التحليل غير جاهز بعد",
  "panel.reportEmptyHint":
    "النص والدرجات والمدة ومقاييس شبيهة بـ WER وتصدير PDF / TXT / JSON تتجمع هنا.",
  "panel.reportSubtitle":
    "ملخص ملف واحد · نص · مشاعر · WER · تصدير",
  "panel.metricsEmpty":
    "بعد التحويل تُدرج المدة ونسبة الكلام والصمت والكلمات المفتاحية هنا.",
  "panel.callDuration": "مدة المكالمة",
  "panel.speakingRatio": "نسبة الكلام",
  "panel.speakingHint": "تقدير من طوابع زمن الكلمات",
  "panel.silenceGaps": "فجوات الصمت",
  "panel.silenceHint": "فجوات ≥ 0.45 ث",
  "panel.sampleRate": "معدل العيّنة",
  "panel.avgConfidence": "متوسط الثقة",
  "panel.keywordHits": "مطابقات الكلمات المفتاحية",
  "panel.keywordDemo": "مصطلحات تجريبية: استبيان، خصوصية، TÜİK، موعد",
  "panel.noMatch": "لا مطابقات",
  "panel.pipelineStages": "مراحل خط الأنابيب",
  "panel.running": "يعمل…",
  "panel.waiting": "في الانتظار",
  "panel.copied": "تم النسخ",
  "panel.copyClipboard": "نسخ إلى الحافظة",
  "panel.duration": "المدة",
  "panel.polarity": "القطبية",
  "panel.approxAccuracy": "دقة تقريبية",
  "panel.asrConfidence": "ثقة ASR",
  "panel.transcriptSummary": "ملخص النص",
  "panel.emotionScores": "درجات العاطفة",
  "panel.werQuality": "WER-ish / الجودة",
  "panel.noReference": "لا مرجع — استُخدمت دقة وكيلة",
  "panel.exportPreview": "معاينة التصدير (نص عادي · مثل TXT)",
  "panel.copyFailed": "فشل النسخ. حدّد النص أدناه وانسخه.",
  "panel.emotion": "العاطفة",
  "panel.accuracy": "الدقة",
  "panel.proxyHint": "وكيل ثقة",
  "gate.subtitle": "مختبر STT تعليمي",
  "gate.splashTitle": "ما يشمله هذا الموقع",
  "gate.splashLoading": "جارٍ تجهيز الواجهة…",
  "gate.splashReady": "جاهز — يمكنك المتابعة",
  "gate.feature.stt": "صوت بأسلوب مركز اتصال ← محركات STT محلية (Mock، Web Speech، عروض خط الأنابيب)",
  "gate.feature.sentiment": "تحليل مشاعر / عاطفة بالتركية (معجم دون اتصال)",
  "gate.feature.report": "مقاييس ونص ودرجات شبيهة بـ WER وتقارير PDF / TXT / JSON",
  "gate.feature.i18n": "لغات الواجهة: TR · EN · FR · CN · JP · AR (العربية من اليمين لليسار)",
  "gate.feature.local": "البيانات تبقى في المتصفح؛ لا حاجة لـ STT سحابي مدفوع",
  "gate.onboardTitle": "جولة قصيرة",
  "gate.onboard.1": "اختر عيّنة أو ارفع ملف WAV/MP3/M4A تجريبيًا.",
  "gate.onboard.2": "اختر محرك STT وشغّل التحويل للحصول على المشاعر والتقرير.",
  "gate.onboard.3": "العرض المبسّط يعرض المشغّل + الموجة فقط؛ التفصيلي يفتح الكتالوج.",
  "gate.consentTitle": "KVKK والاستخدام الصحيح",
  "gate.consentBody": "هذا المختبر للتعليم فقط. لا ترفع تسجيلات ALO 124 الحقيقية أو بيانات شخصية. في الإنتاج التزم بـ KVKK.",
  "gate.consentLocal": "يُحفظ الموافقة واللغة في localStorage. يُرسل النموذج من المتصفح مباشرة إلى Web3Forms.",
  "gate.consentDemo": "استخدم صوتًا تركيبيًا / تجريبيًا فقط. الشعار في سياق تعليمي؛ ليس منتج TÜİK رسميًا.",
  "gate.consentCheck": "قرأت وأوافق على شروط KVKK والبيانات المحلية / الاستخدام الصحيح.",
  "gate.continue": "متابعة",
  "gate.back": "رجوع",
  "gate.accept": "قبول والبدء",
  "gate.approvedBadge": "موافق عليه",
  "gate.formFirstName": "الاسم الأول",
  "gate.formLastName": "اسم العائلة",
  "gate.formReason": "لماذا تستخدم هذا المختبر؟",
  "gate.formReasonPlaceholder": "مثلًا: تدريب، عرض، تجربة STT داخلية…",
  "gate.formRequired": "الاسم الأول واسم العائلة والسبب مطلوبة.",
  "gate.formConsentRequired": "يرجى قبول شروط KVKK / الاستخدام الصحيح للمتابعة.",
  "gate.formSubmitError": "فشل الإرسال. حاول مرة أخرى.",
  "gate.formSubmitting": "جارٍ الإرسال…",
};

export const DICTIONARIES: Record<Locale, Dict> = {
  tr,
  en,
  fr,
  cn,
  jp,
  ar,
};

export type TranslationKey = keyof Dict;

/** Look up a chrome string. Falls back to Turkish, then the key. */
export function t(locale: Locale, key: TranslationKey): string {
  return DICTIONARIES[locale][key] ?? DICTIONARIES.tr[key] ?? key;
}

export function getDictionary(locale: Locale): Dict {
  return DICTIONARIES[locale] ?? DICTIONARIES.tr;
}
