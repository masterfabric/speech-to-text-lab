<p align="center">
  <img src="public/brand/tuik-logo.svg" alt="TÜİK — Turkish Statistical Institute logo" width="128" />
</p>

<h1 align="center">speech-to-text-lab</h1>

<p align="center">
  <strong>Educational ALO 124 / TÜİK-style speech-to-text laboratory</strong><br />
  End-to-end lab: <code>audio → STT → sentiment → report</code><br />
  Synthetic / demo audio only · Local-first · Not an official TÜİK product
</p>

<p align="center">
  <a href="https://github.com/masterfabric/speech-to-text-lab/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-ae1615?style=flat-square" /></a>
  <a href="https://github.com/masterfabric/speech-to-text-lab"><img alt="Repo" src="https://img.shields.io/badge/github-masterfabric%2Fspeech--to--text--lab-111111?style=flat-square" /></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="Port" src="https://img.shields.io/badge/dev%20port-43123-ae1615?style=flat-square" />
  <img alt="Privacy" src="https://img.shields.io/badge/PII-demo%20only-0a7a3e?style=flat-square" />
  <img alt="STT modes" src="https://img.shields.io/badge/STT%20modes-5%20local%2Fdemo-ae1615?style=flat-square" />
  <img alt="Locales" src="https://img.shields.io/badge/UI-TR%20%7C%20EN%20%7C%20FR%20%7C%20CN%20%7C%20JP%20%7C%20AR-111111?style=flat-square" />
</p>

<p align="center">
  <img src="docs/images/speech-to-text-lab-hero.png" alt="speech-to-text-lab hero banner" width="860" />
</p>

## Why this lab exists

This repository is an **education laboratory** created under **AI transformation** and **AI literacy** training. It helps engineers and instructors walk through a call-center-style pipeline without touching real citizen data or paid cloud STT APIs for the default path.

The branding and workflows are inspired by **TÜİK ALO 124** teaching scenarios. The TÜİK logo is shown **only** for educational / demo context. This is **not** an official TÜİK product, endorsement, or production service.

## What you can do

| Area | What the lab demonstrates |
| --- | --- |
| **Audio** | Upload or pick Common Voice TR–style samples; waveform player (Minimal = wave only) |
| **STT** | Five selectable local/demo recognition modes |
| **Language analysis** | Turkish-oriented sentiment / intent-style cues + optional browser NLP |
| **Reporting** | TXT / JSON / PDF export, PDF preview, batch summary table |
| **Agent bridge** | Optional desktop **OpenCode** CLI enrichment (model picker + install guide) |
| **Teaching slides** | Reveal.js deck under `/slides` |

## Architecture (high level)

```text
┌─────────────┐   ┌──────────────────┐   ┌─────────────────┐   ┌──────────────┐
│ Audio input │ → │ STT mode engine  │ → │ Sentiment / NLP │ → │ Report export│
│ upload/CV   │   │ (5 local demos)  │   │ (+ OpenCode?)   │   │ TXT/JSON/PDF │
└─────────────┘   └──────────────────┘   └─────────────────┘   └──────────────┘
```

- **Frontend:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, Lucide icons  
- **Audio UI:** WaveSurfer.js waveform (scrub on the wave in Minimal view)  
- **PDF:** jsPDF + DejaVu fonts for Turkish glyphs  
- **Optional agent:** local OpenCode CLI (`opencode run -m …`) streaming NDJSON into the lab  

Default theme: black / white with TÜİK red **`#ae1615`**. No emoji in the product UI — Lucide only.

## STT techniques (five modes)

All modes are **educational**. They are designed to teach concepts offline or with light browser APIs — not to replace production ASR.

| Mode | Id | Idea | Offline |
| --- | --- | --- | --- |
| **Mock ASR** | `mock` | Deterministic demo transcripts for catalog samples; best for metrics / WER teaching | Yes |
| **Web Speech API** | `web-speech` | Browser `SpeechRecognition` when available; falls back to Mock | Browser-dependent |
| **Pipeline stages** | `pipeline` | Visible teaching path: VAD → feature summary → decode (mock) | Yes |
| **Energy / VAD + n-gram hybrid** | `vad-ngram` | Energy-based activity + lightweight n-gram style hybrid demo | Yes |
| **Keyword spot + acoustic confidence** | `keyword-spot` | Keyword spotting with confidence-style scoring for teaching trust UI | Yes |

> Heavy models (e.g. full Whisper stacks) are intentionally **not** required so the lab stays under a practical classroom footprint.

## NLP & OpenCode

1. **Browser NLP (optional):** local Turkish lexicon / heuristics for intent-like labels and short notes — no paid API.  
2. **OpenCode CLI (optional):** if `opencode` is on `PATH`, the lab can send a versioned report JSON (`speech-to-text-lab.report.v1`) to the desktop agent and stream progress back.  
3. **Model picker:** default `opencode/muse-spark-1.3-contributor-free`; other CLI models can be selected in the panel.  
4. **Install accordion:** Windows / Linux / macOS install snippets (Chocolatey, Scoop, npm, curl install script, Homebrew, etc.).  
5. **Chat-style agent card:** expand the result; follow-up questions appear as user / agent bubbles.

## Sample data & privacy

- Catalog targets **~30 Common Voice TR (CC-0)** style clips, including longer educational takes (~30s–90s).  
- **Do not upload** real ALO 124 calls, CATI answers, or personal data.  
- Repo samples are synthetic / openly licensed demo material for teaching.  
- In any institutional deployment, follow **KVKK** and internal policy.

## Quick start

```bash
git clone https://github.com/masterfabric/speech-to-text-lab.git
cd speech-to-text-lab
npm install
npm run dev
```

Open **http://127.0.0.1:43123**.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local lab on port `43123` |
| `npm run build` | Samples + slides sync + production build |
| `npm run start` | Serve production build on `43123` |
| `npm run samples` | Regenerate demo audio under `public/samples/` |
| `npm run slides` | Sync and serve the teaching deck |
| `npm run verify:audio-stage` | Playwright checks for Minimal / Detail audio UI |
| `npm run verify:nlp-opencode` | Playwright checks for NLP / OpenCode panel |
| `npm run verify:sample-catalog` | Catalog row / scroll checks |

## UI map

- **Tek dosya** — single-file lab: upload / samples → STT → sentiment → report  
- **Toplu işleme** — batch table + summary export  
- **NLP / OpenCode** — optional local NLP + desktop agent bridge, archive / history  
- **Slides** — `/slides/index.html` teaching deck aligned to the lab palette  

Footer includes instructor credit, educational disclaimer, and language chips **TR · EN · FR · CN · JP · AR** (Arabic uses RTL when the locale layer is active).

## Project layout (selected)

```text
app/                 Next.js routes + OpenCode API bridges
components/          Lab UI (player, STT, NLP, batch, report, …)
lib/                 STT modes, sentiment, NLP, report schema, OpenCode helpers
public/samples/      Demo audio (WAV + M4A)
public/brand/        TÜİK logo assets (educational display)
public/slides/       Built presentation assets
slides/              Source deck
docs/images/         README hero art
scripts/             Sample build, slide sync, Playwright verifiers
```

## Credits

- Instructor engineer: **[Gürkan Fikret Günak](https://linkedin.com/in/gurkanfikretgunak)**  
- Developed with resources from **[MasterFabric](https://masterfabric.co)**  
- Logo © Türkiye İstatistik Kurumu — educational display only  

## License

Released under the [MIT License](./LICENSE).
