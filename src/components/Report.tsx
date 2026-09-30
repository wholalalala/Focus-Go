import { useState } from "react";
import type { Session, TaskRun } from "../core/types";
import { templates, taskTextKey, probeIdForRun } from "../probes";
import { useI18n } from "../i18n";
import { evidencePacket } from "../core/scoring";
import { SessionRepository } from "../data/repositories";
const featured: Record<string, string[]> = {
  GNG: ["noGoAccuracy", "commissionRate", "medianRtMs"],
  SA: ["hitRate", "omissionRate", "rtCv"],
  FLANKER: ["CONGRUENTAccuracy", "INCONGRUENTAccuracy", "interferenceRtCost"],
  CORSI: ["stableSpan", "maximumSpanCompleted", "sequenceAccuracy"],
  DCCS: ["preSwitchAccuracy", "postSwitchAccuracy", "perseverativeErrors"],
  INSTRUCTION: ["1StepAccuracy", "2StepAccuracy", "3StepAccuracy"],
};
export function formatMetric(key: string, value: number | null | undefined) {
  if (value == null) return "—";
  return (/accuracy|rate|cost$/i.test(key) && !/[Rr]t/.test(key)) ||
    key === "timeOnTaskTrend"
    ? `${Math.round(value * 100)}%`
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(2);
}
export function Report({
  session,
  baselineSession,
  age,
  onUpdate,
}: {
  session: Session;
  baselineSession?: Session;
  age: number;
  onUpdate: () => void;
}) {
  const { t, language } = useI18n();
  const [why, setWhy] = useState<TaskRun | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true);
    try {
      const next = structuredClone(session);
      let fallback = false;
      for (const run of session.taskRuns.filter((r) => r.findings.length)) {
        const response = await fetch("/api/ai/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packet: evidencePacket(run, age, session.assessmentDefinition.id),
            language,
          }),
          signal: AbortSignal.timeout(80000),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        next.reports[run.id] = data.report;
        next.invocations.push(...data.invocations);
        fallback ||= data.fallback;
      }
      await SessionRepository.save(next);
      setMessage(fallback ? "aiReportFallback" : "aiReady");
      onUpdate();
    } catch {
      setMessage("aiReportFallback");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="pill">
            {t(
              session.baselineType === "PERSONAL_BASELINE"
                ? "baselineBadge"
                : "baseline",
            )}
          </span>
          <p>
            {new Date(session.createdAt).toLocaleDateString(language)} ·{" "}
            {session.assessmentDefinition.id}
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void generate()}
        >
          {t(busy ? "generating" : "aiReport")}
        </button>
      </div>
      {message && <p className="notice">{t(message)}</p>}
      <div className="report-grid">
        {session.taskRuns.map((run) => {
          const template = templates.find((x) => x.kind === run.kind)!;
          return (
            <article className="card report-card" key={run.id}>
              <span className="eyebrow">
                {t(
                  taskTextKey(
                    "task",
                    run.kind,
                    session.assessmentDefinition.id,
                  ),
                )}
              </span>
              <h2>{t(template.nameKey)}</h2>
              {run.ruleComprehension === "INSUFFICIENT" ? (
                <p className="notice">{t("insufficient")}</p>
              ) : (
                <div className="metric-list">
                  {featured[run.kind].map((key) => (
                    <div key={key}>
                      <span>{t("metric." + key)}</span>
                      <strong>{formatMetric(key, run.metrics[key])}</strong>
                    </div>
                  ))}
                </div>
              )}
              {run.findings.map((f) => (
                <div className="finding" key={f.id}>
                  <p>{t(f.statementKey)}</p>
                  <button className="text-button" onClick={() => setWhy(run)}>
                    {t("why")} ↗
                  </button>
                </div>
              ))}
              {session.reports[run.id]?.observations.map((o) => (
                <p className="ai-observation" key={o.findingId}>
                  {o.statement}
                </p>
              ))}
              <details>
                <summary>{t("raw")}</summary>
                <dl>
                  {Object.entries(run.metrics).map(([k, v]) => (
                    <div key={k}>
                      <dt>{t("metric." + k)}</dt>
                      <dd>{formatMetric(k, v)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <button
                className="text-button provenance"
                onClick={() => setWhy(run)}
              >
                {t("evidence")} ↗
              </button>
            </article>
          );
        })}
      </div>
      <section className="card comparison">
        <h2>{t("compare")}</h2>
        {baselineSession &&
        baselineSession.id !== session.id &&
        baselineSession.assessmentDefinition.id ===
          session.assessmentDefinition.id &&
        baselineSession.assessmentDefinition.version ===
          session.assessmentDefinition.version ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("metrics")}</th>
                  <th>
                    {new Date(baselineSession.createdAt).toLocaleDateString(
                      language,
                    )}
                  </th>
                  <th>
                    {new Date(session.createdAt).toLocaleDateString(language)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {session.taskRuns.map((r) => {
                  const first = baselineSession.taskRuns.find(
                    (x) => x.kind === r.kind,
                  );
                  const key = featured[r.kind][0];
                  return (
                    <tr key={r.id}>
                      <td>
                        {t(templates.find((x) => x.kind === r.kind)!.nameKey)} ·{" "}
                        {t("metric." + key)}
                      </td>
                      <td>{formatMetric(key, first?.metrics[key])}</td>
                      <td>{formatMetric(key, r.metrics[key])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t("comparisonUnavailable")}</p>
        )}
      </section>
      {session.assessmentDefinition.id === "FG-BASELINE-2.0" && (
        <p className="notice">{t("shortProtocolNote")}</p>
      )}
      <p className="footnote">
        {t("noNorm")} {t("science.limitations")}
      </p>
      {why && (
        <div className="modal-backdrop" onClick={() => setWhy(null)}>
          <section
            className="modal evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("evidence")}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setWhy(null)}
              aria-label={t("close")}
            >
              ×
            </button>
            <span className="eyebrow">{t("evidence")}</span>
            <h2>
              {t(
                taskTextKey("task", why.kind, session.assessmentDefinition.id),
              )}
            </h2>
            <code>{probeIdForRun(why, session.assessmentDefinition.id)}</code>
            <p>
              {t(templates.find((x) => x.kind === why.kind)!.nameKey)} ·{" "}
              {t("baseline")}
            </p>
            <p>{t("noNorm")}</p>
            {why.findings.map((f) => (
              <div className="evidence-block" key={f.id}>
                <h3>{t(f.statementKey)}</h3>
                <p>
                  {t("rule")}: <code>{f.rule}</code>
                </p>
                {f.evidenceRefs.map((ref) => {
                  const key = ref.split(":metric:")[1];
                  return (
                    <p key={ref}>
                      {t("metric." + key)}:{" "}
                      <strong>{formatMetric(key, why.metrics[key])}</strong>
                      <small className="evidence-id">{ref}</small>
                    </p>
                  );
                })}
              </div>
            ))}
            <p>{t("science.implementation")}</p>
            {templates
              .find((x) => x.kind === why.kind)!
              .science.references.map((ref) => (
                <p key={ref.title}>
                  {ref.url ? (
                    <a href={ref.url} target="_blank" rel="noreferrer">
                      {ref.title} ({ref.year}) ↗
                    </a>
                  ) : (
                    <span>
                      {ref.title} ({ref.year})
                    </span>
                  )}
                </p>
              ))}
            <p>{t("science.limitations")}</p>
          </section>
        </div>
      )}
    </>
  );
}
