# Evidence-locked reporting

FG_EVIDENCE_REPORT v1.0.0 receives only a minimal EvidencePacket plus localized approved statements. All prompts are English. The output is strict JSON with observations and an empty limitations array; application-owned localized limitations are always shown.

EvidenceValidator rejects unknown finding IDs, missing/foreign metric references, additional properties, non-descriptive confidence and statements not exactly matching the corresponding approved text. No unreferenced summary field exists. This intentionally limits stylistic freedom: v0.1 prioritizes a verifiable claim boundary over creative explanations. Even an observation citing a real ID is rejected if its prose invents diagnoses or causes.

A failed report call leaves deterministic observations available. Names, birth months, profile notes and complete raw events are not transmitted. Findings are generated before the model; AI never scores a trial.
