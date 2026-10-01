import { MOCK_TRANSCRIPTS, SAMPLE_CATALOG, resolveSampleId } from "./constants";
import { attachMockTimings, runMockAsr } from "./mock-stt";
import { computeMetricsFromWords } from "./metrics";
import { runKeywordSpotAsr } from "./keyword-spot-stt";
import { runPipelineStagesAsr } from "./pipeline-stt";
import { analyzeSentiment } from "./sentiment";
import type { SttMode } from "./stt-modes";
import { supportsWebSpeech } from "./stt-modes";
import { runVadNgramHybridAsr } from "./vad-ngram-stt";
import { computeWer, estimateAccuracyFromConfidence } from "./wer";
import type { LabResult, PipelineStage, TranscriptResult } from "./types";

export type { SttMode } from "./stt-modes";
export {
  STT_MODES,
  getSttModeMeta,
  sttModeHasStages,
  supportsWebSpeech,
} from "./stt-modes";

/**
 * Attempt Web Speech API recognition.
 * Many browsers only support microphone input; on failure callers fall back to mock ASR.
 */
export async function tryWebSpeechFromAudio(
  audioUrl: string,
  language = "tr-TR"
): Promise<{ text: string; confidence: number } | null> {
  if (!supportsWebSpeech()) return null;

  const SpeechRecognitionCtor =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
      }
    ).SpeechRecognition ||
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognition;
      }
    ).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) return null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: { text: string; confidence: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const parts: string[] = [];
    let confSum = 0;
    let confCount = 0;

    const timeout = window.setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      if (parts.length) {
        finish({
          text: parts.join(" ").trim(),
          confidence: confCount ? confSum / confCount : 0.7,
        });
      } else {
        finish(null);
      }
    }, 12000);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          parts.push(result[0].transcript);
          confSum += result[0].confidence || 0.75;
          confCount++;
        }
      }
    };

    recognition.onerror = () => {
      window.clearTimeout(timeout);
      finish(null);
    };

    recognition.onend = () => {
      window.clearTimeout(timeout);
      if (parts.length) {
        finish({
          text: parts.join(" ").trim(),
          confidence: confCount ? confSum / confCount : 0.7,
        });
      } else {
        finish(null);
      }
    };

    try {
      recognition.start();
      void audioUrl;
    } catch {
      window.clearTimeout(timeout);
      finish(null);
    }
  });
}

function resolveReferenceText(fileName: string): string | null {
  const sampleId = resolveSampleId(fileName);
  if (sampleId === "default") return null;
  return MOCK_TRANSCRIPTS[sampleId]?.text ?? null;
}

function mockTranscript(
  fileName: string,
  durationSec: number,
  sampleRate: number
): TranscriptResult {
  const mock = runMockAsr({ fileName, durationSec, sampleRate });
  return {
    text: mock.text,
    words: mock.words,
    confidence: mock.confidence,
    durationSec,
    sampleRate,
    source: "mock-asr",
    language: mock.language,
  };
}

export async function runLabPipeline(options: {
  fileName: string;
  durationSec: number;
  sampleRate: number;
  mode?: SttMode;
  audioUrl?: string;
  onPipelineStage?: (stage: PipelineStage) => void;
}): Promise<LabResult> {
  const mode: SttMode = options.mode ?? "mock";
  let transcript: TranscriptResult;
  let pipelineStages: PipelineStage[] | undefined;

  if (mode === "pipeline") {
    const pipe = await runPipelineStagesAsr({
      fileName: options.fileName,
      durationSec: options.durationSec,
      sampleRate: options.sampleRate,
      onStage: options.onPipelineStage,
    });
    pipelineStages = pipe.stages;
    transcript = {
      text: pipe.text,
      words: pipe.words,
      confidence: pipe.confidence,
      durationSec: options.durationSec,
      sampleRate: options.sampleRate,
      source: "pipeline-stages",
      language: pipe.language,
    };
  } else if (mode === "vad-ngram") {
    const hybrid = await runVadNgramHybridAsr({
      fileName: options.fileName,
      durationSec: options.durationSec,
      sampleRate: options.sampleRate,
      onStage: options.onPipelineStage,
    });
    pipelineStages = hybrid.stages;
    transcript = {
      text: hybrid.text,
      words: hybrid.words,
      confidence: hybrid.confidence,
      durationSec: options.durationSec,
      sampleRate: options.sampleRate,
      source: "vad-ngram-hybrid",
      language: hybrid.language,
    };
  } else if (mode === "keyword-spot") {
    const kw = await runKeywordSpotAsr({
      fileName: options.fileName,
      durationSec: options.durationSec,
      sampleRate: options.sampleRate,
      onStage: options.onPipelineStage,
    });
    pipelineStages = kw.stages;
    transcript = {
      text: kw.text,
      words: kw.words,
      confidence: kw.confidence,
      durationSec: options.durationSec,
      sampleRate: options.sampleRate,
      source: "keyword-spot",
      language: kw.language,
    };
  } else if (mode === "web-speech") {
    const mock = mockTranscript(
      options.fileName,
      options.durationSec,
      options.sampleRate
    );

    let webText: string | null = null;
    let webConf = 0;
    if (options.audioUrl) {
      const web = await tryWebSpeechFromAudio(options.audioUrl);
      if (web?.text) {
        webText = web.text;
        webConf = web.confidence;
      }
    }

    if (webText) {
      const words = attachMockTimings(
        webText,
        options.durationSec,
        options.fileName
      );
      transcript = {
        text: webText,
        words,
        confidence: webConf || mock.confidence,
        durationSec: options.durationSec,
        sampleRate: options.sampleRate,
        source: "hybrid",
        language: "tr-TR",
      };
    } else {
      transcript = mock;
    }
  } else {
    // mock (default)
    transcript = mockTranscript(
      options.fileName,
      options.durationSec,
      options.sampleRate
    );
  }

  const metrics = computeMetricsFromWords({
    words: transcript.words,
    durationSec: options.durationSec,
    sampleRate: options.sampleRate,
    text: transcript.text,
  });

  const sentiment = analyzeSentiment(transcript.text);

  const reference = resolveReferenceText(options.fileName);
  const wer = reference
    ? computeWer(reference, transcript.text)
    : estimateAccuracyFromConfidence(transcript.confidence);

  return {
    transcript,
    metrics,
    sentiment,
    wer,
    fileName: options.fileName,
    processedAt: new Date().toISOString(),
    pipelineStages,
  };
}

/** Parse SAMPLE_CATALOG durationHint like "~6 sn" / "~42 sn" → seconds. */
export function parseDurationHint(hint?: string): number {
  if (!hint) return 8;
  const m = hint.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 8;
}

/**
 * Build a LabResult from SAMPLE_CATALOG + MOCK_TRANSCRIPTS without audio upload
 * or prior Tek dosya STT. Used by the NLP / OpenCode tab sample picker.
 */
export async function labResultFromSampleFileName(
  fileName: string
): Promise<LabResult> {
  const sample = SAMPLE_CATALOG.find((s) => s.fileName === fileName);
  const durationSec = parseDurationHint(sample?.durationHint);
  return runLabPipeline({
    fileName,
    durationSec,
    sampleRate: 16000,
    mode: "mock",
  });
}
