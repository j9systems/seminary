// Domain model — shaped to match the original prototype's in-memory `data`
// object so the UI/derivation logic ports over faithfully. The Supabase
// adapter maps these <-> database rows.

export type Role = "teacher" | "student";
export type CardType = "quote" | "scripture" | "activity" | "image";
export type AttStatus = "p" | "t" | "a" | "e";
export type Theme = "light" | "dark";

export interface Insight {
  id?: string;
  lessonId: string;
  standout: string;
  details: string;
  learn: string;
  apply: string;
  at: string;
}

export interface Student {
  id: string;
  name: string;
  color: string;
  base: number;
  notes: string;
  insights: Insight[];
}

export interface FocusCard {
  id: string;
  type: CardType;
  title: string;
  body: string;
  author: string;
  img: boolean;
  authorImg: boolean;
  imageUrl?: string | null;
  authorImageUrl?: string | null;
  visible: boolean;
}

export interface Poll {
  id: string;
  q: string;
  opts: string[];
  optionIds?: string[];
  votes: number[];
  anon: boolean;
  open: boolean;
  myVote: number | null;
}

export interface Post {
  id?: string;
  n: string;
  t: string;
  at: string;
  anon?: boolean;
}

export interface Lesson {
  id: string;
  date: string;
  title: string;
  scr: string;
  prework: string;
  outline: string;
  manual: string;
  live: boolean;
  chatOpen: boolean;
  chatAnon?: boolean;
  posts: Post[];
  cards: FocusCard[];
  polls: Poll[];
  att: Record<string, AttStatus>;
  lastRevealed?: number | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  date: string;
}

export interface Groups {
  count: number;
  list: string[][];
  visible: boolean;
}

export interface ClassInfo {
  id: string;
  name: string;
  teacherName: string;
  accent: string;
  radius: number;
}

export interface Data {
  cls: ClassInfo;
  students: Student[];
  lessons: Lesson[];
  anns: Announcement[];
  groups: Groups;
}
