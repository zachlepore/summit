import type { Mission } from "../../domain/model";
import { today, daysBetween, formatDate } from "../../domain/logic";
export function Timeline({ mission }: { mission: Mission }) {
  const current = today(),
    day = daysBetween(mission.startDate, current) + 1,
    total = daysBetween(mission.startDate, mission.targetDate) + 1,
    progress = Math.max(
      0,
      Math.min(100, ((day - 1) / Math.max(1, total - 1)) * 100),
    );
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE ROAD AHEAD</p>
          <h2>Mission timeline</h2>
        </div>
        <span className="muted">
          {formatDate(mission.startDate)} — {formatDate(mission.targetDate)}
        </span>
      </div>
      <div className="timeline-track">
        <div className="timeline-fill" style={{ width: `${progress}%` }} />
        <span
          className="timeline-now"
          style={{ left: `${progress}%` }}
          title={`Today: ${current}`}
        />
        {Array.from({ length: Math.ceil(total / 7) }, (_, i) => (
          <span
            key={i}
            className="week-tick"
            style={{ left: `${((i * 7) / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="timeline-labels">
        <span>BASE CAMP</span>
        <span>
          {current < mission.startDate
            ? "PREPARATION"
            : current > mission.targetDate
              ? "TARGET DATE PASSED"
              : `DAY ${day} / ${total}`}
        </span>
        <span>THE SUMMIT</span>
      </div>
    </>
  );
}
