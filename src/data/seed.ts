import { id, type Mission, type Store } from "../domain/model";
import { schedule, today, addDays } from "../domain/logic";
export const mountain = `${import.meta.env.BASE_URL}images/alpine.jpg`;
export function newMission(
  name: string,
  start = today(),
  target = addDays(start, 90),
): Mission {
  const missionId = id();
  return {
    id: missionId,
    name,
    tagline: "A meaningful objective. One day at a time.",
    description:
      "Define your mission and build the capacity to see it through.",
    startDate: start,
    targetDate: target,
    status: "active",
    theme: "#97b7c6",
    coverImage: mountain,
    outcomeGoals: [],
    habits: [],
    milestones: [],
    measurementDefinitions: [{ id: id(), title: "Body weight", unit: "lb" }],
  };
}
export function seed(): Store {
  const m = newMission("Operation Winter Summit", "2026-10-12", "2027-01-10");
  m.tagline = "HOW BAD DO YOU WANT TO CLIMB THIS MOUNTAIN?";
  m.description =
    "Mount Washington, New Hampshire · Build the physical capacity for a winter mountain ascent. Target window: January 9–10, 2027.";
  m.habits = [
    "Alcohol-free day",
    "Eat balanced, satisfying meals",
    "Finish eating around 7 PM when practical",
    "Complete planned movement or recovery",
    "Prioritize sleep and recovery",
  ].map((title, i) => ({
    id: id(),
    missionId: m.id,
    title,
    description:
      i === 2
        ? "Training fuel and recovery come first. Eating later is always okay when needed."
        : "A commitment, not a test of perfection.",
    frequency: "daily",
    weekdays: [],
    category: i > 2 ? "Recovery" : "Wellbeing",
    active: true,
    sortOrder: i,
  }));
  m.outcomeGoals = [
    {
      id: id(),
      missionId: m.id,
      title: "Aspirational body weight",
      measurementType: m.measurementDefinitions[0].id,
      startingValue: 225,
      targetValue: 200,
      unit: "lb",
      direction: "decrease",
      targetDate: m.targetDate,
      optional: true,
    },
  ];
  m.milestones = [
    [
      "Build the foundation",
      "2026-11-08",
      "Complete the first four weeks; reflect on recovery and consistency.",
    ],
    [
      "Find your mountain legs",
      "2026-12-06",
      "Review comfort, gear, and endurance on a longer trail outing.",
    ],
    [
      "Ready for the ascent",
      "2027-01-03",
      "Review fitness, winter skills, equipment, weather, and a safe go/no-go plan.",
    ],
    [
      "Mission weekend",
      "2027-01-10",
      "January 9–10: attempt the ascent only with suitable conditions and preparation.",
    ],
  ].map(([title, targetDate, description]) => ({
    id: id(),
    missionId: m.id,
    title,
    targetDate,
    description,
    completionCriteria: description,
    status: "planned",
  }));
  return {
    version: 1,
    activeMissionId: m.id,
    missions: [m],
    habitEntries: [],
    measurements: [],
    sessions: schedule(m.id, m.startDate, m.targetDate),
  };
}
