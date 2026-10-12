import { Field, form, value } from "../../components/forms";
import { id, type Mission } from "../../domain/model";
export function HabitForm({
  mission,
  habitId,
  save,
}: {
  mission: Mission;
  habitId?: string;
  save: (m: Mission) => void;
}) {
  const h = mission.habits.find((x) => x.id === habitId);
  return (
    <form
      onSubmit={(e) => {
        const f = form(e),
          frequency = value(f, "frequency") as "daily" | "weekdays" | "weekly",
          weekdays = f.getAll("days").map(Number);
        if (frequency !== "daily" && !weekdays.length) {
          alert("Choose at least one scheduled day.");
          return;
        }
        if (frequency === "weekly" && weekdays.length !== 1) {
          alert("Choose one check-in day for a weekly habit.");
          return;
        }
        const item = {
          id: h?.id ?? id(),
          missionId: mission.id,
          title: value(f, "title"),
          description: value(f, "description"),
          frequency,
          weekdays,
          category: value(f, "category"),
          active: h?.active ?? true,
          sortOrder: h?.sortOrder ?? mission.habits.length,
        };
        save({
          ...mission,
          habits: [...mission.habits.filter((x) => x.id !== item.id), item],
        });
      }}
    >
      <Field label="Commitment">
        <input required name="title" defaultValue={h?.title} />
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={h?.description} />
      </Field>
      <Field label="Category">
        <input name="category" defaultValue={h?.category ?? "Wellbeing"} />
      </Field>
      <Field label="Frequency">
        <select name="frequency" defaultValue={h?.frequency ?? "daily"}>
          <option value="daily">Daily</option>
          <option value="weekdays">Selected weekdays</option>
          <option value="weekly">Weekly (one check-in day)</option>
        </select>
      </Field>
      <fieldset>
        <legend>Scheduled days (for weekly / selected days)</legend>
        <div className="day-options">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <label key={d}>
              <input
                type="checkbox"
                name="days"
                value={i}
                defaultChecked={h?.weekdays.includes(i)}
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="primary">Save commitment</button>
    </form>
  );
}
export function GoalForm({
  mission,
  goalId,
  save,
}: {
  mission: Mission;
  goalId?: string;
  save: (m: Mission) => void;
}) {
  const g = mission.outcomeGoals.find((x) => x.id === goalId);
  return (
    <form
      onSubmit={(e) => {
        const f = form(e),
          definition = mission.measurementDefinitions.find(
            (x) => x.id === value(f, "measurement"),
          )!;
        const item = {
          id: g?.id ?? id(),
          missionId: mission.id,
          title: value(f, "title"),
          measurementType: definition.id,
          startingValue: Number(value(f, "start")),
          targetValue: Number(value(f, "target")),
          unit: definition.unit,
          direction: value(f, "direction") as
            "increase" | "decrease" | "maintain",
          targetDate: value(f, "date"),
          optional: f.has("optional"),
        };
        save({
          ...mission,
          outcomeGoals: [
            ...mission.outcomeGoals.filter((x) => x.id !== item.id),
            item,
          ],
        });
      }}
    >
      <Field label="Goal title">
        <input required name="title" defaultValue={g?.title} />
      </Field>
      <Field label="Measurement">
        <select name="measurement" defaultValue={g?.measurementType}>
          {mission.measurementDefinitions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="Starting reference">
          <input
            required
            type="number"
            step="any"
            name="start"
            defaultValue={g?.startingValue}
          />
        </Field>
        <Field label="Target">
          <input
            required
            type="number"
            step="any"
            name="target"
            defaultValue={g?.targetValue}
          />
        </Field>
      </div>
      <Field label="Direction">
        <select name="direction" defaultValue={g?.direction ?? "increase"}>
          {["increase", "decrease", "maintain"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Field label="Target date">
        <input
          required
          type="date"
          name="date"
          defaultValue={g?.targetDate ?? mission.targetDate}
        />
      </Field>
      <label className="check-label">
        <input
          type="checkbox"
          name="optional"
          defaultChecked={g?.optional ?? true}
        />{" "}
        Optional aspiration
      </label>
      <button className="primary">Save goal</button>
    </form>
  );
}
