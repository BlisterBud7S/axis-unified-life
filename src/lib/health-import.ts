/**
 * Parses a phone health export into daily rows AXIS can log.
 * Runs in the browser so huge Apple Health exports never get uploaded.
 * Supported: Apple Health `export.xml`, and generic CSV from Google Fit / Health Connect.
 */
export type ParsedHealthDay = {
  date: string;
  sleep_hours?: number | null;
  steps?: number | null;
  workout_type?: string | null;
  workout_duration?: number | null;
};

const DAY_LIMIT = 180;

function dayOf(raw: string) {
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function prettyActivity(raw: string) {
  const name = raw.replace("HKWorkoutActivityType", "").replace(/([a-z])([A-Z])/g, "$1 $2");
  return name || "Workout";
}

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1] ?? "";
}

export function parseAppleHealthXml(xml: string): ParsedHealthDay[] {
  const days = new Map<string, ParsedHealthDay>();
  const get = (date: string) => {
    let d = days.get(date);
    if (!d) {
      d = { date, steps: 0, sleep_hours: 0 };
      days.set(date, d);
    }
    return d;
  };

  const records = xml.match(/<Record\b[^>]*\/?>/g) ?? [];
  for (const tag of records) {
    const type = attr(tag, "type");
    const date = dayOf(attr(tag, "startDate"));
    if (!date) continue;

    if (type === "HKQuantityTypeIdentifierStepCount") {
      const value = Number(attr(tag, "value"));
      if (Number.isFinite(value)) get(date).steps = (get(date).steps ?? 0) + value;
    } else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
      const value = attr(tag, "value");
      if (value.includes("Awake") || value.includes("InBed")) continue;
      const start = new Date(attr(tag, "startDate").replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2"));
      const end = new Date(attr(tag, "endDate").replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2"));
      const hours = (end.getTime() - start.getTime()) / 3600000;
      if (Number.isFinite(hours) && hours > 0 && hours < 20) {
        get(date).sleep_hours = Number(((get(date).sleep_hours ?? 0) + hours).toFixed(2));
      }
    }
  }

  const workouts = xml.match(/<Workout\b[^>]*>/g) ?? [];
  for (const tag of workouts) {
    const date = dayOf(attr(tag, "startDate"));
    if (!date) continue;
    const duration = Math.round(Number(attr(tag, "duration")) || 0);
    const day = get(date);
    if (duration > 0 && duration > (day.workout_duration ?? 0)) {
      day.workout_duration = duration;
      day.workout_type = prettyActivity(attr(tag, "workoutActivityType"));
    }
  }

  return finalize([...days.values()]);
}

export function parseHealthCsv(csv: string): ParsedHealthDay[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0]!.split(/[,;\t]/).map((h) => h.trim().toLowerCase());
  const idx = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  const iDate = idx("date", "day", "time");
  const iSteps = idx("step");
  const iSleep = idx("sleep");
  const iType = idx("activity", "workout", "exercise type");
  const iDur = idx("duration", "minutes", "active min");
  if (iDate < 0) return [];

  const days: ParsedHealthDay[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(/[,;\t]/).map((c) => c.trim());
    const date = dayOf(cells[iDate] ?? "");
    if (!date) continue;
    const num = (i: number) => {
      if (i < 0) return null;
      const v = Number((cells[i] ?? "").replace(/[^0-9.]/g, ""));
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const sleep = num(iSleep);
    days.push({
      date,
      steps: num(iSteps),
      sleep_hours: sleep != null && sleep > 24 ? Number((sleep / 60).toFixed(2)) : sleep,
      workout_type: iType >= 0 && cells[iType] ? cells[iType]! : null,
      workout_duration: num(iDur) != null ? Math.round(num(iDur)!) : null,
    });
  }
  return finalize(days);
}

function finalize(days: ParsedHealthDay[]): ParsedHealthDay[] {
  return days
    .filter((d) => (d.steps ?? 0) > 0 || (d.sleep_hours ?? 0) > 0 || d.workout_type)
    .map((d) => ({
      date: d.date,
      steps: d.steps ? Math.round(d.steps) : null,
      sleep_hours: d.sleep_hours ? Number(d.sleep_hours.toFixed(2)) : null,
      workout_type: d.workout_type ?? null,
      workout_duration: d.workout_duration ?? null,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, DAY_LIMIT)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function parseHealthFile(name: string, text: string): ParsedHealthDay[] {
  if (/\.xml$/i.test(name) || text.trimStart().startsWith("<?xml") || text.includes("<HealthData")) {
    return parseAppleHealthXml(text);
  }
  return parseHealthCsv(text);
}
