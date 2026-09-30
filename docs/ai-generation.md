# AI generation

English-only versioned prompt registry: FG_CONTENT_GENERATOR and FG_CONTENT_VALIDATOR, v1.0.0. OpenAICompatibleProvider uses chat/completions JSON-object mode, configurable server URL/model/key, an 18-second transport timeout, and typed responses. MockProvider enables deterministic integration tests.

Parent selects a structured plan → planner fixes templates/difficulty → generation → strict Zod schema → local safety/ambiguity checks → model semantic acceptance → immutable artifact → trials. Only theme, gentle encouragement, task-version-specific labels and a permutation of four known objects are allowed. These cannot change answers, timing or trial counts. All prompts are English; desired output language is an input parameter.

Generation retries once on any malformed, unsafe, empty, timeout or HTTP failure. Missing key and exhausted retries use curated content. A failed network/BFF also falls back in the browser. Content is prepared before play; no calls occur between trials.

Each provider invocation records ID, provider/model, prompt/version, request hash, timestamps, raw/parsed response, validation and duration. Artifacts carry template/version, language/age, difficulty snapshot, source, content hash and generation invocation. Request cache keys include template/version, difficulty, language, age band and theme; contentHash identifies the resulting payload. Hashes are lightweight identity aids, not cryptographic authenticity guarantees.

Current official configuration reference (checked 2026-09-29): https://api-docs.deepseek.com/guides/harness and https://api-docs.deepseek.com/api/create-response/ . The project uses configurable `deepseek-flash`; transport stays OpenAI-compatible. Live paid API success requires a user-configured key and is not asserted by mock integration tests.

Version 2 content prompts receive `requiredLabels`, task kind and template version. Local validation requires the exact localized built-in labels (green/red light for GNG, star/moon for SA) before semantic review. Stale v1 names are rejected even if the model accepts them. Cache keys include template version; saved artifacts remain immutable. The BFF accepts optional `templateVersion` (`1.0.0` or `2.0.0`, default `2.0.0`) for content generation and validates matching v1/v2 assessment/probe/domain combinations for report packets.
