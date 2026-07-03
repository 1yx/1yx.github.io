// Shared types + pure helpers for the /running/calendar/ pages.
//
// The training plan is imported once here (single Vite module-graph node → one
// shared chunk across the day/mesocycle/overview client scripts). Strava activities
// are fetched at runtime from /running/calendar/activities.json (updated by a
// GitHub Action without rebuild), so they are passed into the helpers as args.

import planData from "@/data/training/plan.json";

export interface Workout {
  text: string | null;
  category?: string;
  color?: string;
  planned_km?: number;
  actual?: { distance_km: number; moving_time: number; elev_m: number; name: string } | null;
}

export interface PlanDay {
  day: number;
  date: string;
  am: Workout | null;
  pm: Workout | null;
}

export interface Microcycle {
  index?: number;
  cycle?: number;
  in_mesocycle?: number;
  cutback?: boolean;
  taper?: boolean;
  total_km?: string;
  days: PlanDay[];
}

export interface Mesocycle {
  index: number;
  microcycles?: Microcycle[];
  sets?: Microcycle[];
}

export interface Phase {
  name: string;
  mesocycles: Mesocycle[];
}

export interface Plan {
  phases?: Phase[];
  sessions?: Phase[];
}

export interface Split {
  split?: number;
  distance_km?: number;
  moving_time?: number;
  pace_sec_per_km?: number;
  elev_m?: number;
  activityIndex?: number;
}

export interface Activity {
  id: number;
  date: string;
  time?: string;
  name: string;
  sport_type?: string;
  distance_km: number;
  moving_time: number;
  elev_m?: number;
  description?: string;
  splits_metric?: Split[];
}

const plan = planData as unknown as Plan;

/** Single source for the bundled plan. */
export function getPlan(): Plan {
  return plan;
}

export const phases = (): Phase[] => {
  const p = getPlan();
  return p.phases || p.sessions || [];
};

export const microcyclesOf = (mesocycle: Mesocycle): Microcycle[] => mesocycle.microcycles || mesocycle.sets || [];

export const microcycleIndex = (m: Microcycle): number => m.index ?? m.cycle ?? 0;

export const dayPlannedKm = (day: PlanDay): number =>
  +(((day.am?.planned_km) || 0) + ((day.pm?.planned_km) || 0)).toFixed(1);

export interface DayEntry {
  microcycle: Microcycle;
  day: PlanDay;
}

/** Flatten a mesocycle's microcycles into an ordered list of {microcycle, day}. */
export const dayEntriesOf = (mesocycle: Mesocycle): DayEntry[] => {
  const out: DayEntry[] = [];
  for (const m of microcyclesOf(mesocycle)) {
    for (const day of m.days) out.push({ microcycle: m, day });
  }
  return out;
};

export interface PhaseMicrocycle {
  mesocycle: Mesocycle;
  mesocycleIndex: number;
  microcycle: Microcycle;
  dayIndex: number;
}

/** All microcycles in a phase, tagged with their mesocycle + day offset (for deep links). */
export const allMicrocycles = (phase: Phase): PhaseMicrocycle[] =>
  phase.mesocycles.flatMap((mesocycle, mesocycleIndex) => {
    let dayOffset = 0;
    return microcyclesOf(mesocycle).map(microcycle => {
      const item: PhaseMicrocycle = { mesocycle, mesocycleIndex, microcycle, dayIndex: dayOffset };
      dayOffset += (microcycle.days || []).length;
      return item;
    });
  });

export const sumKm = (list: number[]): number => +list.reduce((s, n) => s + n, 0).toFixed(1);

export const phaseKm = (phase: Phase): number =>
  sumKm(
    allMicrocycles(phase).map(({ microcycle }) => {
      const parsed = parseFloat(microcycle.total_km || "");
      if (!Number.isNaN(parsed)) return parsed;
      return sumKm((microcycle.days || []).map(dayPlannedKm));
    })
  );

/** Total planned km of a phase, optionally restricted to one category
 *  (sums per-workout planned_km, since microcycle totals are all-category). */
export const phaseKmByCategory = (phase: Phase, category?: string): number => {
  const kms: number[] = [];
  for (const { microcycle } of allMicrocycles(phase)) {
    for (const day of microcycle.days || []) {
      for (const w of [day.am, day.pm]) {
        if (!w || !w.text) continue;
        if (category && categoryClass(w) !== category) continue;
        kms.push(w.planned_km || 0);
      }
    }
  }
  return sumKm(kms);
};

// ---- activities aggregation ----

export interface AggregatedActual {
  km: number;
  t: number;
  e: number;
  n: number;
  name: string;
  id?: number;
  desc: string;
  splits: Split[];
}

/** Group a day's activities into AM/PM and sum each group (incl. extra unplanned runs). */
export const aggregateActs = (
  acts: Activity[],
  dateIso: string
): { am: AggregatedActual | null; pm: AggregatedActual | null } => {
  const groups: { am: Activity[]; pm: Activity[] } = { am: [], pm: [] };
  for (const a of acts) {
    if (a.date !== dateIso) continue;
    (parseInt((a.time || "12").slice(0, 2), 10) < 12 ? groups.am : groups.pm).push(a);
  }
  const sum = (list: Activity[]): AggregatedActual | null => {
    if (!list.length) return null;
    let km = 0, t = 0, e = 0;
    for (const a of list) {
      km += a.distance_km;
      t += a.moving_time;
      e += a.elev_m || 0;
    }
    const splits = list.flatMap((a, activityIndex) =>
      (a.splits_metric || []).map(split => ({ ...split, activityIndex }))
    );
    return {
      km: +km.toFixed(2),
      t,
      e,
      n: list.length,
      name: list[0].name,
      id: list[0].id,
      desc: (list[0].description || "").trim(),
      splits,
    };
  };
  return { am: sum(groups.am), pm: sum(groups.pm) };
};

export const dayActualKm = (acts: Activity[], day: PlanDay): number => {
  const agg = aggregateActs(acts, day.date);
  return +(((agg.am?.km) || 0) + ((agg.pm?.km) || 0)).toFixed(2);
};

// ---- formatting ----

export const paceOf = (km: number, sec: number): string => {
  if (!km || !sec) return "";
  const s = sec / km, m = Math.floor(s / 60), ss = Math.round(s % 60);
  return m + "′" + (ss < 10 ? "0" : "") + ss + "″";
};

export const paceText = (sec: number): string => {
  if (!sec) return "";
  const m = Math.floor(sec / 60), ss = Math.round(sec % 60);
  return m + "′" + (ss < 10 ? "0" : "") + ss + "″";
};

// ---- pace zones (6-zone scheme; thresholds tunable) ----

export interface PaceZone {
  id: number; // 1 (slowest) … 6 (fastest)
  max: number; // exclusive upper bound in sec/km (Infinity for the slowest bucket)
  color: string; // CSS color token, set as inline --zc on each rect/swatch
  label: string; // display range, e.g. "4:15–5:09"
}

/** Six-zone pace scheme (sec/km, faster = smaller). A pace lands in the first
 *  zone whose `max` it is strictly below; the Z1 bucket (Infinity) catches all. */
export const PACE_ZONES: PaceZone[] = [
  { id: 6, max: 204, color: "var(--purple)", label: "<3:24" }, // Z6 < 3:24
  { id: 5, max: 220, color: "var(--red)", label: "3:24–3:39" }, // Z5
  { id: 4, max: 239, color: "var(--orange)", label: "3:40–3:58" }, // Z4
  { id: 3, max: 255, color: "var(--yellow)", label: "3:59–4:14" }, // Z3
  { id: 2, max: 310, color: "var(--green)", label: "4:15–5:09" }, // Z2
  { id: 1, max: Infinity, color: "var(--teal)", label: ">5:09" }, // Z1 ≥ 310
];

/** Classify a sec/km pace into its zone. */
export const paceZone = (secPerKm: number): PaceZone =>
  PACE_ZONES.find(z => secPerKm < z.max) ?? PACE_ZONES[PACE_ZONES.length - 1];

/** Parse the first target-pace token from a plan workout text into sec/km.
 *  Handles a single pace (`@5′00″`) and a range (`@5′05″-5′15″`); returns
 *  {fast, slow} (fast ≤ slow). Multi-segment texts yield the first segment. */
export const parseTargetPace = (
  text: string | null | undefined
): { fast: number; slow: number } | null => {
  if (!text) return null;
  // The closing ″ is optional — some plan entries omit it (e.g. "@5′05").
  const m = text.match(/@(\d+)[′'](\d+)[″"]?(?:\s*-\s*(\d+)[′'](\d+)[″"]?)?/);
  if (!m) return null;
  const a = +m[1] * 60 + +m[2];
  if (m[3] !== undefined && m[4] !== undefined) {
    const b = +m[3] * 60 + +m[4];
    return { fast: Math.min(a, b), slow: Math.max(a, b) };
  }
  return { fast: a, slow: a };
};

export const fmtShort = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const fmtFull = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return (
    d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + "（周" + "日一二三四五六"[d.getDay()] + "）"
  );
};

export const todayISO = (): string => {
  const d = new Date();
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  );
};

/** Find the {phaseIndex, mesocycleIndex, dayIndex} for today, or null if not in the plan. */
export const findToday = (): { phaseIndex: number; mesocycleIndex: number; dayIndex: number } | null => {
  const t = todayISO();
  const phaseList = phases();
  for (let p = 0; p < phaseList.length; p++) {
    for (let b = 0; b < phaseList[p].mesocycles.length; b++) {
      const days: string[] = [];
      microcyclesOf(phaseList[p].mesocycles[b]).forEach(m => m.days.forEach(day => days.push(day.date)));
      const idx = days.indexOf(t);
      if (idx >= 0) return { phaseIndex: p, mesocycleIndex: b, dayIndex: idx };
    }
  }
  return null;
};

// ---- category → themed class hook (see training.css .tx-session--*) ----

export const categoryClass = (w: Workout | null): string => {
  if (!w || !w.text) return "rest";
  const category = (w.category || "").toLowerCase();
  if (category) return category;
  const color = ((w && w.color) || "").toUpperCase();
  if (color === "#F6A9EE") return "specific";
  if (color === "#C5A6FF") return "special";
  if (color === "#74DDFF") return "fundamental";
  if (color === "#CFEDE4") return "regeneration";
  if (color === "#9AA7BA") return "rest";
  return "extra";
};

export const esc = (s: string | null | undefined): string =>
  (s || "").replace(
    /[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );

/** Strip @pace/@intensity and English description words, keep only distance + structure.
 *  e.g. "26km Long Run @5′10″" → "26km", "4km@wu+4*(6km@3′44″+1km@4′13″)" → "4km+4*(6km+1km)" */
export const simplifyWorkoutText = (w: Workout | null): string => {
  if (!w || !w.text) return "";
  const s = w.text
    .replace(/@[^\s+*)]+/g, "") // @5′10″, @wu, etc. (stop at +,*,),space)
    .replace(/[a-zA-Z]{3,}/g, "") // Long, Run, Recovery, etc. (keeps km/m — 2 letters)
    .replace(/[^0-9km+*()×.\s]/g, "") // keep only structural chars
    .replace(/\s+/g, " ")
    .replace(/\s*([+*])\s*/g, "$1") // remove spaces around + and *
    .trim();
  return s || (w.planned_km ? `${w.planned_km}km` : "");
};

// ---- weekly view helpers ----

/** Filterable workout categories (chips + CSS stay in sync via this tuple). */
export const CATEGORIES = ["regeneration", "fundamental", "special", "specific", "race"] as const;
export type CategoryKey = (typeof CATEGORIES)[number];

/** Flatten the whole plan into an ordered list of days (plan is contiguous). */
export const allDays = (): PlanDay[] =>
  phases().flatMap(p =>
    p.mesocycles.flatMap(b => (b.microcycles || b.sets || []).flatMap(m => m.days))
  );

/** ISO date (YYYY-MM-DD) of the Monday starting the week of `iso` (UTC-stable). */
export const mondayOf = (iso: string): string => {
  const d = new Date(iso + "T00:00:00Z");
  const diff = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
};

const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---- calendar (month-sectioned Mon–Sun grid) ----

export interface CalendarCell {
  date: string; // YYYY-MM-DD of this grid slot
  day: PlanDay | null; // the plan day, or null if not in plan / out of month
  inMonth: boolean; // whether this slot's date falls in the section's month
}

export interface CalendarWeek {
  monday: string;
  cells: CalendarCell[]; // exactly 7, Mon … Sun
}

export interface CalendarMonth {
  ym: string; // YYYY-MM
  weeks: CalendarWeek[];
}

/** Group the plan into a Mon–Sun calendar bucketed by calendar month.
 *  A week that straddles two months is rendered in BOTH months — each copy
 *  shows only its own in-month days; the out-of-month slots are blank cells.
 *  So 6/29–7/5 appears as June's tail row (6/29,6/30) and July's head row
 *  (7/1–7/5), matching a real month-per-section calendar. */
export const calendarMonths = (): CalendarMonth[] => {
  // Global date → day map so a straddling week's out-of-month cells still carry
  // their plan day (needed for the full-week total). `inMonth` alone decides
  // whether a cell renders in a given month's section.
  const byDate = new Map<string, PlanDay>();
  const yms = new Set<string>();
  for (const day of allDays()) {
    byDate.set(day.date, day);
    yms.add(day.date.slice(0, 7));
  }
  const months: CalendarMonth[] = [];
  for (const ym of [...yms].sort()) {
    const mondays = [
      ...new Set(
        [...byDate.keys()].filter(d => d.slice(0, 7) === ym).map(mondayOf)
      ),
    ].sort();
    months.push({
      ym,
      weeks: mondays.map(mon => ({
        monday: mon,
        cells: Array.from({ length: 7 }, (_, off) => {
          const date = addDaysISO(mon, off);
          return { date, day: byDate.get(date) ?? null, inMonth: date.slice(0, 7) === ym };
        }),
      })),
    });
  }
  return months;
};

const plannedKmOfDay = (day: PlanDay, category?: string): number => {
  let km = 0;
  for (const w of [day.am, day.pm]) {
    if (!w || !w.text) continue;
    if (category && categoryClass(w) !== category) continue;
    km += w.planned_km || 0;
  }
  return km;
};

/** Planned km of a FULL Mon–Sun week — every plan day in the row, including the
 *  out-of-month days of a straddling week. So June's tail row and July's head row
 *  (the same underlying week) report the same total. Optionally category-restricted. */
export const weekKm = (week: CalendarWeek, category?: string): number =>
  sumKm(week.cells.map(c => (c.day ? plannedKmOfDay(c.day, category) : 0)));

/** Planned km of a calendar month — only its own in-month days (1st → month-end),
 *  so straddling weeks aren't double-counted. Optionally category-restricted. */
export const monthKm = (month: CalendarMonth, category?: string): number =>
  sumKm(
    month.weeks.flatMap(w =>
      w.cells.map(c => (c.inMonth && c.day ? plannedKmOfDay(c.day, category) : 0))
    )
  );

// ---- month labels ----

const ZH_ORDINALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
const EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Display label for a YYYY-MM, e.g. "六月" / "Jun". */
export const monthLabel = (ym: string, lang: "zh-CN" | "en"): string => {
  const m = parseInt(ym.split("-")[1], 10);
  return lang === "zh-CN" ? `${ZH_ORDINALS[m - 1]}月` : EN_SHORT[m - 1];
};
