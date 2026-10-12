import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Modal, Field, form, value, number } from "../components/forms";
import { HabitForm, GoalForm } from "../features/missions/Forms";
import {
  Mountain,
  ArrowUpRight,
  ArrowRight,
  Check,
  Plus,
  Activity,
  Flag,
  CalendarDays,
  Settings,
  Download,
  Upload,
  Trash2,
  Menu,
} from "lucide-react";
import { WeightChart } from "../features/measurements/WeightChart";
import { Timeline } from "../features/timeline/Timeline";
import { Training } from "../features/training/Training";
import { repository, migrate } from "../data/repository";
import { newMission } from "../data/seed";
import {
  id,
  type Store,
  type Mission,
  type Measurement,
  type TrainingSession,
} from "../domain/model";
import {
  today,
  countdown,
  daysBetween,
  addDays,
  formatDate,
  due,
  isComplete,
  orderedMeasurements,
  schedule,
} from "../domain/logic";
const download = (text: string, name: string) => {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};
export function App() {
  const [initial] = useState(() => {
    try {
      return { store: repository.load(), error: "" };
    } catch (e) {
      return { store: null, error: String(e) };
    }
  });
  const [store, setStore] = useState<Store | null>(initial.store),
    [error, setError] = useState(initial.error),
    [entered, setEntered] = useState(false),
    [tab, setTab] = useState("Overview"),
    [modal, setModal] = useState<ReactNode>(null),
    [notice, setNotice] = useState(""),
    [logDate, setLogDate] = useState(today()),
    [week, setWeek] = useState(0),
    [mobile, setMobile] = useState(false);
  const close = () => setModal(null);
  const commit = (next: Store) => {
    try {
      repository.save(next);
      setStore(next);
      setError("");
      return true;
    } catch (e) {
      setError(`Your change was not saved: ${String(e)}`);
      return false;
    }
  };
  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const validated = repository.import.bind(repository);
      const data = migrate(JSON.parse(text));
      if (
        window.confirm(
          `Replace local data with ${data.missions.length} mission(s)? The previous data will be retained as a local recovery backup.`,
        )
      ) {
        setStore(validated(text));
        setError("");
        setNotice("Backup imported successfully.");
      }
    } catch (e) {
      setError(String(e));
    }
  };
  const backups = (
    <>
      <button
        onClick={() => {
          try {
            download(repository.export(), `summit-backup-${today()}.json`);
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        <Download size={16} /> Export JSON
      </button>
      <label className="button">
        <Upload size={16} /> Import JSON
        <input
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
      </label>
      <button
        className="danger"
        onClick={() => {
          if (
            window.confirm(
              "Reset all missions and logs? Export a backup first. A local recovery copy will also be retained.",
            )
          ) {
            try {
              setStore(repository.reset());
              setError("");
            } catch (e) {
              setError(String(e));
            }
          }
        }}
      >
        Reset data
      </button>
    </>
  );
  if (!store)
    return (
      <main className="recovery">
        <Mountain />
        <h1>Your journal is protected.</h1>
        <p>
          Saved data could not be read. It has not been overwritten. Export the
          original before importing a valid backup or resetting.
        </p>
        <p role="alert">{error}</p>
        <div className="actions">{backups}</div>
      </main>
    );
  const mission = store.missions.find((m) => m.id === store.activeMissionId)!;
  const updateMission = (next: Mission) =>
    commit({
      ...store,
      missions: store.missions.map((m) => (m.id === next.id ? next : m)),
    });
  const sessions = store.sessions
      .filter((s) => s.missionId === mission.id)
      .sort((a, b) => a.date.localeCompare(b.date)),
    measurements = orderedMeasurements(
      store.measurements.filter((m) => m.missionId === mission.id),
    );
  const weightDef =
    mission.measurementDefinitions.find((d) =>
      d.title.toLowerCase().includes("weight"),
    ) ?? mission.measurementDefinitions[0];
  const current = today(),
    remaining = countdown(mission.targetDate),
    total = daysBetween(mission.startDate, mission.targetDate) + 1;
  const todaysHabits = mission.habits
      .filter((h) => due(h, logDate))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    completed = todaysHabits.filter((h) =>
      isComplete(store.habitEntries, h.id, logDate),
    ).length;
  const nextMilestone = mission.milestones
      .filter((m) => m.status !== "completed")
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0],
    todaySession = sessions.find((s) => s.date === logDate),
    longSession = sessions.find(
      (s) =>
        s.date >= current &&
        !s.completed &&
        !s.skipped &&
        s.plannedDistance !== null,
    );
  function editMeasurement(existing?: Measurement) {
    setModal(
      <Modal
        title={existing ? "Edit observation" : "Record an observation"}
        close={close}
      >
        <form
          onSubmit={(e) => {
            const f = form(e),
              definition = value(f, "definition"),
              date = value(f, "date");
            const item: Measurement = {
              id: existing?.id ?? id(),
              missionId: mission.id,
              measurementDefinitionId: definition,
              date,
              value: Number(value(f, "value")),
              note: value(f, "note"),
            };
            if (
              store!.measurements.some(
                (m) =>
                  m.id !== item.id &&
                  m.missionId === mission.id &&
                  m.measurementDefinitionId === definition &&
                  m.date === date,
              )
            ) {
              setError(
                "An observation for this measurement and date already exists. Edit that entry instead.",
              );
              return;
            }
            if (
              commit({
                ...store!,
                measurements: [
                  ...store!.measurements.filter((m) => m.id !== item.id),
                  item,
                ],
              })
            )
              close();
          }}
        >
          <Field label="Measurement">
            <select
              name="definition"
              defaultValue={existing?.measurementDefinitionId ?? weightDef?.id}
            >
              {mission.measurementDefinitions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.unit})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              required
              type="date"
              name="date"
              defaultValue={existing?.date ?? current}
            />
          </Field>
          <Field label="Value">
            <input
              required
              type="number"
              step="any"
              name="value"
              defaultValue={existing?.value}
            />
          </Field>
          <Field label="Note (optional)">
            <input name="note" defaultValue={existing?.note} />
          </Field>
          <button className="primary" type="submit">
            Save observation
          </button>
        </form>
      </Modal>,
    );
  }
  function editSession(s: TrainingSession) {
    setModal(
      <Modal title="Training log" close={close}>
        <p className="muted">
          {formatDate(s.date)} · Suggestions adapt to your capacity and
          recovery.
        </p>
        <form
          onSubmit={(e) => {
            const f = form(e),
              status = value(f, "status");
            const updated = {
              ...s,
              date: value(f, "date"),
              activityType: value(f, "activity"),
              plannedDistance: number(f, "planned"),
              actualDistance: number(f, "actual"),
              duration: number(f, "duration"),
              elevationGain: number(f, "elevation"),
              notes: value(f, "notes"),
              completed: status === "completed",
              skipped: status === "skipped",
            };
            if (
              commit({
                ...store!,
                sessions: [
                  ...store!.sessions.filter((x) => x.id !== s.id),
                  updated,
                ],
              })
            )
              close();
          }}
        >
          <Field label="Session date">
            <input required type="date" name="date" defaultValue={s.date} />
          </Field>
          <Field label="Activity">
            <input required name="activity" defaultValue={s.activityType} />
          </Field>
          <div className="form-grid">
            <Field label="Suggested distance (mi)">
              <input
                type="number"
                min="0"
                step="0.1"
                name="planned"
                defaultValue={s.plannedDistance ?? ""}
              />
            </Field>
            <Field label="Actual distance (mi)">
              <input
                type="number"
                min="0"
                step="0.1"
                name="actual"
                defaultValue={s.actualDistance ?? ""}
              />
            </Field>
            <Field label="Duration (min)">
              <input
                type="number"
                min="0"
                name="duration"
                defaultValue={s.duration ?? ""}
              />
            </Field>
            <Field label="Elevation gain (ft)">
              <input
                type="number"
                min="0"
                name="elevation"
                defaultValue={s.elevationGain ?? ""}
              />
            </Field>
          </div>
          <Field label="Status">
            <select
              name="status"
              defaultValue={
                s.completed ? "completed" : s.skipped ? "skipped" : "planned"
              }
            >
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped / adjusted</option>
            </select>
          </Field>
          <Field label="Notes">
            <textarea name="notes" defaultValue={s.notes} />
          </Field>
          <button className="primary">Save session</button>
        </form>
      </Modal>,
    );
  }
  function missionForm(existing?: Mission) {
    setModal(
      <Modal
        title={existing ? "Edit mission" : "Define a new mission"}
        close={close}
      >
        <form
          onSubmit={(e) => {
            const f = form(e),
              start = value(f, "start"),
              target = value(f, "target");
            if (target < start) {
              setError("Target date must be on or after the start date.");
              return;
            }
            const m = {
              ...(existing ?? newMission(value(f, "name"), start, target)),
              name: value(f, "name"),
              tagline: value(f, "tagline"),
              description: value(f, "description"),
              startDate: start,
              targetDate: target,
              coverImage: value(f, "cover"),
              theme: value(f, "theme"),
              status: value(f, "status") as Mission["status"],
            };
            if (
              commit({
                ...store!,
                activeMissionId: m.id,
                missions: existing
                  ? store!.missions.map((x) => (x.id === m.id ? m : x))
                  : [...store!.missions, m],
                sessions: existing
                  ? store!.sessions
                  : [
                      ...store!.sessions,
                      ...(value(f, "plan") === "movement"
                        ? schedule(m.id, start, target)
                        : []),
                    ],
              })
            )
              close();
          }}
        >
          <Field label="Mission name">
            <input required name="name" defaultValue={existing?.name} />
          </Field>
          <Field label="Entrance headline">
            <input
              required
              name="tagline"
              defaultValue={
                existing?.tagline ??
                "A meaningful objective. One day at a time."
              }
            />
          </Field>
          <Field label="Primary objective / destination">
            <textarea
              required
              name="description"
              defaultValue={existing?.description}
            />
          </Field>
          <div className="form-grid">
            <Field label="Start">
              <input
                required
                type="date"
                name="start"
                defaultValue={existing?.startDate ?? current}
              />
            </Field>
            <Field label="Target">
              <input
                required
                type="date"
                name="target"
                defaultValue={existing?.targetDate ?? addDays(current, 90)}
              />
            </Field>
          </div>
          <Field label="Cover image URL">
            <input
              name="cover"
              defaultValue={existing?.coverImage ?? newMission("").coverImage}
            />
          </Field>
          <Field label="Accent">
            <input
              type="color"
              name="theme"
              defaultValue={existing?.theme ?? "#97b7c6"}
            />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={existing?.status ?? "active"}>
              {["planned", "active", "completed", "archived"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          {!existing && (
            <Field label="Suggested training plan">
              <select name="plan">
                <option value="none">
                  No template · log sessions as needed
                </option>
                <option value="movement">
                  Weekly strength, movement, trail & recovery
                </option>
              </select>
            </Field>
          )}
          <button className="primary">Save mission</button>
        </form>
      </Modal>,
    );
  }
  const header = (
    <header className="topbar">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setEntered(false);
        }}
      >
        <Mountain size={27} /> SUMMIT<span>EXPEDITION JOURNAL</span>
      </a>
      <div className="header-right">
        <span className="status-dot" /> PERSONAL MISSION CONTROL{" "}
        <button
          aria-label="Toggle navigation"
          className="mobile-menu"
          onClick={() => setMobile(!mobile)}
        >
          <Menu />
        </button>
      </div>
    </header>
  );
  if (!entered)
    return (
      <div
        className="entrance"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(8,16,22,.78),rgba(8,16,22,.18)),linear-gradient(0deg,#0d151b,transparent 65%),url("${mission.coverImage}")`,
        }}
      >
        {header}
        <main className="entrance-content">
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>{mission.tagline}</h1>
          <div className="entrance-line" />
          <p className="mission-name">{mission.name}</p>
          <p className="muted">{mission.description}</p>
          <div className="entrance-meta">
            <span>
              <b>{remaining}</b> DAYS TO GO
            </span>
            <span>
              {formatDate(mission.startDate)} — {formatDate(mission.targetDate)}
              , {mission.targetDate.slice(0, 4)}
            </span>
          </div>
          <button className="primary enter" onClick={() => setEntered(true)}>
            Enter Mission <ArrowRight size={19} />
          </button>
        </main>
        <footer className="entrance-footer">
          <span>01 / THE OBJECTIVE</span>
          <span>THE WORK IS DAILY. THE VIEW IS EARNED.</span>
          <Mountain size={24} />
        </footer>
        {error && <p className="alert">{error}</p>}
      </div>
    );
  const chart = (
    <WeightChart
      mission={mission}
      measurements={measurements}
      record={() => editMeasurement()}
    />
  );
  const timeline = <Timeline mission={mission} />;
  return (
    <div
      className="shell"
      style={{ "--accent": mission.theme } as React.CSSProperties}
    >
      {header}
      <div className="layout">
        <aside className={mobile ? "sidebar open" : "sidebar"}>
          <p className="eyebrow">YOUR EXPEDITION</p>
          <select
            aria-label="Select mission"
            value={mission.id}
            onChange={(e) => {
              commit({ ...store, activeMissionId: e.target.value });
              setWeek(0);
            }}
          >
            {store.missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.status === "archived" ? " (archived)" : ""}
              </option>
            ))}
          </select>
          <nav>
            {[
              ["Overview", Mountain],
              ["Training", Activity],
              ["Timeline", CalendarDays],
              ["Measurements", Flag],
              ["Mission settings", Settings],
            ].map(([name, Icon]) => (
              <button
                key={String(name)}
                className={tab === name ? "active" : ""}
                onClick={() => {
                  setTab(String(name));
                  setMobile(false);
                }}
              >
                {typeof Icon !== "string" && <Icon size={18} />} {String(name)}{" "}
                {tab === name && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="mini-contour">
              <Mountain size={44} />
            </div>
            <p>
              A little stronger.
              <br />A little closer.
            </p>
            <span>ONE DAY AT A TIME.</span>
            <button className="text-button" onClick={() => missionForm()}>
              <Plus size={16} /> New mission
            </button>
          </div>
        </aside>
        <main className="content">
          {error && (
            <div role="alert" className="alert">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert">
              {notice}
              <button onClick={() => setNotice("")}>Dismiss</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Date()
                  .toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </p>
              <h1>{tab === "Overview" ? "The mountain is calling." : tab}</h1>
              <p className="muted">
                {tab === "Overview"
                  ? "Show up for today. The bigger picture will follow."
                  : mission.name}
              </p>
            </div>
            <span className="mission-badge">
              <span className="status-dot" />
              {mission.status.toUpperCase()} MISSION
            </span>
          </div>
          {tab === "Overview" && (
            <>
              <section
                className="mission-banner"
                style={{
                  backgroundImage: `linear-gradient(90deg,#10222bed,#10222b20),url("${mission.coverImage}")`,
                }}
              >
                <div>
                  <p className="eyebrow">
                    THE OBJECTIVE / {mission.targetDate.slice(0, 4)}
                  </p>
                  <h2>{mission.name}</h2>
                  <p>{mission.description}</p>
                  <button
                    className="text-button"
                    onClick={() => setTab("Timeline")}
                  >
                    Explore the mission <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="countdown">
                  <strong>{remaining}</strong>
                  <span>DAYS TO THE SUMMIT</span>
                  <p>
                    {formatDate(mission.targetDate)},{" "}
                    {mission.targetDate.slice(0, 4)}
                  </p>
                </div>
              </section>
              <div className="overview-grid">
                <section className="card habits">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">DAILY COMMITMENTS</p>
                      <h2>Small actions. Real progress.</h2>
                    </div>
                    <span className="completion">
                      {completed}
                      <small> / {todaysHabits.length}</small>
                    </span>
                  </div>
                  <input
                    className="log-date"
                    aria-label="Habit log date"
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                  <div className="habit-list">
                    {todaysHabits.map((h) => (
                      <button
                        key={h.id}
                        className={`habit ${isComplete(store.habitEntries, h.id, logDate) ? "checked" : ""}`}
                        aria-pressed={isComplete(
                          store.habitEntries,
                          h.id,
                          logDate,
                        )}
                        onClick={() => {
                          const existing = store.habitEntries.find(
                            (x) => x.habitId === h.id && x.date === logDate,
                          );
                          commit({
                            ...store,
                            habitEntries: [
                              ...store.habitEntries.filter(
                                (x) => x.id !== existing?.id,
                              ),
                              {
                                id: existing?.id ?? id(),
                                habitId: h.id,
                                date: logDate,
                                completed: !existing?.completed,
                              },
                            ],
                          });
                        }}
                      >
                        <span className="checkbox">
                          {isComplete(store.habitEntries, h.id, logDate) && (
                            <Check size={16} />
                          )}
                        </span>
                        <span>{h.title}</span>
                      </button>
                    ))}
                    {!todaysHabits.length && (
                      <p className="muted">
                        No commitments scheduled. Add habits in mission
                        settings.
                      </p>
                    )}
                  </div>
                  <p className="fine">
                    Consistency leaves room for life. Fuel, rest, and recovery
                    come first.
                  </p>
                </section>
                <section className="card">{chart}</section>
                <section className="card workout">
                  <p className="eyebrow">TODAY'S MOVEMENT</p>
                  <div className="section-heading">
                    <h2>
                      {todaySession?.activityType ?? "Make room for recovery"}
                    </h2>
                    <Activity size={24} />
                  </div>
                  <p className="muted">
                    {todaySession?.completed
                      ? "Session completed. Give yourself time to recover."
                      : todaySession?.skipped
                        ? "Adjusted for today. Continue when ready."
                        : "Train with intention. Adjust to how you feel today."}
                  </p>
                  <button
                    onClick={() =>
                      todaySession
                        ? editSession(todaySession)
                        : setTab("Training")
                    }
                  >
                    {" "}
                    {todaySession ? "Log / edit session" : "View training"}{" "}
                    <ArrowUpRight size={16} />
                  </button>
                </section>
                <section className="card">
                  <p className="eyebrow">NEXT CHECKPOINT</p>
                  <h2>{nextMilestone?.title ?? "Your next chapter"}</h2>
                  <p className="muted">
                    {nextMilestone
                      ? formatDate(nextMilestone.targetDate)
                      : "Create a milestone in your timeline."}
                  </p>
                  <p className="fine">{nextMilestone?.description}</p>
                  {longSession && (
                    <div className="upcoming">
                      <span>UPCOMING LONG OUTING</span>
                      <strong>
                        {longSession.plannedDistance} mi{" "}
                        <small>· {formatDate(longSession.date)}</small>
                      </strong>
                    </div>
                  )}
                </section>
              </div>
              <section className="card">{timeline}</section>
            </>
          )}
          {tab === "Measurements" && (
            <>
              <section className="card">{chart}</section>
              <section className="card">
                <div className="section-heading">
                  <h2>Observation journal</h2>
                  <button
                    onClick={() => editMeasurement()}
                    disabled={!weightDef}
                  >
                    <Plus size={16} /> Add observation
                  </button>
                </div>
                {measurements.length ? (
                  measurements
                    .slice()
                    .reverse()
                    .map((m) => (
                      <div className="record" key={m.id}>
                        <div>
                          <strong>
                            {m.value}{" "}
                            {
                              mission.measurementDefinitions.find(
                                (d) => d.id === m.measurementDefinitionId,
                              )?.unit
                            }
                          </strong>
                          <p className="muted">
                            {formatDate(m.date)} ·{" "}
                            {
                              mission.measurementDefinitions.find(
                                (d) => d.id === m.measurementDefinitionId,
                              )?.title
                            }{" "}
                            {m.note && `· ${m.note}`}
                          </p>
                        </div>
                        <div className="actions">
                          <button onClick={() => editMeasurement(m)}>
                            Edit
                          </button>
                          <button
                            aria-label="Delete observation"
                            onClick={() => {
                              if (confirm("Delete this observation?"))
                                commit({
                                  ...store,
                                  measurements: store.measurements.filter(
                                    (x) => x.id !== m.id,
                                  ),
                                });
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="muted">
                    No recorded observations. Starting goals are references, not
                    measurements.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "Training" && (
            <Training
              mission={mission}
              sessions={sessions}
              week={week}
              setWeek={setWeek}
              editSession={editSession}
            />
          )}
          {tab === "Timeline" && (
            <>
              <section className="card">
                {timeline}
                <div className="block-grid">
                  {Array.from({ length: Math.ceil(total / 7) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setWeek(i);
                        setTab("Training");
                      }}
                    >
                      <span className="eyebrow">WEEK {i + 1}</span>
                      <strong>
                        {formatDate(addDays(mission.startDate, i * 7))} —{" "}
                        {formatDate(
                          addDays(
                            mission.startDate,
                            Math.min(total - 1, i * 7 + 6),
                          ),
                        )}
                      </strong>
                      <span>
                        {
                          sessions.filter(
                            (s) =>
                              daysBetween(mission.startDate, s.date) >= i * 7 &&
                              daysBetween(mission.startDate, s.date) <
                                i * 7 + 7 &&
                              s.completed,
                          ).length
                        }{" "}
                        sessions complete <ArrowUpRight size={12} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="card">
                <div className="section-heading">
                  <h2>Expedition checkpoints</h2>
                  <button
                    onClick={() =>
                      setModal(
                        <Modal title="Add milestone" close={close}>
                          <form
                            onSubmit={(e) => {
                              const f = form(e);
                              if (
                                updateMission({
                                  ...mission,
                                  milestones: [
                                    ...mission.milestones,
                                    {
                                      id: id(),
                                      missionId: mission.id,
                                      title: value(f, "title"),
                                      targetDate: value(f, "date"),
                                      description: value(f, "description"),
                                      completionCriteria: value(
                                        f,
                                        "description",
                                      ),
                                      status: "planned",
                                    },
                                  ],
                                })
                              )
                                close();
                            }}
                          >
                            <Field label="Title">
                              <input required name="title" />
                            </Field>
                            <Field label="Target date">
                              <input
                                required
                                type="date"
                                name="date"
                                defaultValue={mission.targetDate}
                              />
                            </Field>
                            <Field label="Completion criteria">
                              <textarea required name="description" />
                            </Field>
                            <button className="primary">Save milestone</button>
                          </form>
                        </Modal>,
                      )
                    }
                  >
                    <Plus size={16} /> Add checkpoint
                  </button>
                </div>
                {mission.milestones
                  .slice()
                  .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
                  .map((m) => (
                    <div className="milestone" key={m.id}>
                      <button
                        className={`checkbox ${m.status === "completed" ? "checked" : ""}`}
                        aria-label={`Mark ${m.title} ${m.status === "completed" ? "incomplete" : "completed"}`}
                        aria-pressed={m.status === "completed"}
                        onClick={() =>
                          updateMission({
                            ...mission,
                            milestones: mission.milestones.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    status:
                                      x.status === "completed"
                                        ? "planned"
                                        : "completed",
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        {m.status === "completed" ? (
                          <Check size={16} />
                        ) : (
                          <Flag size={14} />
                        )}
                      </button>
                      <div>
                        <p className="eyebrow">
                          {formatDate(m.targetDate)} · {m.status}
                        </p>
                        <h3>{m.title}</h3>
                        <p className="muted">{m.description}</p>
                      </div>
                    </div>
                  ))}
              </section>
            </>
          )}
          {tab === "Mission settings" && (
            <>
              <section className="card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">MISSION DEFINITION</p>
                    <h2>{mission.name}</h2>
                  </div>
                  <button onClick={() => missionForm(mission)}>
                    Edit mission
                  </button>
                </div>
                <p className="muted">{mission.description}</p>
                <div className="actions">
                  <button onClick={() => missionForm()}>
                    <Plus size={16} /> Create mission
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `${mission.status === "archived" ? "Restore" : "Archive"} this mission? Its logs will be kept.`,
                        )
                      )
                        updateMission({
                          ...mission,
                          status:
                            mission.status === "archived"
                              ? "planned"
                              : "archived",
                        });
                    }}
                  >
                    {mission.status === "archived" ? "Restore" : "Archive"}{" "}
                    mission
                  </button>
                </div>
              </section>
              <section className="card">
                <div className="section-heading">
                  <h2>Daily commitments</h2>
                  <button
                    onClick={() =>
                      setModal(
                        <Modal title="Add habit" close={close}>
                          <HabitForm
                            mission={mission}
                            save={(m) => {
                              if (updateMission(m)) close();
                            }}
                          />
                        </Modal>,
                      )
                    }
                  >
                    <Plus size={16} /> Add habit
                  </button>
                </div>
                {mission.habits
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((h, i, list) => (
                    <div className="record" key={h.id}>
                      <div>
                        <strong>{h.title}</strong>
                        <p className="fine">
                          {h.active ? h.frequency : "Archived"} ·{" "}
                          {h.description}
                        </p>
                      </div>
                      <div className="actions">
                        <button
                          aria-label={`Move ${h.title} up`}
                          disabled={i === 0}
                          onClick={() => {
                            const copy = list.map((x, j) => ({
                              ...x,
                              sortOrder: j,
                            }));
                            [copy[i].sortOrder, copy[i - 1].sortOrder] = [
                              i - 1,
                              i,
                            ];
                            updateMission({ ...mission, habits: copy });
                          }}
                        >
                          ↑
                        </button>
                        <button
                          aria-label={`Move ${h.title} down`}
                          disabled={i === list.length - 1}
                          onClick={() => {
                            const copy = list.map((x, j) => ({
                              ...x,
                              sortOrder: j,
                            }));
                            [copy[i].sortOrder, copy[i + 1].sortOrder] = [
                              i + 1,
                              i,
                            ];
                            updateMission({ ...mission, habits: copy });
                          }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() =>
                            setModal(
                              <Modal title="Edit habit" close={close}>
                                <HabitForm
                                  mission={mission}
                                  habitId={h.id}
                                  save={(m) => {
                                    if (updateMission(m)) close();
                                  }}
                                />
                              </Modal>,
                            )
                          }
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            updateMission({
                              ...mission,
                              habits: mission.habits.map((x) =>
                                x.id === h.id ? { ...x, active: !x.active } : x,
                              ),
                            })
                          }
                        >
                          {h.active ? "Archive" : "Restore"}
                        </button>
                        <button
                          aria-label={`Delete ${h.title}`}
                          onClick={() => {
                            if (
                              confirm(
                                "Remove this habit and its recorded checkoffs?",
                              )
                            )
                              commit({
                                ...store,
                                missions: store.missions.map((m) =>
                                  m.id === mission.id
                                    ? {
                                        ...mission,
                                        habits: mission.habits.filter(
                                          (x) => x.id !== h.id,
                                        ),
                                      }
                                    : m,
                                ),
                                habitEntries: store.habitEntries.filter(
                                  (e) => e.habitId !== h.id,
                                ),
                              });
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
              </section>
              <section className="card">
                <div className="section-heading">
                  <h2>Measurement definitions</h2>
                  <button
                    onClick={() =>
                      setModal(
                        <Modal title="Add measurement definition" close={close}>
                          <form
                            onSubmit={(e) => {
                              const f = form(e);
                              if (
                                updateMission({
                                  ...mission,
                                  measurementDefinitions: [
                                    ...mission.measurementDefinitions,
                                    {
                                      id: id(),
                                      title: value(f, "title"),
                                      unit: value(f, "unit"),
                                    },
                                  ],
                                })
                              )
                                close();
                            }}
                          >
                            <Field label="Name">
                              <input required name="title" />
                            </Field>
                            <Field label="Unit">
                              <input required name="unit" />
                            </Field>
                            <button className="primary">Save definition</button>
                          </form>
                        </Modal>,
                      )
                    }
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
                {mission.measurementDefinitions.map((d) => (
                  <div className="record" key={d.id}>
                    <strong>
                      {d.title} <span className="muted">({d.unit})</span>
                    </strong>
                    <button
                      onClick={() =>
                        setModal(
                          <Modal
                            title="Edit measurement definition"
                            close={close}
                          >
                            <form
                              onSubmit={(e) => {
                                const f = form(e);
                                if (
                                  updateMission({
                                    ...mission,
                                    measurementDefinitions:
                                      mission.measurementDefinitions.map((x) =>
                                        x.id === d.id
                                          ? {
                                              ...x,
                                              title: value(f, "title"),
                                              unit: value(f, "unit"),
                                            }
                                          : x,
                                      ),
                                  })
                                )
                                  close();
                              }}
                            >
                              <Field label="Name">
                                <input
                                  required
                                  name="title"
                                  defaultValue={d.title}
                                />
                              </Field>
                              <Field label="Unit">
                                <input
                                  required
                                  name="unit"
                                  defaultValue={d.unit}
                                />
                              </Field>
                              <button className="primary">
                                Save definition
                              </button>
                            </form>
                          </Modal>,
                        )
                      }
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </section>
              <section className="card">
                <div className="section-heading">
                  <h2>Outcome goals</h2>
                  <button
                    disabled={!mission.measurementDefinitions.length}
                    onClick={() =>
                      setModal(
                        <Modal title="Add outcome goal" close={close}>
                          <GoalForm
                            mission={mission}
                            save={(m) => {
                              if (updateMission(m)) close();
                            }}
                          />
                        </Modal>,
                      )
                    }
                  >
                    <Plus size={16} /> Add goal
                  </button>
                </div>
                <p className="fine">
                  The primary objective is your mission description. Optional
                  goals are aspirations, never prerequisites.
                </p>
                {mission.outcomeGoals.map((g) => (
                  <div className="record" key={g.id}>
                    <div>
                      <strong>{g.title}</strong>
                      <p className="muted">
                        {g.startingValue} → {g.targetValue} {g.unit} ·{" "}
                        {g.direction} ·{" "}
                        {g.optional
                          ? "Optional aspiration"
                          : "Supporting outcome"}
                      </p>
                    </div>
                    <div className="actions">
                      <button
                        onClick={() =>
                          setModal(
                            <Modal title="Edit outcome goal" close={close}>
                              <GoalForm
                                mission={mission}
                                goalId={g.id}
                                save={(m) => {
                                  if (updateMission(m)) close();
                                }}
                              />
                            </Modal>,
                          )
                        }
                      >
                        Edit
                      </button>
                      <button
                        aria-label="Delete goal"
                        onClick={() => {
                          if (
                            confirm(
                              "Delete this goal? Measurements will be kept.",
                            )
                          )
                            updateMission({
                              ...mission,
                              outcomeGoals: mission.outcomeGoals.filter(
                                (x) => x.id !== g.id,
                              ),
                            });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
              <section className="card">
                <h2>Your data, your journal.</h2>
                <p className="muted">
                  Stored in this browser only. Export regularly, especially
                  before clearing browser data or switching devices.
                </p>
                <div className="actions">{backups}</div>
              </section>
            </>
          )}
          <footer className="content-footer">
            <span>
              <Mountain size={16} /> SUMMIT
            </span>
            <span>PROGRESS, WITH PERSPECTIVE.</span>
            <span>LOCAL JOURNAL · NO ACCOUNT REQUIRED</span>
          </footer>
        </main>
      </div>
      {isValidElement(modal)
        ? cloneElement(modal as ReactElement<{ error: string }>, { error })
        : modal}
    </div>
  );
}
