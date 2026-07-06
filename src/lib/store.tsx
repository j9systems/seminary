"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Announcement,
  CardType,
  Data,
  FocusCard,
  Lesson,
  Poll,
  Role,
  Student,
  Theme,
} from "./types";
import { seed, TODAY, MANUAL_TEXT } from "./seed";

const LS_KEY = "semhub-v1";
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "x" + Math.random().toString(36).slice(2);

const clone = <T,>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

export interface Actions {
  // lesson editor
  updateLesson: (
    id: string,
    patch: Partial<Pick<Lesson, "title" | "scr" | "date" | "prework" | "outline" | "manual">>
  ) => void;
  addLesson: () => string;
  importManual: (id: string) => void;
  // focus cards
  addCard: (
    lessonId: string,
    c: { type: CardType; title: string; body: string; author: string }
  ) => void;
  deleteCard: (lessonId: string, cardId: string) => void;
  toggleCard: (lessonId: string, cardId: string) => void;
  reorderCards: (lessonId: string, orderedIds: string[]) => void;
  revealNext: (lessonId: string) => string | null;
  setCardImage: (lessonId: string, cardId: string, url: string | null, which: "img" | "author") => void;
  // polls
  addPoll: (lessonId: string, p: { q: string; opts: string[]; anon: boolean }) => void;
  togglePollAnon: (lessonId: string, pollId: string) => void;
  togglePollOpen: (lessonId: string, pollId: string) => void;
  votePoll: (lessonId: string, pollId: string, optionIndex: number) => void;
  // chat
  toggleChatOpen: (lessonId: string) => void;
  toggleChatAnon: (lessonId: string) => void;
  postChat: (lessonId: string, text: string, authorName: string, anon: boolean) => void;
  // groups
  setGroupCount: (n: number) => void;
  shuffleGroups: (presentFirstNames: string[]) => void;
  toggleGroupsVisible: () => void;
  // attendance
  setAttendance: (lessonId: string, studentId: string, status: "p" | "t" | "a" | "e") => void;
  markAllPresent: (lessonId: string) => void;
  // live
  toggleLive: (lessonId: string) => void;
  // announcements
  addAnnouncement: (a: { title: string; body: string }) => void;
  togglePin: (id: string) => void;
  deleteAnnouncement: (id: string) => void;
  // student
  setNote: (studentId: string, text: string) => void;
  // makeup
  submitMakeup: (
    studentId: string,
    lessonId: string,
    v: { standout: string; details: string; learn: string; apply: string }
  ) => void;
}

export interface SeminaryContextValue {
  ready: boolean;
  mode: "demo" | "live";
  today: string;
  data: Data;
  theme: Theme;
  setTheme: (t: Theme) => void;
  role: Role;
  setRole: (r: Role) => void;
  actualRole: Role;
  me: Student;
  userName: string;
  actions: Actions;
  toast: string;
  showToast: (m: string) => void;
}

const Ctx = createContext<SeminaryContextValue | null>(null);

export function useSeminary() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSeminary must be used within SeminaryProvider");
  return v;
}

export function SeminaryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setDataState] = useState<Data>(() => seed());
  const [theme, setThemeState] = useState<Theme>("light");
  const [role, setRole] = useState<Role>("teacher");
  const [toast, setToast] = useState("");
  const dataRef = useRef(data);
  dataRef.current = data;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted demo state on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.data && s.data.lessons) {
          setDataState(s.data);
          if (s.theme) setThemeState(s.theme);
          if (s.role) setRole(s.role);
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Keep the page (html/body) background + iOS status-bar color in sync with
  // the user's chosen theme, so the safe-area regions don't flash white.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("theme-dark", theme === "dark");
    root.classList.toggle("theme-light", theme === "light");
    const bg = theme === "dark" ? "#101014" : "#F6F6F3";
    root.style.backgroundColor = bg;
    if (document.body) document.body.style.backgroundColor = bg;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", bg);
  }, [theme]);

  const persist = useCallback(
    (next: Data, t: Theme, r: Role) => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ data: next, theme: t, role: r }));
      } catch {
        /* ignore */
      }
    },
    []
  );

  const setData = useCallback(
    (next: Data) => {
      dataRef.current = next;
      setDataState(next);
      persist(next, theme, role);
    },
    [persist, theme, role]
  );

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      persist(dataRef.current, t, role);
    },
    [persist, role]
  );

  const showToast = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  // Mutate helper: clone current data, apply, commit.
  const mutate = useCallback(
    (fn: (draft: Data) => void) => {
      const draft = clone(dataRef.current);
      fn(draft);
      setData(draft);
    },
    [setData]
  );

  const findLesson = (draft: Data, id: string) => draft.lessons.find((l) => l.id === id);

  const actions: Actions = useMemo(
    () => ({
      updateLesson: (id, patch) =>
        mutate((d) => {
          const l = findLesson(d, id);
          if (l) Object.assign(l, patch);
        }),
      addLesson: () => {
        const id = uid();
        mutate((d) => {
          const last = d.lessons.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).pop();
          const nd = last ? new Date(last.date + "T12:00:00") : new Date();
          do {
            nd.setDate(nd.getDate() + 1);
          } while (nd.getDay() === 0 || nd.getDay() === 5 || nd.getDay() === 6);
          d.lessons.push({
            id,
            date: nd.toISOString().slice(0, 10),
            title: "New lesson",
            scr: "",
            prework: "",
            outline: "",
            manual: "",
            live: false,
            chatOpen: false,
            chatAnon: false,
            posts: [],
            cards: [],
            polls: [],
            att: {},
          });
        });
        return id;
      },
      importManual: (id) =>
        mutate((d) => {
          const l = findLesson(d, id);
          if (l) l.manual = MANUAL_TEXT;
        }),
      addCard: (lessonId, c) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (!l) return;
          const card: FocusCard = {
            id: uid(),
            type: c.type,
            title: c.title,
            body: c.body,
            author: c.author,
            img: c.type === "image",
            authorImg: !!c.author,
            visible: false,
          };
          l.cards.push(card);
        }),
      deleteCard: (lessonId, cardId) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (l) l.cards = l.cards.filter((x) => x.id !== cardId);
        }),
      toggleCard: (lessonId, cardId) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          const c = l?.cards.find((x) => x.id === cardId);
          if (c) c.visible = !c.visible;
        }),
      reorderCards: (lessonId, orderedIds) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (!l) return;
          l.cards.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
          l.lastRevealed = null;
        }),
      revealNext: (lessonId) => {
        let shown: string | null = null;
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (!l) return;
          let last = l.lastRevealed;
          if (last == null) {
            last = -1;
            l.cards.forEach((x, i) => {
              if (x.visible) last = i;
            });
          }
          const idx = (last ?? -1) + 1;
          if (idx >= l.cards.length) return;
          l.cards.forEach((x) => (x.visible = false));
          l.cards[idx].visible = true;
          l.lastRevealed = idx;
          shown = l.cards[idx].title;
        });
        return shown;
      },
      setCardImage: (lessonId, cardId, url, which) =>
        mutate((d) => {
          const c = findLesson(d, lessonId)?.cards.find((x) => x.id === cardId);
          if (!c) return;
          if (which === "img") c.imageUrl = url;
          else c.authorImageUrl = url;
        }),
      addPoll: (lessonId, p) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (!l) return;
          const poll: Poll = {
            id: uid(),
            q: p.q,
            opts: p.opts,
            optionIds: p.opts.map(() => uid()),
            votes: p.opts.map(() => 0),
            anon: p.anon,
            open: false,
            myVote: null,
          };
          l.polls.push(poll);
        }),
      togglePollAnon: (lessonId, pollId) =>
        mutate((d) => {
          const p = findLesson(d, lessonId)?.polls.find((x) => x.id === pollId);
          if (p) p.anon = !p.anon;
        }),
      togglePollOpen: (lessonId, pollId) =>
        mutate((d) => {
          const p = findLesson(d, lessonId)?.polls.find((x) => x.id === pollId);
          if (p) p.open = !p.open;
        }),
      votePoll: (lessonId, pollId, optionIndex) =>
        mutate((d) => {
          const p = findLesson(d, lessonId)?.polls.find((x) => x.id === pollId);
          if (!p) return;
          if (p.myVote != null) p.votes[p.myVote]--;
          p.votes[optionIndex]++;
          p.myVote = optionIndex;
        }),
      toggleChatOpen: (lessonId) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (l) l.chatOpen = !l.chatOpen;
        }),
      toggleChatAnon: (lessonId) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (l) l.chatAnon = !l.chatAnon;
        }),
      postChat: (lessonId, text, authorName, anon) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (!l) return;
          l.posts.push({ id: uid(), n: anon ? "Anonymous" : authorName, t: text, at: "now", anon });
        }),
      setGroupCount: (n) =>
        mutate((d) => {
          d.groups.count = Math.max(2, Math.min(6, n || 2));
        }),
      shuffleGroups: (pool) =>
        mutate((d) => {
          const shuffled = pool.slice().sort(() => Math.random() - 0.5);
          const n = d.groups.count;
          const out: string[][] = Array.from({ length: n }, () => []);
          shuffled.forEach((p, i) => out[i % n].push(p));
          d.groups.list = out;
        }),
      toggleGroupsVisible: () =>
        mutate((d) => {
          d.groups.visible = !d.groups.visible;
        }),
      setAttendance: (lessonId, studentId, status) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (!l) return;
          if (l.att[studentId] === status) delete l.att[studentId];
          else l.att[studentId] = status;
        }),
      markAllPresent: (lessonId) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (!l) return;
          d.students.forEach((s) => (l.att[s.id] = "p"));
        }),
      toggleLive: (lessonId) =>
        mutate((d) => {
          const l = findLesson(d, lessonId);
          if (l) l.live = !l.live;
        }),
      addAnnouncement: (a) =>
        mutate((d) => {
          d.anns.unshift({ id: uid(), title: a.title, body: a.body, pinned: false, date: TODAY });
        }),
      togglePin: (id) =>
        mutate((d) => {
          const a = d.anns.find((x) => x.id === id);
          if (a) a.pinned = !a.pinned;
        }),
      deleteAnnouncement: (id) =>
        mutate((d) => {
          d.anns = d.anns.filter((x) => x.id !== id);
        }),
      setNote: (studentId, text) =>
        mutate((d) => {
          const s = d.students.find((x) => x.id === studentId);
          if (s) s.notes = text;
        }),
      submitMakeup: (studentId, lessonId, v) =>
        mutate((d) => {
          const s = d.students.find((x) => x.id === studentId);
          if (!s) return;
          s.insights.push({ id: uid(), lessonId, ...v, at: TODAY });
        }),
    }),
    [mutate]
  );

  const me = data.students[0];

  const value: SeminaryContextValue = {
    ready,
    mode: "demo",
    today: TODAY,
    data,
    theme,
    setTheme,
    role,
    setRole,
    actualRole: role,
    me,
    userName: role === "teacher" ? data.cls.teacherName : me.name.split(" ")[0],
    actions,
    toast,
    showToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
