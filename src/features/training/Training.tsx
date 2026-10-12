import { Check, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { id, type Mission, type TrainingSession } from "../../domain/model";
import {
  today,
  daysBetween,
  addDays,
  formatDate,
  schedule,
} from "../../domain/logic";
export function Training({
  mission,
  sessions,
  week,
  setWeek,
  editSession,
}: {
  mission: Mission;
  sessions: TrainingSession[];
  week: number;
  setWeek: (n: number) => void;
  editSession: (s: TrainingSession) => void;
}) {
  const current = today(),
    total = daysBetween(mission.startDate, mission.targetDate) + 1;
  return (
    <>
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TRAINING BLOCK</p>
            <h2>
              Week {week + 1} ·{" "}
              {formatDate(addDays(mission.startDate, week * 7))}
            </h2>
          </div>
          <div className="actions">
            <button
              onClick={() =>
                editSession({
                  ...schedule(mission.id, current, current)[0],
                  id: id(),
                  activityType: "Movement / recovery",
                })
              }
            >
              <Plus size={14} /> Add session
            </button>
            <button
              onClick={() =>
                setWeek(
                  Math.max(
                    0,
                    Math.min(
                      Math.ceil(total / 7) - 1,
                      Math.floor(daysBetween(mission.startDate, current) / 7),
                    ),
                  ),
                )
              }
            >
              This week
            </button>
            <button
              aria-label="Previous week"
              disabled={week === 0}
              onClick={() => setWeek(week - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next week"
              disabled={(week + 1) * 7 >= total}
              onClick={() => setWeek(week + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <p className="fine">
          Distances are suggestions. Editing or skipping a session leaves the
          rest of your plan intact.
        </p>
        <div className="training-week">
          {sessions
            .filter(
              (s) =>
                daysBetween(mission.startDate, s.date) >= week * 7 &&
                daysBetween(mission.startDate, s.date) < (week + 1) * 7,
            )
            .map((s) => (
              <button
                key={s.id}
                className={`session ${s.completed ? "done" : ""}`}
                onClick={() => editSession(s)}
              >
                <span className="eyebrow">
                  {new Date(`${s.date}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}{" "}
                  · {formatDate(s.date)}
                </span>
                <strong>{s.activityType}</strong>
                <span>
                  {s.plannedDistance !== null
                    ? `${s.plannedDistance} mi suggested`
                    : "Move / recover intentionally"}
                </span>
                <span className="session-status">
                  {s.completed ? (
                    <>
                      <Check size={14} /> Completed{" "}
                      {s.actualDistance !== null && `· ${s.actualDistance} mi`}
                    </>
                  ) : s.skipped ? (
                    "Skipped / adjusted"
                  ) : (
                    "Log session ↗"
                  )}
                </span>
              </button>
            ))}
        </div>
      </section>
      <section className="card">
        <div className="section-heading">
          <h2>Long outings · planned & actual</h2>
          <span className="muted">Miles</span>
        </div>
        <div className="distance-rows">
          {sessions
            .filter(
              (s) => s.plannedDistance !== null || s.actualDistance !== null,
            )
            .map((s) => (
              <button
                className="distance-row"
                key={s.id}
                onClick={() => editSession(s)}
              >
                <span>{formatDate(s.date)}</span>
                <div>
                  <div
                    className="distance-bar planned"
                    style={{
                      width: `${Math.min(100, ((s.plannedDistance ?? 0) / Math.max(12, ...sessions.map((x) => x.actualDistance ?? 0))) * 100)}%`,
                    }}
                  />
                  {s.completed && s.actualDistance !== null && (
                    <div
                      className="distance-bar actual"
                      style={{
                        width: `${Math.min(100, (s.actualDistance / Math.max(12, ...sessions.map((x) => x.actualDistance ?? 0))) * 100)}%`,
                      }}
                    />
                  )}
                </div>
                <span>
                  {s.plannedDistance ?? "—"} /{" "}
                  {s.completed ? (s.actualDistance ?? "—") : "—"}
                </span>
              </button>
            ))}
        </div>
        <p className="fine">
          Muted: suggested distance · Glacier: completed actual distance.
          Missing actuals are never counted as zero.
        </p>
        <h3 style={{ marginTop: 30 }}>Weekly mileage trend</h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={Array.from({ length: Math.ceil(total / 7) }, (_, i) => {
                const records = sessions.filter(
                  (s) =>
                    s.completed &&
                    s.actualDistance !== null &&
                    daysBetween(mission.startDate, s.date) >= i * 7 &&
                    daysBetween(mission.startDate, s.date) < i * 7 + 7,
                );
                return {
                  week: `W${i + 1}`,
                  miles: records.length
                    ? records.reduce((n, s) => n + s.actualDistance!, 0)
                    : null,
                };
              })}
            >
              <XAxis dataKey="week" stroke="#60727c" />
              <YAxis stroke="#60727c" />
              <Tooltip
                contentStyle={{
                  background: "#19262e",
                  border: "1px solid #3b4b54",
                }}
              />
              <Line
                name="Recorded miles"
                dataKey="miles"
                stroke={mission.theme}
                connectNulls={false}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="muted">
          Recorded completed mileage:{" "}
          {sessions
            .filter((s) => s.completed)
            .reduce((n, s) => n + (s.actualDistance ?? 0), 0)
            .toFixed(1)}{" "}
          mi
        </p>
      </section>
    </>
  );
}
