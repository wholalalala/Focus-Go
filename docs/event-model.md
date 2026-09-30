# Events and reconstruction

Events have UUID, session/task/trial IDs, type, performance.now monotonic milliseconds, ISO wall-clock time and JSON payload. EventRepository exposes append (`add`, not `put`) and read. Duplicate IDs fail. The child data deletion action intentionally removes the child's entire history; append-only refers to normal event recording, not a ban on user erasure.

The event vocabulary covers session/task/instruction/demo/practice, scheduling, stimulus presentation, every received response, sequence flashes, timeout, completed trial, visibility, pause/resume and completion. Trial-completed payloads carry scoring results. Sessions retain definitions and raw results so metrics can be recomputed.

Browser monotonic times reset on page reload. Compare them only within a page lifetime; wall-clock timestamps, trial-local onset/response and saved seeds support cross-load audit. A hidden page invalidates the active trial. Browser frame callbacks and timestamp measurements do not guarantee hardware onset precision. Saving every completed trial bounds loss on abrupt closure; an unfinished trial may be retried after a browser crash and its earlier partial events remain visible.

Sequence tasks retain both `stimulusActualOnsetMs` and `responseWindowOnsetMs`; reaction time uses the latter, so sequence presentation is not mistakenly included in response latency. Premature input counts remain visible even when the trial is excluded from accuracy.
