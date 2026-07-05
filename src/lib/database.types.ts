// Hand-authored to match supabase/migrations/0001_init.sql. Replace with
// `supabase gen types typescript` output once the schema is applied.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

interface ClassRow {
  id: string;
  name: string;
  teacher_name: string;
  accent: string;
  radius: number;
  group_count: number;
  groups_visible: boolean;
  groups_list: Json;
  created_at: string;
}
interface ProfileRow {
  id: string;
  class_id: string;
  user_id: string | null;
  full_name: string;
  role: "teacher" | "student";
  color: string;
  streak_base: number;
  email: string | null;
  created_at: string;
}
interface LessonRow {
  id: string;
  class_id: string;
  lesson_date: string;
  title: string;
  scripture: string;
  prework: string;
  outline: string;
  manual: string;
  live: boolean;
  chat_open: boolean;
  chat_anon: boolean;
  last_revealed: number | null;
  created_at: string;
}
interface FocusCardRow {
  id: string;
  lesson_id: string;
  card_type: "quote" | "scripture" | "activity" | "image";
  title: string;
  body: string;
  author: string;
  image_url: string | null;
  author_image_url: string | null;
  visible: boolean;
  position: number;
  created_at: string;
}
interface PollRow {
  id: string;
  lesson_id: string;
  question: string;
  anon: boolean;
  open: boolean;
  position: number;
  created_at: string;
}
interface PollOptionRow {
  id: string;
  poll_id: string;
  label: string;
  position: number;
}
interface PollVoteRow {
  id: string;
  poll_id: string;
  option_id: string;
  voter_id: string;
  created_at: string;
}
interface ChatPostRow {
  id: string;
  lesson_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  anon: boolean;
  created_at: string;
}
interface AttendanceRow {
  id: string;
  lesson_id: string;
  student_id: string;
  status: "p" | "t" | "a" | "e";
  marked_by: string | null;
  updated_at: string;
}
interface AnnouncementRow {
  id: string;
  class_id: string;
  title: string;
  body: string;
  pinned: boolean;
  author_id: string | null;
  created_at: string;
}
interface MakeupInsightRow {
  id: string;
  lesson_id: string;
  student_id: string;
  standout: string;
  details: string;
  learn: string;
  apply: string;
  created_at: string;
}
interface TeacherNoteRow {
  id: string;
  class_id: string;
  student_id: string;
  body: string;
  updated_at: string;
}

type T<R> = { Row: Row<R>; Insert: Insert<R>; Update: Update<R>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      classes: T<ClassRow>;
      profiles: T<ProfileRow>;
      lessons: T<LessonRow>;
      focus_cards: T<FocusCardRow>;
      polls: T<PollRow>;
      poll_options: T<PollOptionRow>;
      poll_votes: T<PollVoteRow>;
      chat_posts: T<ChatPostRow>;
      attendance: T<AttendanceRow>;
      announcements: T<AnnouncementRow>;
      makeup_insights: T<MakeupInsightRow>;
      teacher_notes: T<TeacherNoteRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
