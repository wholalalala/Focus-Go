import { createId } from "./core/id";
import { useEffect, useState } from "react";
import {
  Users,
  Compass,
  ChartNoAxesCombined,
  Sprout,
  History,
  Settings,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  Leaf,
} from "lucide-react";
import { I18nContext, initialLanguage, translate } from "./i18n";
import type {
  Child,
  Language,
  Session,
  Domain,
  TrainingPlan,
  ContentArtifact,
  AIInvocation,
} from "./core/types";
import {
  ChildRepository,
  SessionRepository,
  PlanRepository,
  AIArtifactRepository,
  exportChild,
  EventRepository,
} from "./data/repositories";
import { createSession, appendEvent, baselineForSession } from "./core/runtime";
import { templates, probes, baseline } from "./probes";
import { ChildSession } from "./components/ChildSession";
import { Report, formatMetric } from "./components/Report";
import { suggestedDirections } from "./core/planner";
import { hash } from "./core/random";
const nav = [
  ["children", Users],
  ["assessment", Compass],
  ["report", ChartNoAxesCombined],
  ["training", Sprout],
  ["history", History],
  ["settings", Settings],
] as const;
export function childAge(child: Child) {
  const birth = new Date(child.birthYearMonth + "-01"),
    now = new Date();
  return (
    now.getFullYear() -
    birth.getFullYear() -
    (now.getMonth() < birth.getMonth() ? 1 : 0)
  );
}
export default function App() {
  const [language, setLang] = useState<Language>(initialLanguage),
    [page, setPage] = useState("children"),
    [children, setChildren] = useState<Child[]>([]),
    [selected, setSelected] = useState(""),
    [sessions, setSessions] = useState<Session[]>([]),
    [active, setActive] = useState<Session | null>(null),
    [editing, setEditing] = useState<Partial<Child> | null>(null),
    [error, setError] = useState(""),
    [plan, setPlan] = useState<TrainingPlan | null>(null),
    [chosen, setChosen] = useState<Domain[]>(["RESPONSE_INHIBITION"]),
    [locked, setLocked] = useState<Domain[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [reportId, setReportId] = useState(""),
    [health, setHealth] = useState<{
      configured: boolean;
      baseUrl: string;
      model: string;
    } | null>(null),
    [theme, setTheme] = useState("garden"),
    [simulate, setSimulate] = useState(false),
    [devData, setDevData] = useState(""),
    [seed, setSeed] = useState("focusgo-demo");
  const t = (key: string) => translate(language, key);
  const child = children.find((c) => c.id === selected);
  const completed = sessions.filter(
    (s) => s.mode === "ASSESSMENT" && s.status === "COMPLETED",
  );
  const report = completed.find((s) => s.id === reportId) ?? completed.at(-1);
  const ongoing = sessions.find((s) => s.status !== "COMPLETED");
  const setLanguage = (l: Language) => {
    setLang(l);
    localStorage.setItem("focusgo-language", l);
    document.documentElement.lang = l;
  };
  async function reload() {
    const all = await ChildRepository.all();
    setChildren(all);
    if (!selected && all.length) setSelected(all[0].id);
    if (selected) {
      setSessions(await SessionRepository.forChild(selected));
      const p = await PlanRepository.forChild(selected);
      setPlan(p ?? null);
      if (p) {
        setChosen([p.primaryDomain, ...p.secondaryDomains]);
        setLocked(p.lockedDomains);
      } else {
        setChosen(["RESPONSE_INHIBITION"]);
        setLocked([]);
      }
    }
  }
  useEffect(() => {
    void reload().catch(() => setError("error"));
    void fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [selected]);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  async function saveChild(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const now = new Date().toISOString();
    const next: Child = {
      id: editing.id ?? createId(),
      nickname: editing.nickname?.trim() ?? "",
      birthYearMonth: editing.birthYearMonth ?? "",
      preferredLanguage: editing.preferredLanguage ?? language,
      readingLevel: editing.readingLevel ?? "NONE",
      optionalNotes: editing.optionalNotes ?? "",
      createdAt: editing.createdAt ?? now,
      updatedAt: now,
    };
    if (childAge(next) < 5 || childAge(next) > 8) {
      setError("ageRange");
      return;
    }
    try {
      await ChildRepository.save(next);
      setEditing(null);
      setSelected(next.id);
      await reload();
      setError("");
    } catch {
      setError("error");
    }
  }
  async function remove(c: Child) {
    if (!confirm(t("deleteConfirm"))) return;
    await ChildRepository.delete(c.id);
    if (selected === c.id) {
      setSelected("");
      setSessions([]);
    }
    await reload();
  }
  async function launch(s: Session) {
    await appendEvent(s, "SESSION_CREATED");
    await appendEvent(s, "SESSION_STARTED");
    await appendEvent(s, "TASK_STARTED");
    await appendEvent(s, "INSTRUCTION_SHOWN");
    await SessionRepository.save(s);
    if (child) setLanguage(child.preferredLanguage);
    setActive(s);
  }
  async function resume(s: Session) {
    const next = structuredClone(s);
    const events = await EventRepository.forSession(s.id);
    next.status = "ACTIVE";
    if (!events.some((e) => e.type === "SESSION_STARTED")) {
      await appendEvent(next, "SESSION_STARTED");
      await appendEvent(next, "TASK_STARTED");
      await appendEvent(next, "INSTRUCTION_SHOWN");
    } else await appendEvent(next, "RESUMED");
    await SessionRepository.save(next);
    if (child) setLanguage(child.preferredLanguage);
    setActive(next);
  }
  async function prepare() {
    if (!child || !chosen.length) return;
    setBusy(true);
    setMessage("");
    try {
      const p: TrainingPlan = {
        id: plan?.id ?? createId(),
        childId: child.id,
        primaryDomain: chosen[0],
        secondaryDomains: chosen.slice(1),
        allocation: Object.fromEntries(
          chosen.map((d) => [d, 1 / chosen.length]),
        ),
        lockedDomains: locked,
        evidenceRefs:
          report?.taskRuns.flatMap((r) => r.findings.map((f) => f.id)) ?? [],
        createdAt: new Date().toISOString(),
      };
      await PlanRepository.save(p);
      setPlan(p);
      const artifacts: ContentArtifact[] = [],
        invocations: AIInvocation[] = [];
      let fallback = false;
      for (const domain of chosen) {
        const template = templates.find((x) => x.domain === domain)!;
        const cacheKey = hash({
          template: template.id,
          version: template.version,
          difficulty: template.difficultySchema,
          language: child.preferredLanguage,
          ageBand: "5-8",
          theme,
        });
        let artifact = simulate
          ? undefined
          : await AIArtifactRepository.find(cacheKey, child.id);
        if (artifact?.source === "BUILT_IN" && health?.configured)
          artifact = undefined;
        if (!artifact) {
          let data;
          try {
            const response = await fetch("/api/ai/generate-training-content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kind: template.kind,
                templateVersion: template.version,
                language: child.preferredLanguage,
                targetAge: Math.max(5, Math.min(8, childAge(child))),
                theme,
                simulateUnavailable: simulate,
              }),
              signal: AbortSignal.timeout(80000),
            });
            if (!response.ok) throw new Error();
            data = await response.json();
          } catch {
            const { localContent } = await import("./ai/validation");
            const content = {
              ...localContent(
                child.preferredLanguage,
                template.kind,
                template.version,
              ),
              theme,
            };
            data = {
              artifact: {
                id: createId(),
                taskTemplateId: template.id,
                taskTemplateVersion: template.version,
                language: child.preferredLanguage,
                targetAge: childAge(child),
                difficultySnapshot: template.difficultySchema,
                content,
                createdAt: new Date().toISOString(),
                contentHash: hash(content),
                cacheKey,
                source: "BUILT_IN",
              },
              invocations: [],
            };
          }
          artifact = { ...data.artifact, childId: child.id } as ContentArtifact;
          await AIArtifactRepository.save(artifact);
          invocations.push(...data.invocations);
        }
        artifacts.push(artifact);
        fallback ||= artifact.source === "BUILT_IN";
      }
      const s = createSession(
        child.id,
        "TRAINING",
        chosen.map((d) => templates.find((x) => x.domain === d)!.kind),
        artifacts,
      );
      s.invocations = invocations;
      await appendEvent(s, "SESSION_CREATED");
      await SessionRepository.save(s);
      setSessions(await SessionRepository.forChild(child.id));
      setMessage(fallback ? "fallback" : "aiReady");
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }
  function suggest() {
    if (!report) return;
    const suggestion = suggestedDirections(report);
    if (!suggestion.domains.length) {
      setMessage("training.noSuggestion");
      return;
    }
    setChosen([...new Set([...locked, ...suggestion.domains])]);
  }
  async function download() {
    if (!child) return;
    const data = await exportChild(child.id);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `focusgo-${child.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const dev = import.meta.env.DEV && location.pathname === "/dev";
  if (active)
    return (
      <I18nContext.Provider value={{ language, setLanguage }}>
        <ChildSession
          initial={active}
          onExit={() => {
            setActive(null);
            setPage(active.mode === "ASSESSMENT" ? "report" : "history");
            void reload();
          }}
        />
      </I18nContext.Provider>
    );
  return (
    <I18nContext.Provider value={{ language, setLanguage }}>
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="/">
            Focus<span>&</span>Go<i>✦</i>
          </a>
          <p className="brand-caption">{t("app.subtitle")}</p>
          <div className="parent-label">{t("parent")}</div>
          <nav>
            {nav.map(([id, Icon]) => (
              <button
                className={page === id ? "active" : ""}
                key={id}
                onClick={() => {
                  setPage(id);
                  setMessage("");
                }}
              >
                <Icon size={19} />
                {t("nav." + id)}
                {page === id && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <ShieldCheck size={20} />
            <p>{t("local")}</p>
            <small>Focus&Go v0.1</small>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <span>{t("parent")}</span>
            <div>
              <select
                aria-label={t("selectChild")}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">{t("selectChild")}</option>
                {children.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.nickname}
                  </option>
                ))}
              </select>
              <button
                className="language-switch"
                onClick={() => setLanguage(language === "en" ? "zh-CN" : "en")}
              >
                {language === "en" ? "简体中文" : "English"}
              </button>
            </div>
          </header>
          <main className="parent-content">
            {error && (
              <div className="notice error" role="alert">
                {t(error)}
                <button onClick={() => setError("")}>×</button>
              </div>
            )}
            {dev && (
              <section className="card">
                <h2>{t("dev")}</h2>
                <label>
                  {t("seed")}
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={simulate}
                    onChange={(e) => setSimulate(e.target.checked)}
                  />
                  {t("simulate")}
                </label>
                <button
                  onClick={() =>
                    setDevData(
                      JSON.stringify(
                        { templates, probes, baseline, seed },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  {t("evidence")}
                </button>
                {probes.map((p) => (
                  <button
                    key={p.id}
                    disabled={!child}
                    onClick={() => {
                      const s = createSession(
                        child!.id,
                        "ASSESSMENT",
                        [p.kind],
                        [],
                        seed,
                      );
                      void launch(s);
                    }}
                  >
                    {p.id}
                  </button>
                ))}
                <button
                  onClick={() =>
                    void Promise.all(
                      sessions.map((s) => EventRepository.forSession(s.id)),
                    ).then((x) => setDevData(JSON.stringify(x, null, 2)))
                  }
                >
                  {t("history.title")}
                </button>
                <pre>{devData}</pre>
              </section>
            )}
            {page === "children" ? (
              <>
                <div className="hero">
                  <div>
                    <span className="eyebrow">{t("hero.eyebrow")}</span>
                    <h1>{t("welcome")}</h1>
                    <p>{t("welcome.sub")}</p>
                    <button
                      className="primary"
                      onClick={() =>
                        setEditing({ preferredLanguage: language })
                      }
                    >
                      <Plus size={18} />
                      {t("addChild")}
                    </button>
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="art-leaf leaf-one" />
                    <div className="art-leaf leaf-two" />
                    <div className="art-stem" />
                    <div className="art-pot" />
                    <span className="art-star">✧</span>
                    <span className="art-dot" />
                  </div>
                </div>
                <div className="section-heading">
                  <div>
                    <h2>{t("children.title")}</h2>
                    <p>{t("children.sub")}</p>
                  </div>
                  <span className="count-badge">{children.length}</span>
                </div>
                <div className="children-grid">
                  {children.map((c, i) => (
                    <article
                      className={
                        "card child-profile " +
                        (selected === c.id ? "selected" : "")
                      }
                      key={c.id}
                    >
                      <div className={"avatar avatar-" + (i % 3)}>
                        {c.nickname.slice(0, 1)}
                      </div>
                      <h2>{c.nickname}</h2>
                      <p>
                        {childAge(c)} {t("age")} · {t("private")}
                      </p>
                      <div className="profile-actions">
                        <button
                          className="secondary"
                          onClick={() => setSelected(c.id)}
                        >
                          {t(selected === c.id ? "selected" : "select")}
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setEditing(c)}
                        >
                          {t("edit")}
                        </button>
                        <button
                          className="text-button danger"
                          onClick={() => void remove(c)}
                        >
                          {t("delete")}
                        </button>
                      </div>
                      {selected === c.id && (
                        <button
                          className="profile-continue"
                          onClick={() => setPage("assessment")}
                        >
                          {t("available")}
                          <ArrowUpRight size={20} />
                        </button>
                      )}
                    </article>
                  ))}
                  <button
                    className="add-profile"
                    onClick={() => setEditing({ preferredLanguage: language })}
                  >
                    <span>
                      <Plus size={24} />
                    </span>
                    {t("addChild")}
                  </button>
                </div>
                <div className="principle-card">
                  <Leaf size={28} />
                  <div>
                    <h3>{t("principle")}</h3>
                    <p>{t("disclaimer")}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="page-heading">
                  <span className="eyebrow">
                    {child?.nickname ?? "Focus&Go"}
                  </span>
                  <h1>
                    {t(
                      page === "assessment"
                        ? "baseline.title"
                        : page === "report"
                          ? "report.title"
                          : page === "training"
                            ? "training.title"
                            : page === "history"
                              ? "history.title"
                              : "settings.title",
                    )}
                  </h1>
                  <p>
                    {t(page === "assessment" ? "baseline.sub" : page + ".sub")}
                  </p>
                </div>
                {page !== "settings" && !child ? (
                  <section className="empty-state card">
                    <Sprout size={40} />
                    <h2>{t("empty")}</h2>
                    <p>{t("selectChild")}</p>
                    <button
                      className="primary"
                      onClick={() => setPage("children")}
                    >
                      {t("addChild")}
                    </button>
                  </section>
                ) : null}
                {page === "assessment" && child && (
                  <>
                    <section className="baseline-banner">
                      <div>
                        <span className="pill">{t("duration")}</span>
                        <h2>{t("baseline")}</h2>
                        <p>{t("baseline.desc")}</p>
                        <button
                          className="primary"
                          disabled={!!ongoing}
                          onClick={() =>
                            void launch(
                              createSession(child.id, "ASSESSMENT"),
                            ).catch(() => setError("error"))
                          }
                        >
                          {t("startBaseline")} →
                        </button>
                        {ongoing && (
                          <button
                            className="secondary"
                            onClick={() => void resume(ongoing)}
                          >
                            {t("resume")}
                          </button>
                        )}
                      </div>
                      <Compass size={100} strokeWidth={0.8} />
                    </section>
                    <div className="section-heading">
                      <h2>{t("six")}</h2>
                      <span className="pill">{baseline.id}</span>
                    </div>
                    <div className="domain-grid">
                      {templates.map((task, i) => (
                        <article className="card domain-card" key={task.id}>
                          <span className="domain-number">0{i + 1}</span>
                          <h3>{t(task.nameKey)}</h3>
                          <p>{t("task." + task.kind)}</p>
                          <small>{t("instruction." + task.kind)}</small>
                        </article>
                      ))}
                    </div>
                    <p className="footnote">{t("disclaimer")}</p>
                  </>
                )}
                {page === "report" &&
                  child &&
                  (report ? (
                    <Report
                      session={report}
                      baselineSession={baselineForSession(completed, report)}
                      age={childAge(child)}
                      onUpdate={() => void reload()}
                    />
                  ) : (
                    <section className="card empty-state">
                      <ChartNoAxesCombined size={40} />
                      <h2>{t("notStarted")}</h2>
                      <p>{t("noRecords")}</p>
                      <button
                        className="primary"
                        onClick={() => setPage("assessment")}
                      >
                        {t("startBaseline")}
                      </button>
                    </section>
                  ))}
                {page === "training" && child && (
                  <>
                    <p className="notice">
                      {t(report ? "training.evidence" : "training.manual")}
                    </p>
                    <div className="section-heading">
                      <h2>{t("six")}</h2>
                      <button
                        className="secondary"
                        disabled={!report}
                        onClick={suggest}
                      >
                        {t("suggest")}
                      </button>
                    </div>
                    <div className="domain-grid">
                      {templates.map((task) => (
                        <article
                          className={
                            "card training-option " +
                            (chosen.includes(task.domain) ? "checked" : "")
                          }
                          key={task.id}
                        >
                          <label>
                            <input
                              type="checkbox"
                              checked={chosen.includes(task.domain)}
                              disabled={locked.includes(task.domain) || busy}
                              onChange={(e) =>
                                setChosen(
                                  e.target.checked
                                    ? [...chosen, task.domain]
                                    : chosen.filter((x) => x !== task.domain),
                                )
                              }
                            />
                            <h3>{t(task.nameKey)}</h3>
                          </label>
                          <p>{t("task." + task.kind)}</p>
                          <button
                            className="text-button"
                            disabled={!chosen.includes(task.domain)}
                            onClick={() =>
                              setLocked(
                                locked.includes(task.domain)
                                  ? locked.filter((x) => x !== task.domain)
                                  : [...locked, task.domain],
                              )
                            }
                          >
                            {t(
                              locked.includes(task.domain) ? "locked" : "lock",
                            )}
                          </button>
                        </article>
                      ))}
                    </div>
                    <section className="card training-controls">
                      <label>
                        {t("theme")}
                        <select
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                        >
                          {["garden", "space", "ocean"].map((x) => (
                            <option value={x} key={x}>
                              {t(x)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="primary"
                        disabled={busy || !chosen.length || !!ongoing}
                        onClick={() => void prepare()}
                      >
                        {t(busy ? "generating" : "generate")}
                        <ArrowUpRight size={18} />
                      </button>
                      {ongoing && (
                        <button
                          className="secondary"
                          onClick={() => void resume(ongoing)}
                        >
                          {t(
                            ongoing.mode === "TRAINING"
                              ? "launchTraining"
                              : "resume",
                          )}
                        </button>
                      )}
                    </section>
                    {message && <p className="notice">{t(message)}</p>}
                  </>
                )}
                {page === "history" && child && (
                  <>
                    <div className="section-heading">
                      <h2>{t("nav.history")}</h2>
                      <button
                        className="secondary"
                        onClick={() => void download()}
                      >
                        {t("export")}
                      </button>
                    </div>
                    {!sessions.length ? (
                      <section className="card empty-state">
                        {t("noRecords")}
                      </section>
                    ) : (
                      <section className="card table-scroll">
                        <table>
                          <tbody>
                            {[...sessions].reverse().map((s) => (
                              <tr key={s.id}>
                                <td>
                                  <strong>
                                    {t(
                                      s.mode === "ASSESSMENT"
                                        ? "assessmentMode"
                                        : "trainingMode",
                                    )}
                                  </strong>
                                  <small>
                                    {new Date(s.createdAt).toLocaleString(
                                      language,
                                    )}
                                  </small>
                                </td>
                                <td>
                                  <span className="pill">
                                    {t(
                                      s.status === "COMPLETED"
                                        ? "complete"
                                        : s.status === "PAUSED"
                                          ? "paused"
                                          : "inProgress",
                                    )}
                                  </span>
                                </td>
                                <td>
                                  {
                                    s.taskRuns.filter((r) => r.results.length)
                                      .length
                                  }{" "}
                                  / {s.taskRuns.length}
                                </td>
                                <td>
                                  {s.status === "COMPLETED" &&
                                  s.mode === "ASSESSMENT" ? (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setReportId(s.id);
                                        setPage("report");
                                      }}
                                    >
                                      {t("view")} ↗
                                    </button>
                                  ) : s.status !== "COMPLETED" ? (
                                    <button
                                      className="text-button"
                                      onClick={() => void resume(s)}
                                    >
                                      {t("resume")}
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </section>
                    )}
                    {completed.length > 1 && (
                      <section className="card trend">
                        <h2>{t("compare")}</h2>
                        {templates.map((task) => (
                          <div key={task.id}>
                            <strong>{t(task.nameKey)}</strong>
                            <div className="trend-points">
                              {completed.map((s) => {
                                const m = s.taskRuns.find(
                                  (r) => r.kind === task.kind,
                                )?.metrics;
                                return (
                                  <span key={s.id}>
                                    <i
                                      style={{
                                        height: `${10 + (m?.accuracy ?? 0) * 70}px`,
                                      }}
                                    />
                                    <small>
                                      {formatMetric("accuracy", m?.accuracy)}
                                    </small>
                                    <small>
                                      {new Date(s.createdAt).toLocaleDateString(
                                        language,
                                      )}
                                    </small>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </section>
                    )}
                  </>
                )}
                {page === "settings" && (
                  <>
                    <section className="card settings-card">
                      <h2>{t("language")}</h2>
                      <select
                        value={language}
                        onChange={(e) =>
                          setLanguage(e.target.value as Language)
                        }
                      >
                        <option value="zh-CN">简体中文</option>
                        <option value="en">English</option>
                      </select>
                    </section>
                    <section className="card settings-card">
                      <div className="section-heading">
                        <h2>{t("settings.ai")}</h2>
                        <span className="pill">
                          {t(
                            health?.configured ? "configured" : "unconfigured",
                          )}
                        </span>
                      </div>
                      <p>{t("settings.env")}</p>
                      <pre>
                        FOCUSGO_LLM_BASE_URL=
                        {health?.baseUrl ?? "https://api.deepseek.com"}
                        {"\n"}FOCUSGO_LLM_API_KEY={"••••••"}
                        {"\n"}FOCUSGO_LLM_MODEL=
                        {health?.model ?? "deepseek-flash"}
                      </pre>
                      <p>{t("fallback")}</p>
                    </section>
                    <section className="card settings-card">
                      <ShieldCheck />
                      <h2>{t("local")}</h2>
                      <p>{t("settings.privacy")}</p>
                      <button
                        className="secondary"
                        disabled={!child}
                        onClick={() => void download()}
                      >
                        {t("export")}
                      </button>
                    </section>
                  </>
                )}
              </>
            )}
          </main>
          <footer>{t("disclaimer")}</footer>
        </div>
        {editing && (
          <div className="modal-backdrop">
            <form className="modal" onSubmit={(e) => void saveChild(e)}>
              <h2>{t(editing.id ? "edit" : "addChild")}</h2>
              <label>
                {t("nickname")}
                <input
                  autoFocus
                  required
                  maxLength={30}
                  value={editing.nickname ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, nickname: e.target.value })
                  }
                />
              </label>
              <label>
                {t("birth")}
                <input
                  type="month"
                  required
                  value={editing.birthYearMonth ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, birthYearMonth: e.target.value })
                  }
                />
              </label>
              <label>
                {t("language")}
                <select
                  value={editing.preferredLanguage ?? language}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      preferredLanguage: e.target.value as Language,
                    })
                  }
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label>
                {t("reading")}
                <select
                  value={editing.readingLevel ?? "NONE"}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      readingLevel: e.target.value as Child["readingLevel"],
                    })
                  }
                >
                  {["NONE", "EMERGING", "INDEPENDENT"].map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("notes")}
                <textarea
                  maxLength={500}
                  value={editing.optionalNotes ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, optionalNotes: e.target.value })
                  }
                />
              </label>
              {error && <p role="alert">{t(error)}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditing(null);
                    setError("");
                  }}
                >
                  {t("cancel")}
                </button>
                <button className="primary" type="submit">
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </I18nContext.Provider>
  );
}
