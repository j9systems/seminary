import type { Data, Lesson, Student } from "./types";

// Date helpers — parse as noon-local to avoid TZ drift on date-only strings.
export const d = (s: string) => new Date(s + "T12:00:00");
export const longDate = (s: string) =>
  d(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
export const shortDate = (s: string) =>
  d(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export const monthDay = (s: string) =>
  d(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// Lessons on/before `today`, most-recent first.
export function pastDesc(data: Data, today: string): Lesson[] {
  return data.lessons
    .filter((l) => l.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Streak = consecutive present/tardy lessons back from today, until an absence,
// plus the student's seeded base streak.
export function streak(data: Data, today: string, st: Student): number {
  let n = 0;
  for (const l of pastDesc(data, today)) {
    const a = l.att[st.id];
    if (a === "a") return n;
    if (a === "p" || a === "t") n++;
  }
  return n + st.base;
}

// Attendance percentage across marked lessons.
export function pct(data: Data, today: string, st: Student): number {
  let p = 0,
    m = 0;
  pastDesc(data, today).forEach((l) => {
    const a = l.att[st.id];
    if (a) {
      m++;
      if (a === "p" || a === "t") p++;
    }
  });
  return m ? Math.round((p * 100) / m) : 0;
}

export function todayLesson(data: Data, today: string): Lesson | undefined {
  return data.lessons.find((l) => l.date === today);
}

export function nextLesson(data: Data, today: string): Lesson | undefined {
  return data.lessons
    .filter((l) => l.date > today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
}
