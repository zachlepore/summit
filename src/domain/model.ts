export type ISODate = string;
export interface OutcomeGoal {
  id: string;
  missionId: string;
  title: string;
  measurementType: string;
  startingValue: number;
  targetValue: number;
  unit: string;
  direction: "increase" | "decrease" | "maintain";
  targetDate: ISODate;
  optional: boolean;
}
export interface Habit {
  id: string;
  missionId: string;
  title: string;
  description: string;
  frequency: "daily" | "weekdays" | "weekly";
  weekdays: number[];
  category: string;
  active: boolean;
  sortOrder: number;
}
export interface HabitEntry {
  id: string;
  habitId: string;
  date: ISODate;
  completed: boolean;
  note?: string;
}
export interface MeasurementDefinition {
  id: string;
  title: string;
  unit: string;
}
export interface Measurement {
  id: string;
  missionId: string;
  measurementDefinitionId: string;
  date: ISODate;
  value: number;
  note?: string;
}
export interface TrainingSession {
  id: string;
  missionId: string;
  date: ISODate;
  activityType: string;
  plannedDistance: number | null;
  actualDistance: number | null;
  duration: number | null;
  elevationGain: number | null;
  completed: boolean;
  skipped: boolean;
  notes: string;
}
export interface Milestone {
  id: string;
  missionId: string;
  title: string;
  targetDate: ISODate;
  description: string;
  completionCriteria: string;
  status: "planned" | "completed";
}
export interface Mission {
  id: string;
  name: string;
  tagline: string;
  description: string;
  startDate: ISODate;
  targetDate: ISODate;
  status: "planned" | "active" | "completed" | "archived";
  theme: string;
  coverImage: string;
  outcomeGoals: OutcomeGoal[];
  habits: Habit[];
  milestones: Milestone[];
  measurementDefinitions: MeasurementDefinition[];
}
export interface Store {
  version: 1;
  activeMissionId: string;
  missions: Mission[];
  habitEntries: HabitEntry[];
  measurements: Measurement[];
  sessions: TrainingSession[];
}
export const id = () => crypto.randomUUID();
