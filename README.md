<p align="center">
  <img src="public/brand/tuik-logo.svg" alt="TÜİK logo" width="120" />
</p>

<h1 align="center">speech-to-text-lab</h1>

<p align="center">
  Educational speech-to-text laboratory inspired by TÜİK ALO 124–style call-center audio workflows.
</p>

<p align="center">
  <img src="docs/images/speech-to-text-lab-hero.png" alt="speech-to-text-lab hero" width="720" />
</p>

## About

This lab teaches an end-to-end pipeline: **audio → STT → sentiment → report**. It was created under **AI transformation** and **AI literacy** training. It uses **synthetic / demo audio only** — no real ALO 124 recordings or personal data. No paid APIs are required for the core lab.

> The TÜİK logo is shown for educational / demo context only. This is **not** an official TÜİK product.

## Features

- Single-file and batch processing
- Multiple local STT modes (including Mock ASR and Web Speech)
- Sentiment / intent style analysis and PDF/JSON/TXT reports
- Optional browser NLP and optional OpenCode desktop CLI bridge
- UI locales: TR / EN / FR / CN / JP / AR

## Quick start

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Credits

- Instructor engineer: [Gürkan Fikret Günak](https://linkedin.com/in/gurkanfikretgunak)
- Built with resources from [MasterFabric](https://masterfabric.co)

## License

MIT
