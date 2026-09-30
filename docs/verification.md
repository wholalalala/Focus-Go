# v0.1 verification

Verified locally on macOS arm64, Node 26.0.0; CI is configured for Node 22. The lockfile pins the installed dependency tree. No live AI API key was used.

## Required commands

- `npm install`: succeeded.
- `npm run typecheck`: TypeScript strict check succeeded.
- `npm run lint`: ESLint succeeded.
- `npm test`: 48 deterministic, protocol compatibility, data and local BFF tests.
- `npm run build`: production Vite build succeeded.
- `npm run dev`: frontend on 0.0.0.0:5173 and BFF on 0.0.0.0:3001.
- `npm run test:e2e`: eight Chromium browser scenarios.

## Browser scenarios

1. Create a synthetic child; finish all six probes (60 formal plus 24 practice trials); inspect report and Why; generate content with no key; finish training; export JSON; switch English/Chinese.
2. Edit profile; pause, reload and resume; delete the synthetic child and related records.
3. Check mobile width and no automatic fake assessment data.
4. Fail two practice blocks; verify INSUFFICIENT, zero formal trials and no invented findings.
5. Pause during an active trial; verify invalid timing result, saved cursor and append-only events.
6. Open a real LAN HTTP origin with `isSecureContext === false`; add a profile, complete practice and formal trials, observe progressive trial counts, pause/reload/resume without browser errors.

7. Resume a saved v1 session, fail its remaining practice trials, generate a v1 retry after upgrade, complete its original 40-trial GNG block, inspect the v1 report, then establish a separate v2 personal baseline without cross-version comparison.
8. Check Chinese star-observation demonstration and training on a 390 px screen, distinct SVG stimuli, hidden-stimulus state and no horizontal overflow.

Tests use virtual browser clocks and synthetic responses. Screenshot values are demonstration artifacts, not human measurements or evidence of product efficacy. Screenshots are stored under `docs/screenshots/`.

## AI verification boundary

Local HTTP integration verifies strict schemas, one retry, fallback and successful generation/semantic acceptance for GNG, Following Instructions and Sustained Attention with a deterministic mock provider. Evidence validation rejects nonexistent references and unsupported prose even when a real reference is cited. The BFF rejects extraneous profile fields. Live paid provider availability, latency and model behavior require a configured key and were not asserted.

## Remaining validation

Human child/caregiver usability, independent protocol review, test–retest reliability, accessibility across assistive technologies, real-device timing calibration and training-transfer studies remain future work. This delivery is a runnable engineering demo, not a validated assessment.

## LAN HTTP regression — 2026-09-30

The former direct `crypto.randomUUID()` calls failed on ordinary LAN HTTP origins, preventing profile creation and event recording. `createId` now uses that API when available and a UUID v4 generated with `getRandomValues` otherwise. See the browser API restrictions: [randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) and [getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

Session progress now includes completed trials within each activity, with localized per-phase counts. Correctness and timing-validity do not determine completion progress. Practice retries do not reset the overall bar.

To repeat the full end-to-end flow on your LAN origin, run:

```sh
FOCUSGO_E2E_BASE_URL=http://192.168.60.193:5173 npx playwright test tests/e2e/flows.spec.ts --grep 'complete six'
```

The LAN-specific test uses the machine's external IPv4 interface or `FOCUSGO_LAN_URL` when explicitly provided. Use the actual host IP on other machines.

## Short protocol and distinct SVG scenes — 2026-09-30

Protocol v2 uses 12/10/9/8/12/9 formal or training trials. Four practice trials and at most one four-trial retry keep every new assessment task at or below 20. Unit tests check all condition distributions, seeded legacy regeneration, same-version baseline selection, version-bound AI labels/cache keys, and v1/v2 report packet validation. New training sessions contain no unused practice trials.

Build, TypeScript and ESLint pass. Desktop traffic and space scenes and the Chinese mobile demo were visually inspected. All eight Chromium scenarios were also run against `http://192.168.60.193:5173` after restarting both services on `0.0.0.0`. Screenshots include `gng-short.png`, `sa-short.png` and `sa-demo-mobile.png`. These automated synthetic sessions verify software behavior, not human attention or timing reliability.
