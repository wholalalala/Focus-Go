# Focus&Go

**Small steps. Growing possibilities.** A local-first, open-source framework and reference app for structured attention and executive-function practice for children aged **5–8**.

[简体中文](README.zh-CN.md) · [Architecture](docs/architecture.md) · [Protocols](docs/probe-protocol.md) · [Research](docs/research/psytoolkit-paradigms.md)

> Experimental v0.1. Personal Baseline means the child's own starting performance under a versioned protocol. This is **not a medical device, diagnostic tool, population norm or substitute for professional assessment**. No overall Focus score, peer ranking or clinical classification is produced.

## Run it

Requires Node **22.12+** and npm. From this repository root (the folder may be named `Focus&Do`):

```sh
npm install
cp .env.example .env
npm run dev
```

Open **http://127.0.0.1:5173**. One command starts Vite and the loopback-only BFF on port 3001. No API key is required. If cloning, use your repository's actual URL; this project does not assume a published GitHub remote. Do not create an extra outer folder.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For a local production preview: `npm run build && npm start`, then open http://127.0.0.1:3001. This BFF is not intended for public hosting without authentication and hardening.

## Demo

1. Add a child using a nickname and birth month; Chinese or English can be selected.
2. Start a Personal Baseline. Each task has instruction, demonstration, practice and a formal probe. Pause and resume later. Two unsuccessful practice blocks mark comprehension insufficient and skip formal trials.
3. Inspect six independent domain metrics and **Why?** evidence/provenance views.
4. Choose or lock training directions, prepare all content before starting, and complete a finite session. Missing/unavailable AI falls back to built-in content.
5. Review history, compare later baselines with the first, and export complete JSON data.

Development-only `/dev` exposes protocol definitions and raw events. No fake child or assessment is created automatically. Browser tests use synthetic profiles and accelerated virtual clocks.

![Parent dashboard](docs/screenshots/parent-desktop.png)

## Supported areas

| Domain                 | Independent reference task | Example observations                                 |
| ---------------------- | -------------------------- | ---------------------------------------------------- |
| Response inhibition    | Go/No-Go                   | omission/commission, response-time variability       |
| Sustained attention    | rare-target CPT-like       | hits, false alarms, performance across halves        |
| Selective attention    | Flanker-like               | congruent/incongruent/neutral accuracy, interference |
| Spatial working memory | forward Corsi-like         | stable/max span, sequence errors                     |
| Rule switching         | DCCS-like                  | pre/post switch accuracy, previous-rule errors       |
| Following instructions | Focus&Go original          | 1/2/3-step ordered execution, replays                |

## Architecture

**Generative Edge, Deterministic Core.** React/TypeScript renders a versioned task runtime. Pure scoring precedes metrics, rule-based findings, evidence packets and optional AI interpretation. Dexie repositories separate domain models from IndexedDB. Express is a small server-only AI gateway; no child database is stored on the server.

- `src/core`: types, seeded randomness, scoring, metrics, findings, runtime, speech interface
- `src/probes`: immutable protocol definitions and controlled stimulus generation
- `src/data`: child/session/assessment/event/content repositories and export
- `src/ai`: English prompt registry and strict validators
- `server`: provider interface, OpenAI-compatible implementation, mock and safe fallback
- `src/i18n`: complete Chinese/English UI resources

## AI / DeepSeek

Configure `.env`, then restart:

```dotenv
FOCUSGO_LLM_BASE_URL=https://api.deepseek.com
FOCUSGO_LLM_API_KEY=
FOCUSGO_LLM_MODEL=deepseek-flash
```

DeepSeek's official API docs were checked on 2026-09-29. Models change; the environment variable is the source of configuration. Other compatible endpoints can be selected without frontend changes. Keys never use a `VITE_` variable. Settings shows the active non-secret configuration.

Content is generated as JSON, schema-validated, checked for ambiguous objects/labels, semantically reviewed, and restricted to cosmetic slots. Invalid generation retries once, then falls back. Task rules, expected answers, trial counts and timings are never model-controlled. Valid artifacts are cached and copied into sessions before play. Reports deliberately allow only approved finding statements with matching evidence references, preventing free-form unsupported claims.

## Scientific philosophy and privacy

Measure first, explain second. Original paradigms inform the design but do not validate this implementation. Personal Baseline is not Population Norm. Browser timestamps are not laboratory-grade. Short probes, visible instructions, device/motor differences and comprehension affect interpretation. No training-transfer efficacy is claimed.

Profiles, assessments and event logs stay in this browser's IndexedDB. Export before clearing browser data. An explicitly requested AI action transmits only minimal structured parameters or an evidence packet (age, not nickname/birth date). No analytics, external fonts, camera, microphone, ads, social feed or infinite play. See [privacy](docs/privacy.md) and [limitations](docs/limitations.md).

## Contribute and acknowledge

See [CONTRIBUTING](CONTRIBUTING.md), [conduct](CODE_OF_CONDUCT.md) and [security](SECURITY.md). Priority: independent usability/protocol review with children, caregivers and qualified researchers before extending claims or protocols.

PsyToolkit is acknowledged as an important research/reference implementation catalogue. Focus&Go is independent and copies no PsyToolkit source, assets, wording or population norms. Original paradigm citations are linked in each task and the research catalogue.

Licensed under the full, unmodified [Apache License 2.0](LICENSE).

Current v2 activities use 8–12 formal/training trials each (at most 20 assessment trials including practice and retry). Response inhibition uses traffic-light SVG cues; sustained attention uses star observation. Saved v1 sessions remain available, and baseline comparisons stay within each protocol version.
