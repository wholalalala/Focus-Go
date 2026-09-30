# Scoring and metrics

`scoreTrial` is a pure comparison of expected and actual ordered responses. An empty expected response means withhold. Tap on a withhold trial is COMMISSION; missing expected response is OMISSION; wrong single target is WRONG_TARGET; unexpected sequence item is INTRUSION; same items in wrong order is ORDER_ERROR; using the old color mapping after the switch is PERSEVERATION. Premature input and late responses are separately tagged.

Practice and timing-invalid trials are excluded from reported performance. Denominators use the relevant valid condition only. Missing denominators yield null, rendered as a dash, never zero. RT statistics use correct responded trials only; correct withholding does not manufacture a response time. SD uses n−1; CV is SD/mean. First/second halves use protocol index, with a second-minus-first accuracy trend.

Flanker costs subtract incongruent from congruent accuracy, and congruent from incongruent median RT. DCCS switch cost is post-minus-pre median correct RT. Corsi maximum span is the longest successful sequence; stable span requires two successful trials at the same length. Following Instructions reports exact sequence correctness, steps in correct positions, omissions, intrusions, order errors and replays. No weighted overall score exists.

Finding thresholds (`findingConfig`) are transparent descriptive rules: commission rate ≥ .20 and greater than omission rate; two-step minus three-step accuracy ≥ .25. They are not clinical thresholds. Findings only run when required metrics exist.
