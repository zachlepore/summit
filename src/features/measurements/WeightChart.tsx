import { useState } from "react";
import { Activity, Plus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Mission, Measurement } from "../../domain/model";
import {
  today,
  dateNumber,
  daysBetween,
  formatDate,
  trend,
} from "../../domain/logic";
export function WeightChart({
  mission,
  measurements,
  record,
}: {
  mission: Mission;
  measurements: Measurement[];
  record: () => void;
}) {
  const [range, setRange] = useState(90),
    current = today();
  const weightDef =
    mission.measurementDefinitions.find((d) =>
      d.title.toLowerCase().includes("weight"),
    ) ?? mission.measurementDefinitions[0];
  const weight = measurements.filter(
      (m) => m.measurementDefinitionId === weightDef?.id,
    ),
    goal = mission.outcomeGoals.find(
      (g) => g.measurementType === weightDef?.id,
    ),
    latest = weight.at(-1);
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">BODY & RECOVERY</p>
          <h2>{weightDef?.title ?? "Observations"}</h2>
        </div>
        <div className="range">
          {[30, 90, 0].map((r) => (
            <button
              key={r}
              className={range === r ? "selected" : ""}
              onClick={() => setRange(r)}
            >
              {r ? `${r}D` : "ALL"}
            </button>
          ))}
        </div>
      </div>
      <div className="weight-stat">
        {latest ? (
          <>
            <strong>{latest.value}</strong>
            <span>
              {weightDef?.unit} · {formatDate(latest.date)}
            </span>
          </>
        ) : (
          <>
            <strong>—</strong>
            <span>No observations yet</span>
          </>
        )}
        <button className="text-button" onClick={record} disabled={!weightDef}>
          <Plus size={15} /> Record
        </button>
      </div>
      {weight.length ? (
        <div className="chart">
          <ResponsiveContainer width="100%" height={205}>
            <LineChart
              data={trend(
                weight.filter(
                  (m) =>
                    !range ||
                    (daysBetween(m.date, current) >= 0 &&
                      daysBetween(m.date, current) < range),
                ),
              ).map((m) => ({ ...m, timestamp: dateNumber(m.date) }))}
              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) =>
                  formatDate(new Date(Number(v)).toISOString().slice(0, 10))
                }
                stroke="#60727c"
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="#60727c"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#19262e",
                  border: "1px solid #3b4b54",
                  borderRadius: 8,
                }}
                labelFormatter={(v) =>
                  formatDate(new Date(Number(v)).toISOString().slice(0, 10))
                }
              />
              {goal && (
                <ReferenceLine
                  ifOverflow="extendDomain"
                  y={goal.startingValue}
                  stroke="#60727c"
                  strokeDasharray="3 6"
                  label={{
                    value: "Starting reference",
                    fill: "#9eacb5",
                    position: "insideTopRight",
                  }}
                />
              )}
              {goal?.optional && (
                <ReferenceLine
                  ifOverflow="extendDomain"
                  y={goal.targetValue}
                  stroke="#60727c"
                  strokeDasharray="3 6"
                  label={{
                    value: "Aspirational",
                    fill: "#9eacb5",
                    position: "insideBottomRight",
                  }}
                />
              )}
              <Line
                name="Recorded"
                type="linear"
                dataKey="value"
                stroke={mission.theme}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                name="7-day observed average"
                type="linear"
                dataKey="trend"
                stroke="#d4d4ae"
                dot={false}
                strokeDasharray="4 4"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-chart">
          <Activity size={28} />
          <p>Your story starts with your first entry.</p>
          <span>Only measurements you record will appear here.</span>
        </div>
      )}
      <p className="fine">
        {goal?.optional
          ? `${goal.startingValue} → ${goal.targetValue} ${goal.unit} is aspirational, not a requirement for mission success.`
          : "Observations help you reflect; they do not define mission success."}{" "}
        Trend uses at least 3 observations in a 7-day window.
      </p>
    </>
  );
}
