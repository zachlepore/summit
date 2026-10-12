import type { Store } from "../domain/model";
import { seed } from "./seed";
const KEY = "summit.store";
type Obj = Record<string, unknown>;
const object = (x: unknown): x is Obj =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const str = (x: unknown) => typeof x === "string";
const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const bool = (x: unknown) => typeof x === "boolean";
const date = (x: unknown) =>
  str(x) &&
  /^\d{4}-\d{2}-\d{2}$/.test(x as string) &&
  !isNaN(Date.parse(x as string)) &&
  new Date(x as string).toISOString().slice(0, 10) === x;
const nullable = (x: unknown) => x === null || num(x);
function fields(
  x: unknown,
  rules: Record<string, (v: unknown) => boolean>,
): x is Obj {
  return object(x) && Object.entries(rules).every(([k, fn]) => fn(x[k]));
}
const array = (fn: (v: unknown) => boolean) => (x: unknown) =>
  Array.isArray(x) && x.every(fn);
const one =
  (...values: string[]) =>
  (x: unknown) =>
    str(x) && values.includes(x as string);
const common = { id: str, missionId: str };
const goal = (x: unknown) =>
  fields(x, {
    ...common,
    title: str,
    measurementType: str,
    startingValue: num,
    targetValue: num,
    unit: str,
    direction: one("increase", "decrease", "maintain"),
    targetDate: date,
    optional: bool,
  });
const habit = (x: unknown) =>
  fields(x, {
    ...common,
    title: str,
    description: str,
    frequency: one("daily", "weekdays", "weekly"),
    weekdays: array(
      (v) =>
        num(v) &&
        (v as number) >= 0 &&
        (v as number) <= 6 &&
        Number.isInteger(v),
    ),
    category: str,
    active: bool,
    sortOrder: num,
  });
const milestone = (x: unknown) =>
  fields(x, {
    ...common,
    title: str,
    targetDate: date,
    description: str,
    completionCriteria: str,
    status: one("planned", "completed"),
  });
const definition = (x: unknown) =>
  fields(x, { id: str, title: str, unit: str });
const mission = (x: unknown) =>
  fields(x, {
    id: str,
    name: str,
    tagline: str,
    description: str,
    startDate: date,
    targetDate: date,
    status: one("planned", "active", "completed", "archived"),
    theme: str,
    coverImage: str,
    outcomeGoals: array(goal),
    habits: array(habit),
    milestones: array(milestone),
    measurementDefinitions: array(definition),
  }) && String((x as Obj).startDate) <= String((x as Obj).targetDate);
export function validate(input: unknown): Store {
  if (
    !fields(input, {
      version: (v) => v === 1,
      activeMissionId: str,
      missions: array(mission),
      habitEntries: array(
        (x) =>
          fields(x, { id: str, habitId: str, date, completed: bool }) &&
          (!object(x) || x.note === undefined || str(x.note)),
      ),
      measurements: array(
        (x) =>
          fields(x, {
            ...common,
            measurementDefinitionId: str,
            date,
            value: num,
          }) &&
          (!object(x) || x.note === undefined || str(x.note)),
      ),
      sessions: array((x) =>
        fields(x, {
          ...common,
          date,
          activityType: str,
          plannedDistance: nullable,
          actualDistance: nullable,
          duration: nullable,
          elevationGain: nullable,
          completed: bool,
          skipped: bool,
          notes: str,
        }),
      ),
    })
  )
    throw new Error(
      "Invalid backup: expected a complete SUMMIT schema version 1 file.",
    );
  const s = input as unknown as Store;
  const unique = (ids: string[]) =>
    ids.every(Boolean) && new Set(ids).size === ids.length;
  const allIds = [
    ...s.missions.map((m) => m.id),
    ...s.missions.flatMap((m) =>
      [
        ...m.habits,
        ...m.outcomeGoals,
        ...m.milestones,
        ...m.measurementDefinitions,
      ].map((x) => x.id),
    ),
    ...s.habitEntries.map((x) => x.id),
    ...s.measurements.map((x) => x.id),
    ...s.sessions.map((x) => x.id),
  ];
  if (
    !unique(allIds) ||
    !s.missions.some((m) => m.id === s.activeMissionId) ||
    s.missions.some(
      (m) =>
        [...m.habits, ...m.outcomeGoals, ...m.milestones].some(
          (x) => x.missionId !== m.id,
        ) ||
        m.outcomeGoals.some(
          (g) =>
            !m.measurementDefinitions.some((d) => d.id === g.measurementType),
        ),
    ) ||
    s.habitEntries.some(
      (e) => !s.missions.some((m) => m.habits.some((h) => h.id === e.habitId)),
    ) ||
    s.measurements.some(
      (e) =>
        !s.missions.some(
          (m) =>
            m.id === e.missionId &&
            m.measurementDefinitions.some(
              (d) => d.id === e.measurementDefinitionId,
            ),
        ),
    ) ||
    s.sessions.some((e) => !s.missions.some((m) => m.id === e.missionId))
  )
    throw new Error(
      "Invalid backup: duplicate IDs or broken mission references.",
    );
  if (
    !unique(s.habitEntries.map((x) => `${x.habitId}:${x.date}`)) ||
    !unique(
      s.measurements.map(
        (x) => `${x.missionId}:${x.measurementDefinitionId}:${x.date}`,
      ),
    )
  )
    throw new Error("Invalid backup: duplicate daily entries.");
  return s;
}
// Version 1 is the initial schema. Add explicit version-to-version transforms here;
// never reinterpret newer versions or overwrite unreadable data.
export function migrate(input: unknown): Store {
  if (!object(input) || input.version !== 1)
    throw new Error(
      "Unsupported storage version. Export the original data before upgrading.",
    );
  return validate(input);
}
export interface Repository {
  load(): Store;
  save(store: Store): void;
  export(): string;
  import(json: string): Store;
  reset(): Store;
}
export class LocalRepository implements Repository {
  constructor(private storage: Storage) {}
  load() {
    const raw = this.storage.getItem(KEY);
    if (raw === null) {
      const s = seed();
      this.save(s);
      return s;
    }
    return migrate(JSON.parse(raw));
  }
  save(store: Store) {
    validate(store);
    this.storage.setItem(KEY, JSON.stringify(store));
  }
  export() {
    return this.storage.getItem(KEY) ?? JSON.stringify(this.load());
  }
  import(json: string) {
    const s = migrate(JSON.parse(json));
    const previous = this.storage.getItem(KEY);
    if (previous !== null) this.storage.setItem(`${KEY}.backup`, previous);
    this.save(s);
    return s;
  }
  reset() {
    const previous = this.storage.getItem(KEY);
    if (previous !== null) this.storage.setItem(`${KEY}.backup`, previous);
    const s = seed();
    this.save(s);
    return s;
  }
}

// Resolve browser storage only when an operation runs, so access errors reach the recovery UI.
export const repository: Repository = {
  load: () => new LocalRepository(window.localStorage).load(),
  save: (s) => new LocalRepository(window.localStorage).save(s),
  export: () => new LocalRepository(window.localStorage).export(),
  import: (json) => new LocalRepository(window.localStorage).import(json),
  reset: () => new LocalRepository(window.localStorage).reset(),
};
