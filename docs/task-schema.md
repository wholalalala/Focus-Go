# Task schema

Authoritative TypeScript contracts live in `src/core/types.ts`. TaskTemplate includes id/version, localized name key, domain, paradigm, scientific provenance, population, modalities, structured difficulty, scoring version, findings and allowed generation slots. ProbeDefinition fixes a trial count, pool, protocol and scoring identity. AssessmentDefinition pins all six probe versions.

TrialDefinition captures id/index, template/probe, phase, condition, structured stimulus, expected ordered response, difficulty snapshot and seed. TrialResult records scheduled and actual onset, first response, RT, completion time, raw response sequence, correctness, timeout, error type, timing validity and replay/prompt metadata.

Other contracts include ScientificProvenance, EvidenceReference, Finding, EvidencePacket, AbilitySnapshot, TrainingPlan, AIInvocation and ContentArtifact. A content artifact cannot redefine any expected response or difficulty value. Server schemas reject additional generated fields. `objects` is a permutation of the exact four permitted objects, not arbitrary instruction text.
