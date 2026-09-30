# Local-first privacy

IndexedDB stores child nickname, birth month, preferred language, reading level, optional notes, plans, sessions, artifacts and append-only events. localStorage stores only the UI language. No remote database or telemetry exists. Fonts use the device stack; no third-party font/CDN requests are required.

AI requests are explicit parent actions. Training transmits age, language and task parameters. Reporting transmits a bounded evidence packet without nickname, birth month, notes or historical events. Third-party AI providers process submitted data under their own terms; leave the key unset to use only built-in content. The local BFF does not persist requests to a server database.

Browser storage is not encryption. Other software/users with access to the browser profile may read it. Deleting a child cascades to sessions, events, artifacts and plan. JSON exports contain personal information; store them privately. Browser clearing removes records; regularly export. v0.1 does not provide import, cloud backup, accounts or multi-device sync.

API credentials exist only in the server environment, never browser payloads or VITE_* variables. The BFF is loopback-only and rejects non-local Origin headers. Public deployment needs a separate security design.
