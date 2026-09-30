import type { AbilitySnapshot, Session, Domain } from "./types";
import { templates } from "../probes";
export function abilitySnapshot(session: Session): AbilitySnapshot {
  return {
    assessmentId: session.id,
    domains: session.taskRuns.map((run) => ({
      domain: templates.find((t) => t.kind === run.kind)!.domain,
      metrics: { ...run.metrics },
      findingIds: run.findings.map((f) => f.id),
    })),
  };
}
export function suggestedDirections(session: Session): {
  domains: Domain[];
  evidenceRefs: string[];
} {
  const patterns = session.taskRuns.flatMap((run) =>
    run.findings
      .filter((f) =>
        ["COMMISSION_DOMINANT", "INSTRUCTION_LOAD_DROP"].includes(f.type),
      )
      .map((f) => ({
        domain: templates.find((t) => t.kind === run.kind)!.domain,
        id: f.id,
      })),
  );
  return {
    domains: [...new Set(patterns.map((p) => p.domain))],
    evidenceRefs: patterns.map((p) => p.id),
  };
}
