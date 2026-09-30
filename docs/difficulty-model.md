# Difficulty vectors

The DifficultyVector is the source of truth: stimulusDurationMs, responseWindowMs, isiMinMs/isiMaxMs, goRatio, visualSimilarity, backgroundDistractors, ruleCount and sequenceLength. The v1 runtime uses a fixed 800 ms neutral gap (within its 600–1000 ms declared bounds), rather than unconstrained jitter.

Baseline vectors are fixed per version. Sequence length varies only through predefined Corsi and instruction equivalence pools. A seeded Fisher–Yates permutation controls sequences and target position; no Math.random drives trials. Baseline difficulty never adapts to AI or a prior performance score.

v0.1 training is intentionally fixed-difficulty; no automatic adaptive difficulty or efficacy claim. Future adaptive training must be deterministic, logged, bounded, separately versioned and excluded from baseline probes.
