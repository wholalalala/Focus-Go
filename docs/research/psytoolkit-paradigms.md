# Paradigm research and independent designs

Reviewed 2026-09-29. PsyToolkit was used as an implementation catalogue; its descriptive pages were read, not its downloadable source/assets. Primary literature identifies the construct history. These are design notes, not a validation study. None of the cited adult norms is transferred into Focus&Go. All six probes have PERSONAL_BASELINE_ONLY status.

## Go / No-Go

```yaml
name: Go / No-Go
domain: RESPONSE_INHIBITION
```

- **target_construct:** withholding a prepotent response.
- **secondary_constructs:** attention, response preparation, instruction comprehension, motor speed.
- **reference_implementation:** [PsyToolkit Go/No-go](https://www.psytoolkit.org/experiment-library/go-no-go.html).
- **core_mechanism:** respond to frequent go stimuli and withhold to less frequent no-go stimuli.
- **trial_structure:** reference uses textual signals and a fixed deadline; Focus&Go uses original leaf/moon presentation and touch.
- **difficulty_parameters:** go prevalence, deadline, intertrial gap, stimulus discriminability.
- **metrics:** condition-specific accuracy, omissions, commissions, correct-trial RT and variability, halves.
- **error_types:** omission and commission; an error alone does not diagnose inhibition difficulty.
- **age_considerations:** remove reading demand; explain and practice withholding.
- **limitations:** attention and response selection confounds; short sample; no clinical inference.
- **focusgo_design:** 40 formal trials, 75% go, 1500 ms visual stimulus, 2200 ms response window.
- **references:** Verbruggen & Logan (2008), _Automatic and controlled response inhibition_, [doi:10.1037/a0013170](https://doi.org/10.1037/a0013170). Criaud & Boulinguez (2013), critical review, [doi:10.1016/j.neubiorev.2012.11.003](https://doi.org/10.1016/j.neubiorev.2012.11.003).
- **license_notes:** independent implementation; no copied reference code, assets or wording.

## Sustained attention / CPT-like

- **name:** rare-target continuous performance.
- **domain:** SUSTAINED_ATTENTION.
- **target_construct:** maintaining target monitoring over a sequence.
- **secondary_constructs:** selection, motor response, comprehension.
- **reference_implementation:** [PsyToolkit SART](https://us.psytoolkit.org/experiment-library/sart.html), a related frequent-response variant, **not the same protocol**.
- **core_mechanism:** monitor a stream and respond to occasional targets. SART reverses the frequency emphasis: frequent responses and rare withholding.
- **trial_structure:** reference SART has fixed stimulus/mask timing. Our trial is leaf or moon with a fixed response window.
- **difficulty_parameters:** target probability, stream length, pacing, perceptual similarity.
- **metrics:** hits, omissions, false alarms, correct RT, variability and within-session change.
- **error_types:** missed target, false alarm; both are context-sensitive.
- **age_considerations:** low reading load, calm stimuli, breaks and practice.
- **limitations:** our short probe is not equivalent to a lengthy vigilance test; two halves are descriptive only.
- **focusgo_design:** 60 trials, 20% targets; no entertaining animation or changing rewards.
- **references:** Rosvold et al. (1956), _A continuous performance test of brain damage_, [doi:10.1037/h0043220](https://doi.org/10.1037/h0043220), [PubMed record](https://pubmed.ncbi.nlm.nih.gov/13367264/). Robertson et al. (1997), _Oops!_, [doi:10.1016/S0028-3932(97)00015-8](<https://doi.org/10.1016/S0028-3932(97)00015-8>).
- **license_notes:** original stimulus sequence and implementation; no SART assets or normative tables copied.

## Flanker-like selective attention

- **name:** directional flanker.
- **domain:** SELECTIVE_ATTENTION.
- **target_construct:** selecting a central target amid irrelevant flankers.
- **secondary_constructs:** response conflict, motor choice, processing speed.
- **reference_implementation:** [PsyToolkit Flanker](https://www.psytoolkit.org/experiment-library/flanker.html).
- **core_mechanism:** flankers can agree, disagree or be neutral relative to the target response.
- **trial_structure:** central directional glyph surrounded by four flankers, left/right touch response.
- **difficulty_parameters:** compatibility, spacing, display duration, deadline.
- **metrics:** accuracy and median RT per condition; interference differences.
- **error_types:** wrong direction, omission, premature input.
- **age_considerations:** large controls; explain the middle target; no letter decoding.
- **limitations:** ten trials per condition is exploratory; costs may be noisy or negative.
- **focusgo_design:** 30 trials, three balanced conditions, independent glyph layout.
- **references:** Eriksen & Eriksen (1974), [doi:10.3758/BF03203267](https://doi.org/10.3758/BF03203267).
- **license_notes:** no original letters, screenshots, copied scripts or page layout.

## Corsi-like spatial span

- **name:** forward spatial reproduction.
- **domain:** SPATIAL_WORKING_MEMORY; sequential reproduction.
- **target_construct:** retaining an ordered spatial sequence.
- **secondary_constructs:** attention, motor planning, order memory.
- **reference_implementation:** [PsyToolkit Corsi](https://www.psytoolkit.org/experiment-library/corsi.html).
- **core_mechanism:** locations illuminate one at a time; reproduce their order.
- **trial_structure:** sequence display followed by response; fixed 3×3 board.
- **difficulty_parameters:** sequence length, presentation pace, spatial arrangement, repetitions.
- **metrics:** exact sequence accuracy, maximum successful span, two-success stable span, time.
- **error_types:** omissions, intrusions, order errors.
- **age_considerations:** lengths 2–5; touch targets; practice length 2.
- **limitations:** grid differs from physical Corsi placement; adult reference norms are explicitly not used.
- **focusgo_design:** two trials at each length, forward only; no adaptive stopping.
- **references:** Corsi (1972), _Human memory and the medial temporal region of the brain_, McGill doctoral thesis; Kessels et al. (2000), [doi:10.1207/S15324826AN0704_8](https://doi.org/10.1207/S15324826AN0704_8).
- **license_notes:** original grid and seeded sequences; no reference sequence tables copied.

## DCCS-like rule switching

- **name:** dimension-based card sort.
- **domain:** RULE_SWITCHING.
- **target_construct:** applying a changed sorting rule.
- **secondary_constructs:** rule comprehension, inhibition, color/shape discrimination.
- **reference_implementation:** [PsyToolkit task switching](https://www.psytoolkit.org/experiment-library/taskswitching.html) is a related catalogue example; its alternating letter/number paradigm is **not DCCS**. Primary DCCS protocol is the relevant research source.
- **core_mechanism:** sort on one dimension, then sort on a different dimension with conflicting mappings.
- **trial_structure:** 8 color trials followed by 8 shape trials; explicit visible rule cue.
- **difficulty_parameters:** cue visibility, conflicting dimensions, switch frequency, response deadline.
- **metrics:** pre/post accuracy, previous-rule errors, median RT difference.
- **error_types:** wrong target, omission, perseveration to old rule.
- **age_considerations:** large geometric forms and caregiver demonstration; colors can be a confound.
- **limitations:** simplified original adaptation; visible cues and fixed mappings differ from standard administration.
- **focusgo_design:** coral triangle / blue circle sorted to coral-circle / blue-triangle targets; no copyrighted cards.
- **references:** Zelazo (2006), _The Dimensional Change Card Sort (DCCS)_, [doi:10.1038/nprot.2006.46](https://doi.org/10.1038/nprot.2006.46). Source title/abstract/DOI verified; publisher full text access was restricted in the research environment.
- **license_notes:** independent geometric assets; reference protocol informs mechanism, not copied instructions.

## Focus&Go Following Instructions

- **name:** supported multi-step execution.
- **domain:** MULTI_STEP_EXECUTION.
- **target_construct:** carrying out a short ordered instruction.
- **secondary_constructs:** object recognition, comprehension, sequencing, motor selection.
- **reference_implementation:** Focus&Go original; no direct PsyToolkit equivalent claimed.
- **core_mechanism:** visually present and optionally speak an ordered list of object selections.
- **trial_structure:** pictorial 1/2/3-step instruction → ordered selection → deterministic comparison.
- **difficulty_parameters:** step count, object set, instruction availability, replay, deadline.
- **metrics:** accuracy by step load, steps in correct positions, omissions, intrusions, order errors, replay and completion time.
- **error_types:** missing, out-of-set or out-of-order actions.
- **age_considerations:** familiar objects; no required reading; parent can introduce the activity.
- **limitations:** visible sequence provides support; this is not a pure working-memory or real-world instruction-following measure.
- **focusgo_design:** nine controlled trials, three per load; apple/star/car/moon, select response. Drag, conditional and delayed rules are future extensions.
- **references:** original software protocol documented in [probe-protocol](../probe-protocol.md); no external validation or normative source.
- **license_notes:** original protocol; platform emoji/glyph rendering varies by OS. No downloaded third-party experiment assets.

## Research access and next validation

Catalogue descriptions, reference lists and primary publisher/index records informed these notes. Reading a reference entry is not equivalent to validating a child assessment. Next research work should include independent protocol review, caregiver-assisted usability, accessibility, test–retest reliability and measurement invariance across devices before new interpretive claims.

## Short protocol revision — 2026-09-30

The design counts above describe the retained v1 protocol. New v2 sessions use 12 GNG (9 green signals / 3 red signals), 10 SA (2 star targets / 8 moon distractors), 9 Flanker, 8 Corsi, 12 DCCS and 9 Following Instructions trials. The short SA block samples target detection over a brief interval and cannot establish sustained-attention reliability or equivalence to longer CPT protocols. See [current protocol](../probe-protocol.md).
