# Known limitations

- Experimental first usable demo, not a validated instrument. No norms, diagnosis, peer comparison, causal attribution or proven training benefit.
- Target age 5–8 is a design intention, not validation evidence. A caregiver may need to explain icons and rules. Motor differences, visual accessibility and comprehension can confound every task.
- Short condition samples create unstable estimates; null is preferable to invented values. There are no confidence intervals or reliable-change indices yet.
- Browser timing uses performance.now and requestAnimationFrame but is not laboratory timing. Displays, touch/click events, TTS and interruptions differ across devices.
- Following Instructions is an original supported visual ordered-selection task; it does not yet include object dragging, delayed instructions or conditional instructions. Selection is a first-version allowed response modality.
- Corsi uses a fixed 3×3 board; DCCS uses a simplified explicit rule switch. Neither is equivalent to a standardized administration.
- Training is finite and fixed-difficulty. Content variation is deliberately constrained to safe cosmetic fields. No between-trial AI or automatic difficulty adaptation.
- AI reports use approved deterministic sentences; they cannot produce novel free-form interpretations. Semantic content safety review is fallible; human review is still appropriate before broader use.
- TTS voices depend on the operating system. No voice or camera input. No authentication, encrypted storage, import, cloud backup or hosted multi-user backend.
- Real provider calls require an API key; automated tests demonstrate generation and fallback using mocks and local HTTP, not paid provider availability.

Next priority: protocol and usability review with caregivers and qualified developmental researchers; pilot timing/comprehension and test–retest reliability before expanding interpretation or adaptive training.
