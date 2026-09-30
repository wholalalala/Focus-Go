# Personal Baseline protocol v2.0

ID `FG-BASELINE-2.0`, version 2.0.0, authored 2026-09-30. New sessions use this short protocol. Definitions and the retained v1 registry are in `src/probes/index.ts`. These are experimental, unvalidated adaptations.

| Probe                    | Formal / training trials | Controlled design                                                 | Maximum including practice and retry |
| ------------------------ | -----------------------: | ----------------------------------------------------------------- | -----------------------------------: |
| FG-GNG-PROBE-2.0         |                       12 | 9 green-light/arrow taps, 3 red-light/stop withholding trials     |                                   20 |
| FG-SA-PROBE-2.0          |                       10 | 2 star targets, 8 moon distractors in a static observation window |                                   18 |
| FG-FLANKER-PROBE-2.0     |                        9 | 3 congruent, 3 incongruent, 3 neutral; seeded directions          |                                   17 |
| FG-CORSI-PROBE-2.0       |                        8 | two sequences each of length 2, 3, 4, 5; fixed 3×3 board          |                                   16 |
| FG-DCCS-PROBE-2.0        |                       12 | 6 color, then 6 shape; balanced conflicting mappings in each half |                                   20 |
| FG-INSTRUCTION-PROBE-2.0 |                        9 | three each of 1, 2, 3 ordered selections                          |                                   17 |

The six formal blocks total 60 trials, versus 163 in v1. Assessment keeps four practice trials and at most one four-trial retry per task; the 3/4 comprehension gate and timing windows are unchanged. Training goes directly from instructions/demo to its 8–12 training trials, without unused practice trials in the saved session. Typical assessment duration with explanations is about 5–8 minutes; slow responses, retries and breaks can take longer.

GNG and SA use separate code-owned SVG scenes, instructions, demonstrations and response-button labels. Traffic cues combine color with arrow/stop geometry. Stimuli are visible for 1500 ms within the full 2200 ms response window. Static scenery provides no changing cues or rewards. Scoring remains `FG-SCORING-1.0`; neither task ends early on a tap.

Shorter blocks reduce the number of observations, especially rare targets. Reports identify the version and describe the small sample; no claim of equivalence with v1 or validated sustained-attention measurement is made. Comparisons and first personal baselines are partitioned by assessment ID/version. AI content prompts, deterministic label validation, template versions and cache keys are versioned as well.

## Retained v1 protocol

Saved v1 sessions retain their full definitions, cursor, stimuli, instructions, report IDs and seeded practice retries. Existing data is not truncated or relabeled. Only new sessions use v2; a first v2 assessment establishes a new personal baseline. Export retains the original singular `baseline` field for compatibility and adds `baselines` for all protocol-specific starting assessments.

### Personal Baseline protocol v1.0

ID `FG-BASELINE-1.0`, version 1.0.0, authored 2026-09-29. Definitions: `src/probes/index.ts`. Experimental, independently designed, unvalidated child-friendly protocols. Future changes to released mechanics require new IDs and explicit comparison policy.

| Probe                    | Formal trials | Controlled design                                                |
| ------------------------ | ------------: | ---------------------------------------------------------------- |
| FG-GNG-PROBE-1.0         |            40 | 30 leaf tap / 10 moon wait                                       |
| FG-SA-PROBE-1.0          |            60 | 12 leaf targets / 48 moon distractors                            |
| FG-FLANKER-PROBE-1.0     |            30 | 10 congruent, 10 incongruent, 10 neutral; seeded directions      |
| FG-CORSI-PROBE-1.0       |             8 | two sequences each of length 2, 3, 4, 5; fixed 3×3 board         |
| FG-DCCS-PROBE-1.0        |            16 | 8 color, then 8 shape; conflicting color/shape response mappings |
| FG-INSTRUCTION-PROBE-1.0 |             9 | three each of 1, 2, 3 ordered selections                         |

Each assessment task starts with instructions, a parent-supported demonstration and four practice trials. At least 3/4 timing-valid correct responses pass. One retry (another four recorded trials) is allowed; two failed blocks mark ruleComprehension INSUFFICIENT, skip formal trials, and retain the explanation. This is an internal usability gate, not a developmental cutoff.

GNG/SA show stimuli for 1500 ms in a 2200 ms fixed response window, including withholding trials. Flanker response deadline is 2200 ms. DCCS deadline is 5000 ms. Corsi highlights each item for 650 ms with 200 ms between items after a 400 ms lead-in; response window is 15000 ms after presentation. Following Instructions has a 15000 ms window with the pictorial sequence visible throughout. These instructions therefore measure supported ordered execution, not unaided recall.

A neutral 800 ms intertrial screen separates formal trials. Practice provides warm correct/try-again feedback and a continue button. The whole protocol is approximately 10–15 minutes including parent explanations and transitions; actual duration depends on responses, practice and breaks. Breaks are unrestricted. An interrupted in-flight trial is retained as timing-invalid and excluded, rather than silently replayed into valid metrics. Resumption preserves the saved cursor.

Training uses the same mechanics with capped short blocks (up to 12 per selected task), independent TRAINING phase and immutable pre-generated cosmetic content. It is never relabeled as a baseline.
