# Security and privacy reports

v0.1 is a local development demo, not a hardened hosted multi-user service. The server binds to loopback. Do not expose it publicly without authentication, authorization, HTTPS, CSRF/rate limits and a deployment threat model.

Report vulnerabilities through GitHub private vulnerability reporting when enabled, or the maintainer's private contact channel. Avoid public disclosure of keys or child data. No maintainer contact address is invented in this starter repository.

Only FOCUSGO_LLM_API_KEY on the server holds a provider key. Never use VITE_* for secrets. Rotate an accidentally disclosed key. IndexedDB is not encrypted and is accessible to code running on the same origin. Export files contain sensitive records and require appropriate handling. The application requests neither microphone nor camera access.
