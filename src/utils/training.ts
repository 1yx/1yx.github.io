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

// ---- category → themed class hook (see training.css .tx-workout--*) ----

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
