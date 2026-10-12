import type { Habit, HabitEntry, Measurement, TrainingSession } from "./model";
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const dateNumber = (date: string) => Date.parse(`${date}T12:00:00Z`);
export const daysBetween = (a: string, b: string) =>
  Math.round((dateNumber(b) - dateNumber(a)) / 86400000);
export const countdown = (target: string, date = today()) =>
  Math.max(0, daysBetween(date, target));
export const addDays = (date: string, n: number) =>
  new Date(dateNumber(date) + n * 86400000).toISOString().slice(0, 10);
export const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export const due = (habit: Habit, date: string) =>
  habit.active &&
  (habit.frequency === "daily" ||
    habit.weekdays.includes(new Date(`${date}T12:00:00`).getDay()));
export const isComplete = (
  entries: HabitEntry[],
  habitId: string,
  date: string,
) =>
  entries.some((e) => e.habitId === habitId && e.date === date && e.completed);
export const orderedMeasurements = (values: Measurement[]) =>
  [...values].sort((a, b) => a.date.localeCompare(b.date));
export function trend(values: Measurement[]) {
  const ordered = orderedMeasurements(values);
  return ordered.map((m) => {
    const window = ordered.filter(
      (x) =>
        daysBetween(x.date, m.date) >= 0 && daysBetween(x.date, m.date) < 7,
    );
    return {
      ...m,
      trend:
        window.length >= 3
          ? Math.round(
              (window.reduce((sum, x) => sum + x.value, 0) / window.length) *
                10,
            ) / 10
          : null,
    };
  });
}
export function schedule(
  missionId: string,
  start: string,
  target: string,
): TrainingSession[] {
  const names = [
    "Recovery",
    "Push",
    "Easy run / walk",
    "Pull",
    "Easy run / hills",
    "Legs",
    "Long trail outing",
  ];
  const distances = [4, 5, 6, 4, 7, 8, 6, 9, 10, 7, 11, 6];
  const result: TrainingSession[] = [];
  for (let i = 0; i <= daysBetween(start, target); i++) {
    const date = addDays(start, i),
      day = new Date(`${date}T12:00:00`).getDay(),
      week = Math.floor(i / 7);
    result.push({
      id: `${missionId}-session-${date}`,
      missionId,
      date,
      activityType:
        week >= 12 && (day === 6 || day === 0) ? "Mission weekend" : names[day],
      plannedDistance: day === 6 && week < 12 ? distances[week] : null,
      actualDistance: null,
      duration: null,
      elevationGain: null,
      completed: false,
      skipped: false,
      notes: "",
    });
  }
  return result;
}
