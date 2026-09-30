# Contributing

Use Node 22.12+ and `npm ci`. Run `npm run dev`. Before proposing changes, run lint, typecheck, test, build and browser tests (`npm run test:e2e`). Prefer small changes with a reproducible synthetic example.

- Keep scoring pure and deterministic. Add meaningful tests for scoring/protocol changes.
- Never change a released probe silently: introduce a new version and document comparability.
- Add every UI string to both translation resources. LLM prompts are authored in English.
- Document primary research, independent adaptations and uncertainty. No diagnostic or normative claims.
- Never submit actual children's exports, credentials or proprietary stimulus materials.
- Cognitive, accessibility and child-development review are especially welcome. Training efficacy must be studied, never assumed.

The repository is Apache-2.0 licensed. By contributing, you agree that your contribution can be distributed under that license. Follow [our code of conduct](CODE_OF_CONDUCT.md).
