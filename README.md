<p align="center">
  <img src="public/brand/tuik-logo.svg" alt="TÜİK — Turkish Statistical Institute logo" width="128" />
</p>

<h1 align="center">speech-to-text-lab</h1>

<p align="center">
  <strong>Educational ALO 124 / TÜİK-style speech-to-text laboratory</strong><br />
  Synthetic and demo audio only · Not an official TÜİK product
</p>

<p align="center">
  <img src="docs/images/speech-to-text-lab-hero.png" alt="speech-to-text-lab application hero" width="820" />
</p>

## About

`speech-to-text-lab` is a browser lab for teaching call-center style audio workflows:

**audio → speech-to-text (STT) → sentiment / emotion → report**

It was built under **AI transformation** and **AI literacy** training. The core lab runs locally with **synthetic / demo samples** — there are no real ALO 124 recordings and no citizen personal data in the repository. Paid cloud STT APIs are not required for the default Mock ASR path.

> The TÜİK logo appears only in an educational / demo context. This repository is **not** an official TÜİK product, endorsement, or publication.

## Features

- Single-file workspace with Minimal / Detail audio stage views
- Sample catalog (Common Voice TR style demos) plus local file upload
- Multiple educational STT modes (Mock ASR, Web Speech, pipeline / hybrid demos)
- Sentiment analysis, metrics, transcript word timings, and exportable reports (PDF / TXT / JSON)
- Batch processing panel
- Optional browser NLP + optional **OpenCode** desktop CLI bridge (model picker, install guide, chat-style agent results)
- Footer language control: **TR / EN / FR / CN / JP / AR** (Arabic uses RTL when wired)
- Theme: black / white with TÜİK red `#ae1615` · Lucide icons only

## Quick start

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:43123** (Next.js is bound to port `43123`).

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Generate samples, sync slides, production build |
| `npm run samples` | Regenerate demo audio under `public/samples/` |
| `npm run slides` | Serve presentation slides |

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Lucide React** icons
- **WaveSurfer.js** waveform
- **jsPDF** report export
- Optional local **OpenCode** CLI for agent enrichment (no paid API required by the lab itself)

## Privacy / disclaimer

- **Educational use only.** Do not upload real ALO 124 calls, CATI answers, or personal data.
- Demo audio in `public/samples/` is synthetic or openly licensed demo material for teaching.
- In production environments, follow KVKK / institutional policies.
- OpenCode CLI (if installed) runs on your machine; review prompts and outputs before sharing.

## Credits

- Instructor engineer: **[Gürkan Fikret Günak](https://linkedin.com/in/gurkanfikretgunak)**
- Developed with resources from **[MasterFabric](https://masterfabric.co)**
- Logo © Türkiye İstatistik Kurumu — educational display only

## License

[MIT](./LICENSE)
