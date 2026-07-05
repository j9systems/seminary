"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSeminary } from "@/lib/store";
import { cssx, Icon, typeChip, ImageSlot } from "./ui";
import {
  d,
  longDate,
  shortDate,
  monthDay,
  initials,
  pastDesc,
  streak,
  pct,
  todayLesson,
  nextLesson,
} from "@/lib/calc";
import type { AttStatus, CardType, Lesson } from "@/lib/types";

type Screen =
  | "home"
  | "lessons"
  | "lesson"
  | "teach"
  | "live"
  | "attendance"
  | "students"
  | "student"
  | "makeup"
  | "anns"
  | "profile";

const HMAP: Record<AttStatus, [string, string, string]> = {
  p: ["P", "color-mix(in oklab, var(--ok) 18%, var(--card))", "var(--ok)"],
  t: ["T", "color-mix(in oklab, var(--amb) 26%, var(--card))", "color-mix(in oklab, var(--amb) 60%, var(--ink))"],
  a: ["A", "color-mix(in oklab, var(--bad) 16%, var(--card))", "var(--bad)"],
  e: ["E", "color-mix(in oklab, var(--mut) 20%, var(--card))", "var(--mut)"],
};

export default function SeminaryApp() {
  const {
    data,
    today,
    theme,
    setTheme,
    role,
    setRole,
    me,
    userName,
    actions,
    toast,
    showToast,
  } = useSeminary();

  const isTeacher = role === "teacher";
  const isStudent = !isTeacher;

  // ── UI state ───────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("home");
  const [tab, setTab] = useState<"outline" | "manual" | "focus" | "engage" | "prework">("outline");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showOutline, setShowOutline] = useState(true);
  const [dragCardId, setDragCardId] = useState<string | null>(null);

  // form drafts
  const [chatDraft, setChatDraft] = useState("");
  const [mkLesson, setMkLesson] = useState("");
  const [mk, setMk] = useState({ 1: "", 2: "", 3: "", 4: "" } as Record<number, string>);
  const [mkDone, setMkDone] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [cardType, setCardType] = useState<CardType>("quote");
  const [cardTitle, setCardTitle] = useState("");
  const [cardBody, setCardBody] = useState("");
  const [cardAuthor, setCardAuthor] = useState("");
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState("");
  const [pollAnon, setPollAnon] = useState(true);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // apply accent/radius theming props from class settings
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (data.cls.accent) el.style.setProperty("--acc", data.cls.accent);
    if (data.cls.radius != null) el.style.setProperty("--rad", data.cls.radius + "px");
  }, [data.cls.accent, data.cls.radius]);

  const go = (s: Screen, opts?: { lessonId?: string; studentId?: string; tab?: typeof tab }) => {
    if (opts?.lessonId !== undefined) setLessonId(opts.lessonId);
    if (opts?.studentId !== undefined) setStudentId(opts.studentId);
    if (opts?.tab) setTab(opts.tab);
    setScreen(s);
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const today_ = todayLesson(data, today);
  const next = nextLesson(data, today);
  const L = (id: string | null) => data.lessons.find((l) => l.id === id);
  const lesson = L(lessonId) || today_ || data.lessons[0];

  const acc = "var(--acc)";
  const mut = "var(--mut)";

  const nav = isTeacher
    ? [
        ["home", "Home", "home"],
        ["lessons", "Lessons", "book"],
        ["attendance", "Attendance", "check"],
        ["students", "Students", "users"],
        ["anns", "Announcements", "bell"],
      ]
    : [
        ["home", "Home", "home"],
        ["live", "Live", "live"],
        ["lessons", "Lessons", "book"],
        ["makeup", "Makeup", "pencil"],
        ["profile", "Profile", "user"],
      ];
  const navRoot =
    ({ lesson: "lessons", teach: "lessons", student: "students" } as Record<string, string>)[
      screen
    ] || screen;

  // attendance summary (today)
  let ap = 0,
    aa = 0,
    ae = 0,
    at = 0;
  if (today_)
    data.students.forEach((s) => {
      const v = today_.att[s.id];
      if (v === "p") ap++;
      else if (v === "t") at++;
      else if (v === "a") aa++;
      else if (v === "e") ae++;
    });
  const marked = ap + aa + ae + at;
  const attSummary = today_
    ? marked + " of " + data.students.length + " marked · " + ap + " present"
    : "No class today";

  const streaks = data.students
    .map((s) => ({ name: s.name.split(" ")[0], n: streak(data, today, s) }))
    .sort((a, b) => b.n - a.n);

  const presentStudents = today_ ? data.students.filter((s) => today_.att[s.id] === "p") : [];

  // live (student) — today's lesson
  const liveL = today_;
  const liveOn = !!(liveL && liveL.live);

  const missed = pastDesc(data, today).filter(
    (l) => l.att[me.id] === "a" || l.att[me.id] === "e"
  );

  const annSort = data.anns
    .slice()
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.date < b.date ? 1 : -1));

  const sd = data.students.find((s) => s.id === studentId) || data.students[0];

  // ── Outline RTE ───────────────────────────────────────────────────────────
  const outEl = useRef<HTMLDivElement | null>(null);
  const outFor = useRef<string | null>(null);
  useEffect(() => {
    if (screen === "lesson" && tab === "outline" && outEl.current && lesson) {
      if (outFor.current !== lesson.id) {
        outEl.current.innerHTML = lesson.outline || "";
        outFor.current = lesson.id;
      }
    }
    if (!(screen === "lesson" && tab === "outline")) outFor.current = null;
  }, [screen, tab, lesson]);

  const exec = (cmd: string, val?: string) => {
    outEl.current?.focus();
    document.execCommand(cmd, false, val);
    if (lesson && outEl.current) actions.updateLesson(lesson.id, { outline: outEl.current.innerHTML });
  };
  const rteBtns = [
    { label: "B", onClick: () => exec("bold") },
    { label: "I", onClick: () => exec("italic") },
    { label: "U", onClick: () => exec("underline") },
    { label: "• List", onClick: () => exec("insertUnorderedList") },
    { label: "❝ Quote", onClick: () => exec("formatBlock", "blockquote") },
    { label: "Highlight", onClick: () => exec("hiliteColor", "rgba(247,201,72,.45)") },
    {
      label: "Clear",
      onClick: () => {
        exec("removeFormat");
        exec("formatBlock", "p");
      },
    },
  ];

  // ── Card drag reorder ──────────────────────────────────────────────────────
  const cardsListRef = useRef<HTMLDivElement | null>(null);
  const startCardDrag = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    if (!lesson) return;
    setDragCardId(id);
    const listEl = cardsListRef.current;
    const move = (ev: PointerEvent) => {
      if (!listEl) return;
      const rows = Array.from(listEl.querySelectorAll<HTMLElement>("[data-cardid]"));
      const order = rows.map((r) => r.getAttribute("data-cardid")!);
      const fromIdx = order.indexOf(id);
      let toIdx = fromIdx;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) {
          toIdx = i;
          break;
        }
        toIdx = i + 1;
      }
      if (toIdx > fromIdx) toIdx--;
      if (toIdx !== fromIdx && toIdx >= 0 && toIdx < order.length) {
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, id);
        actions.reorderCards(lesson.id, order);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragCardId(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const postChat = () => {
    const t = chatDraft.trim();
    if (!t || !liveL) return;
    const anon = !!liveL.chatAnon;
    actions.postChat(liveL.id, t, isTeacher ? data.cls.teacherName : me.name, anon);
    setChatDraft("");
  };
  const doRevealNext = () => {
    if (!lesson) return;
    const shown = actions.revealNext(lesson.id);
    showToast(shown ? "Showing: " + shown : "All cards have been shown");
  };
  const submitMakeup = () => {
    if (!mk[1].trim()) return;
    const lid = mkLesson || (missed[0] ? missed[0].id : "");
    actions.submitMakeup(me.id, lid, {
      standout: mk[1].trim(),
      details: mk[2].trim(),
      learn: mk[3].trim(),
      apply: mk[4].trim(),
    });
    setMk({ 1: "", 2: "", 3: "", 4: "" });
    setMkDone(true);
  };
  const addCard = () => {
    if (!cardTitle.trim() || !lesson) return;
    actions.addCard(lesson.id, {
      type: cardType,
      title: cardTitle.trim(),
      body: cardBody.trim(),
      author: cardAuthor.trim(),
    });
    setCardTitle("");
    setCardBody("");
    setCardAuthor("");
    showToast("Focus card added");
  };
  const addPoll = () => {
    const opts = pollOpts.split(",").map((x) => x.trim()).filter(Boolean);
    if (!pollQ.trim() || opts.length < 2 || !lesson) return;
    actions.addPoll(lesson.id, { q: pollQ.trim(), opts, anon: pollAnon });
    setPollQ("");
    setPollOpts("");
    showToast("Poll added");
  };
  const addAnn = () => {
    if (!annTitle.trim()) return;
    actions.addAnnouncement({ title: annTitle.trim(), body: annBody.trim() });
    setAnnTitle("");
    setAnnBody("");
    showToast("Announcement posted");
  };
  const shuffleGroups = () => {
    actions.shuffleGroups(presentStudents.map((s) => s.name.split(" ")[0]));
    showToast("Groups shuffled");
  };

  const homeGrid = isMobile ? "1fr" : "1.55fr 1fr";
  const teachGrid = isMobile ? "1fr" : "1.5fr 1fr";

  // ── Render helpers ────────────────────────────────────────────────────────
  const NavButtons = ({ mobile }: { mobile: boolean }) => (
    <>
      {nav.map(([id, label, ic]) => {
        const on = navRoot === id;
        return (
          <button
            key={id}
            onClick={() => go(id as Screen)}
            style={
              mobile
                ? {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    background: "none",
                    border: "none",
                    color: on ? acc : mut,
                    fontWeight: on ? 800 : 600,
                    fontSize: 10.5,
                    cursor: "pointer",
                    padding: "4px 8px",
                    minWidth: 52,
                  }
                : {
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: on ? "var(--soft)" : "transparent",
                    color: on ? acc : mut,
                    border: "none",
                    borderRadius: 12,
                    padding: "11px 14px",
                    fontWeight: on ? 800 : 600,
                    fontSize: 14,
                    cursor: "pointer",
                    textAlign: "left",
                  }
            }
          >
            <Icon name={ic} />
            {label}
          </button>
        );
      })}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={`sem ${theme}`}
      style={cssx(
        "min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Instrument Sans',ui-sans-serif,system-ui,sans-serif;transition:background .3s,color .3s"
      )}
    >
      {/* Desktop top bar */}
      {!isMobile && (
        <div
          style={cssx(
            "position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--bg) 60%,transparent);backdrop-filter:blur(22px) saturate(1.6);-webkit-backdrop-filter:blur(22px) saturate(1.6);border-bottom:1px solid color-mix(in srgb,var(--line) 70%,transparent)"
          )}
        >
          <div style={cssx("max-width:1160px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 20px")}>
            <div style={cssx("width:30px;height:30px;border-radius:9px;background:var(--acc);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-family:'Bricolage Grotesque',sans-serif;font-size:16px;flex-shrink:0")}>
              S
            </div>
            <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;line-height:1.1")}>
              Seminary Hub
            </div>
            <div style={{ flex: 1 }} />
            <div style={cssx("font-size:11.5px;font-weight:700;color:var(--mut)")}>
              {isTeacher ? "Teacher" : "Student"} view
            </div>
          </div>
        </div>
      )}

      <div style={cssx("max-width:1160px;margin:0 auto;display:flex;align-items:flex-start;gap:26px;padding:20px 20px 40px")}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <div style={cssx("width:186px;flex-shrink:0;position:sticky;top:76px;display:flex;flex-direction:column;gap:5px")}>
            <NavButtons mobile={false} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {screen === "profile" && renderProfile()}
          {screen === "home" && renderHome()}
          {screen === "lessons" && renderLessons()}
          {screen === "lesson" && isTeacher && renderTeacherLesson()}
          {screen === "lesson" && isStudent && renderStudentLesson()}
          {screen === "teach" && renderTeach()}
          {screen === "live" && renderLive()}
          {screen === "attendance" && renderAttendance()}
          {screen === "students" && renderStudents()}
          {screen === "student" && renderStudentDetail()}
          {screen === "makeup" && renderMakeup()}
          {screen === "anns" && renderAnns()}
          {isMobile && <div style={{ height: 84 }} />}
        </div>
      </div>

      {/* Role FAB (teacher) */}
      {isTeacher && (
        <button
          onClick={() => {
            setRole("student"); // preview as student
            go("home");
          }}
          style={cssx(
            `position:fixed;right:16px;bottom:${isMobile ? "92px" : "20px"};z-index:50;background:var(--ink);color:var(--bg);border:none;border-radius:999px;padding:11px 17px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.22);display:flex;align-items:center;gap:8px`
          )}
        >
          <Icon name="live" /> View as student
        </button>
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <div
          style={cssx(
            "position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:40;background:color-mix(in srgb,var(--card) 55%,transparent);backdrop-filter:blur(22px) saturate(1.6);-webkit-backdrop-filter:blur(22px) saturate(1.6);border:1px solid color-mix(in srgb,var(--line) 70%,transparent);border-radius:24px;box-shadow:0 8px 32px rgba(0,0,0,.14);display:flex;justify-content:space-around;padding:8px 6px"
          )}
        >
          <NavButtons mobile />
        </div>
      )}

      {/* Toast */}
      {!!toast && (
        <div
          style={cssx(
            "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:60;background:var(--ink);color:var(--bg);border-radius:999px;padding:11px 20px;font-weight:700;font-size:13.5px;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis"
          )}
        >
          {toast}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Screens
  // ═══════════════════════════════════════════════════════════════════════

  function card(extra = "") {
    return cssx("background:var(--card);border:1px solid var(--line);border-radius:var(--rad);" + extra);
  }

  function attHistory(studentIdArg: string) {
    return pastDesc(data, today)
      .slice()
      .reverse()
      .map((l) => {
        const h = HMAP[l.att[studentIdArg] as AttStatus];
        return {
          key: l.id,
          d: monthDay(l.date),
          mark: h ? h[0] : "–",
          bg: h ? h[1] : "var(--bg)",
          fg: h ? h[2] : mut,
        };
      });
  }

  function renderProfile() {
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <div style={cssx("display:flex;align-items:center;gap:16px;margin:4px 0 18px")}>
          <div style={cssx(`width:58px;height:58px;border-radius:50%;background:${me.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0`)}>
            {initials(me.name)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:24px;margin:0;letter-spacing:-0.02em")}>{me.name}</h1>
            <div style={cssx("color:var(--mut);font-size:13.5px;font-weight:600;margin-top:2px")}>{pct(data, today, me)}% attendance</div>
          </div>
        </div>
        <div style={card("padding:16px 18px;margin-bottom:12px")}>
          <div style={cssx("display:flex;align-items:baseline;gap:8px")}>
            <span style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:40px;font-weight:800;color:var(--acc);line-height:1")}>{streak(data, today, me)}</span>
            <span style={cssx("font-weight:700;font-size:14px")}>day streak</span>
            <span style={cssx("width:10px;height:10px;border-radius:3px;background:var(--amb);margin-left:auto")} />
          </div>
          <div style={cssx("color:var(--mut);font-size:12.5px;margin-top:6px")}>Class leader: {streaks[0].name} · {streaks[0].n} days</div>
        </div>
        <div style={card("padding:16px 18px;margin-bottom:12px")}>
          <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:10px")}>MY ATTENDANCE</div>
          <div style={cssx("display:flex;gap:6px;flex-wrap:wrap")}>
            {attHistory(me.id).map((h) => (
              <div key={h.key} style={{ textAlign: "center" }}>
                <div style={cssx(`width:34px;height:34px;border-radius:9px;background:${h.bg};display:flex;align-items:center;justify-content:center;color:${h.fg};font-weight:800;font-size:12px`)}>{h.mark}</div>
                <div style={cssx("color:var(--mut);font-size:9.5px;font-weight:700;margin-top:3px")}>{h.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card("padding:16px 18px;margin-bottom:12px")}>
          <div style={cssx("display:flex;align-items:center;gap:10px")}>
            <div style={{ flex: 1 }}>
              <div style={cssx("font-weight:700;font-size:14px")}>Appearance</div>
              <div style={cssx("color:var(--mut);font-size:12.5px;margin-top:1px")}>{theme === "light" ? "Light" : "Dark"} mode is on</div>
            </div>
            <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={cssx("background:var(--soft);color:var(--acc);border:none;border-radius:999px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer")}>
              Switch to {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </div>
        <button onClick={() => { setRole("teacher"); go("home"); }} style={cssx("background:transparent;border:1px solid var(--line);border-radius:999px;padding:9px 18px;font-weight:600;font-size:12.5px;color:var(--mut);cursor:pointer")}>
          Return to teacher view
        </button>
      </div>
    );
  }

  function renderHome() {
    const showLiveBanner = isStudent && liveOn;
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <div style={cssx("margin:4px 0 18px")}>
          <div style={cssx("color:var(--mut);font-size:13px;font-weight:600")}>{longDate(today)}</div>
          <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:30px;margin:2px 0 0;letter-spacing:-0.02em")}>Good morning, {userName}</h1>
        </div>

        {showLiveBanner && (
          <button onClick={() => go("live")} style={cssx("display:flex;align-items:center;gap:12px;width:100%;background:var(--acc);color:#fff;border:none;border-radius:var(--rad);padding:14px 18px;margin:0 0 16px;cursor:pointer;text-align:left")}>
            <span style={cssx("width:9px;height:9px;border-radius:50%;background:#fff;animation:livepulse 1s ease infinite alternate")} />
            <span style={cssx("font-weight:700;font-size:15px;flex:1")}>Class is live — join now</span>
            <span style={cssx("font-size:13px;font-weight:600;opacity:.85")}>Open →</span>
          </button>
        )}

        <div style={cssx(`display:grid;grid-template-columns:${homeGrid};gap:16px;align-items:start`)}>
          {today_ && (
            <div style={card("overflow:hidden")}>
              <ImageSlot
                shape="rect"
                placeholder="lesson cover photo"
                src={today_.cards.find((c) => c.type === "image")?.imageUrl}
                style={{ width: "100%", height: 180, display: "block" }}
              />
              <div style={cssx("padding:18px 20px 20px")}>
                <div style={cssx("display:flex;align-items:center;gap:8px;margin-bottom:8px")}>
                  <span style={cssx("background:var(--acc);color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.1em;border-radius:999px;padding:4px 10px")}>TODAY</span>
                  <span style={cssx("color:var(--mut);font-size:13px;font-weight:600")}>{today_.scr}</span>
                </div>
                <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.01em;line-height:1.15")}>{today_.title}</div>
                {today_.prework && (
                  <div style={cssx("margin-top:10px;background:var(--soft);border-radius:10px;padding:10px 12px;font-size:13.5px;color:var(--ink)")}>
                    <b>Prework:</b> {today_.prework}
                  </div>
                )}
                <div style={cssx("display:flex;gap:8px;margin-top:14px;flex-wrap:wrap")}>
                  {isTeacher && (
                    <button onClick={() => go("teach", { lessonId: today_.id })} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:11px 20px;font-weight:700;font-size:14px;cursor:pointer")}>Teach this lesson</button>
                  )}
                  <button onClick={() => go("lesson", { lessonId: today_.id, tab: "outline" })} style={cssx("background:transparent;color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:10px 18px;font-weight:600;font-size:14px;cursor:pointer")}>Open lesson</button>
                </div>
              </div>
            </div>
          )}

          <div style={cssx("display:flex;flex-direction:column;gap:16px")}>
            {next && (
              <button data-hover-acc onClick={() => go("lesson", { lessonId: next.id, tab: "outline" })} style={card("padding:16px 18px;cursor:pointer;text-align:left;color:var(--ink)")}>
                <div style={cssx("display:flex;align-items:center;gap:8px;margin-bottom:6px")}>
                  <span style={cssx("background:var(--soft);color:var(--acc);font-size:10.5px;font-weight:800;letter-spacing:.1em;border-radius:999px;padding:4px 10px")}>NEXT CLASS</span>
                  <span style={cssx("color:var(--mut);font-size:12.5px;font-weight:600")}>{shortDate(next.date)}</span>
                </div>
                <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700;line-height:1.2")}>{next.title}</div>
                <div style={cssx("color:var(--mut);font-size:13px;margin-top:3px;font-weight:600")}>{next.scr}</div>
              </button>
            )}

            {isStudent && (
              <div style={card("padding:16px 18px")}>
                <div style={cssx("display:flex;align-items:baseline;gap:8px")}>
                  <span style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:40px;font-weight:800;color:var(--acc);line-height:1")}>{streak(data, today, me)}</span>
                  <span style={cssx("font-weight:700;font-size:14px")}>day streak</span>
                  <span style={cssx("width:10px;height:10px;border-radius:3px;background:var(--amb);margin-left:auto")} />
                </div>
                <div style={cssx("color:var(--mut);font-size:12.5px;margin-top:6px")}>Class leader: {streaks[0].name} · {streaks[0].n} days</div>
              </div>
            )}

            {isTeacher && (
              <div style={card("padding:16px 18px")}>
                <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:8px")}>ATTENDANCE TODAY</div>
                <div style={cssx("font-weight:700;font-size:15px")}>{attSummary}</div>
                <button onClick={() => go("attendance")} style={cssx("margin-top:10px;background:transparent;color:var(--acc);border:1px solid var(--line);border-radius:999px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer;width:100%")}>Take attendance</button>
                <div style={cssx("border-top:1px solid var(--line);margin:14px 0 10px")} />
                <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:8px")}>TOP STREAKS</div>
                {streaks.slice(0, 3).map((t, i) => (
                  <div key={i} style={cssx("display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13.5px")}>
                    <span style={cssx("width:8px;height:8px;border-radius:2px;background:var(--amb)")} />
                    <span style={cssx("font-weight:600;flex:1")}>{t.name}</span>
                    <span style={cssx("color:var(--mut);font-weight:700")}>{t.n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={cssx("display:flex;align-items:center;margin:26px 0 10px")}>
          <h2 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:19px;margin:0;flex:1")}>Announcements</h2>
          <button onClick={() => go("anns")} style={cssx("background:none;border:none;color:var(--acc);font-weight:700;font-size:13px;cursor:pointer")}>View all →</button>
        </div>
        <div style={cssx("display:flex;flex-direction:column;gap:10px")}>
          {annSort.slice(0, 3).map((a) => (
            <div key={a.id} style={card("padding:14px 18px")}>
              <div style={cssx("display:flex;align-items:center;gap:8px")}>
                {a.pinned && <span style={cssx("background:var(--amb);color:#3A2E00;font-size:10px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:3px 8px")}>PINNED</span>}
                <span style={cssx("font-weight:700;font-size:14.5px;flex:1")}>{a.title}</span>
                <span style={cssx("color:var(--mut);font-size:12px;font-weight:600")}>{monthDay(a.date)}</span>
              </div>
              <div style={cssx("color:var(--mut);font-size:13.5px;margin-top:4px;line-height:1.5")}>{a.body}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderLessons() {
    const rows = data.lessons
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((l) => {
        const isT = l.date === today;
        const isN = !!next && l.id === next.id;
        const isPast = l.date < today;
        const myAtt = l.att[me.id];
        let badge = "",
          bg = "var(--soft)",
          fg = acc;
        if (isT) badge = "TODAY";
        else if (isN) badge = "NEXT";
        else if (isStudent && isPast && (myAtt === "a" || myAtt === "e")) {
          badge = "MISSED";
          bg = "color-mix(in oklab, var(--bad) 12%, var(--card))";
          fg = "var(--bad)";
        }
        return {
          l,
          wk: d(l.date).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
          day: String(d(l.date).getDate()),
          mo: d(l.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
          dayColor: isT ? acc : isPast ? mut : "var(--ink)",
          border: isT ? acc : "var(--line)",
          badge,
          bg,
          fg,
        };
      });
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <div style={cssx("display:flex;align-items:center;margin:4px 0 16px")}>
          <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:26px;margin:0;flex:1;letter-spacing:-0.02em")}>Lessons</h1>
          {isTeacher && (
            <button onClick={() => { const id = actions.addLesson(); go("lesson", { lessonId: id, tab: "outline" }); }} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer")}>+ New lesson</button>
          )}
        </div>
        <div style={cssx("display:flex;flex-direction:column;gap:10px")}>
          {rows.map((r) => (
            <button key={r.l.id} data-hover-acc onClick={() => go("lesson", { lessonId: r.l.id, tab: "outline" })} style={cssx(`display:flex;align-items:center;gap:16px;background:var(--card);border:1px solid ${r.border};border-radius:var(--rad);padding:14px 18px;cursor:pointer;text-align:left;color:var(--ink);width:100%`)}>
              <div style={cssx("text-align:center;width:44px;flex-shrink:0")}>
                <div style={cssx("font-size:10px;font-weight:800;letter-spacing:.1em;color:var(--mut)")}>{r.wk}</div>
                <div style={cssx(`font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;line-height:1.05;color:${r.dayColor}`)}>{r.day}</div>
                <div style={cssx("font-size:10px;font-weight:800;letter-spacing:.1em;color:var(--mut)")}>{r.mo}</div>
              </div>
              <div style={cssx("flex:1;min-width:0")}>
                <div style={cssx("font-weight:700;font-size:15px;line-height:1.25")}>{r.l.title}</div>
                <div style={cssx("color:var(--mut);font-size:13px;font-weight:600;margin-top:2px")}>{r.l.scr}</div>
              </div>
              {r.badge && <span style={cssx(`background:${r.bg};color:${r.fg};font-size:10.5px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:4px 10px;flex-shrink:0`)}>{r.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderTeacherLesson() {
    if (!lesson) return null;
    const tabsDef: [typeof tab, string][] = [
      ["outline", "My outline"],
      ["manual", "Manual"],
      ["focus", "Focus cards"],
      ["engage", "Engage"],
      ["prework", "Prework"],
    ];
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <button onClick={() => go("lessons")} style={cssx("background:none;border:none;color:var(--mut);font-weight:700;font-size:13px;cursor:pointer;padding:0;margin-bottom:12px")}>← Lessons</button>
        <div style={card("overflow:hidden;margin-bottom:14px")}>
          <ImageSlot
            shape="rect"
            editable
            placeholder="lesson cover photo"
            src={lesson.cards.find((c) => c.type === "image")?.imageUrl}
            onPick={(url) => {
              const imgCard = lesson.cards.find((c) => c.type === "image");
              if (imgCard) actions.setCardImage(lesson.id, imgCard.id, url, "img");
            }}
            style={{ width: "100%", height: 150, display: "block" }}
          />
          <div style={cssx("padding:16px 20px 18px")}>
            <div style={cssx("display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px")}>
              <input type="date" value={lesson.date} onChange={(e) => e.target.value && actions.updateLesson(lesson.id, { date: e.target.value })} style={cssx("background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:7px 10px;font-size:13px;font-weight:600;color:var(--ink)")} />
              <input value={lesson.scr} onChange={(e) => actions.updateLesson(lesson.id, { scr: e.target.value })} placeholder="Scripture block" style={cssx("background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:7px 10px;font-size:13px;font-weight:600;color:var(--ink);width:170px")} />
              <button onClick={() => go("teach", { lessonId: lesson.id })} style={cssx("margin-left:auto;background:var(--acc);color:#fff;border:none;border-radius:999px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer")}>Teach →</button>
            </div>
            <input value={lesson.title} onChange={(e) => actions.updateLesson(lesson.id, { title: e.target.value })} style={cssx("width:100%;background:transparent;border:none;outline:none;font-family:'Bricolage Grotesque',sans-serif;font-size:23px;font-weight:800;color:var(--ink);padding:0;letter-spacing:-0.01em")} />
          </div>
        </div>

        <div style={cssx("display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px")}>
          {tabsDef.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={cssx(`background:${tab === id ? "var(--acc)" : "var(--card)"};color:${tab === id ? "#fff" : "var(--mut)"};border:1px solid ${tab === id ? "var(--acc)" : "var(--line)"};border-radius:999px;padding:8px 15px;font-weight:700;font-size:13px;cursor:pointer`)}>{label}</button>
          ))}
        </div>

        {tab === "outline" && (
          <>
            <div style={card("overflow:hidden")}>
              <div style={cssx("display:flex;gap:4px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--bg)")}>
                {rteBtns.map((b, i) => (
                  <button key={i} onClick={b.onClick} style={cssx("background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 11px;font-size:12.5px;font-weight:700;color:var(--ink);cursor:pointer")}>{b.label}</button>
                ))}
              </div>
              <div
                data-rte
                ref={outEl}
                contentEditable
                suppressContentEditableWarning
                onInput={() => lesson && outEl.current && actions.updateLesson(lesson.id, { outline: outEl.current.innerHTML })}
                style={cssx("min-height:280px;padding:16px 20px;font-size:15px;line-height:1.65")}
              />
            </div>
            <div style={cssx("color:var(--mut);font-size:12.5px;margin-top:8px")}>Select text, then use the toolbar. Your outline saves automatically.</div>
          </>
        )}

        {tab === "manual" &&
          (lesson.manual ? (
            <div style={card("padding:20px 22px")}>
              <div style={cssx("display:flex;align-items:center;margin-bottom:10px")}>
                <span style={cssx("background:var(--soft);color:var(--acc);font-size:10.5px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:4px 10px")}>IMPORTED · TEACHER MANUAL</span>
                <button onClick={() => actions.importManual(lesson.id)} style={cssx("margin-left:auto;background:none;border:none;color:var(--mut);font-weight:700;font-size:12.5px;cursor:pointer")}>Re-import</button>
              </div>
              <div style={cssx("white-space:pre-wrap;font-size:14.5px;line-height:1.65")}>{lesson.manual}</div>
            </div>
          ) : (
            <div style={card("border:1px dashed var(--line);padding:36px 24px;text-align:center")}>
              <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700;margin-bottom:6px")}>No manual lesson imported yet</div>
              <div style={cssx("color:var(--mut);font-size:13.5px;max-width:400px;margin:0 auto 16px")}>Pull the full lesson plan for {lesson.scr} from the seminary teacher manual, then build your own outline from it.</div>
              <button onClick={() => { actions.importManual(lesson.id); showToast("Lesson imported from the teacher manual"); }} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:11px 20px;font-weight:700;font-size:14px;cursor:pointer")}>Import from churchofjesuschrist.org</button>
            </div>
          ))}

        {tab === "focus" && renderFocusTab()}
        {tab === "engage" && renderEngageTab()}

        {tab === "prework" && (
          <div style={card("padding:18px 20px")}>
            <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:10px")}>PREWORK ASSIGNMENT</div>
            <textarea value={lesson.prework} onChange={(e) => actions.updateLesson(lesson.id, { prework: e.target.value })} rows={4} placeholder="What should students do before class?" style={cssx("width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:14px;color:var(--ink);resize:vertical;line-height:1.6")} />
            <div style={cssx("color:var(--mut);font-size:12.5px;margin-top:8px")}>Students see this on their home screen and on the lesson page.</div>
          </div>
        )}
      </div>
    );
  }

  function renderFocusTab() {
    if (!lesson) return null;
    return (
      <>
        <div style={cssx("color:var(--mut);font-size:12.5px;margin-bottom:8px")}>Drag the ⠿ handle to reorder — this sets the &quot;Reveal next&quot; sequence.</div>
        <div ref={cardsListRef} style={cssx("display:flex;flex-direction:column;gap:10px")}>
          {lesson.cards.map((c) => {
            const ch = typeChip(c.type);
            return (
              <div key={c.id} data-cardid={c.id} style={cssx(`background:var(--card);border:1px solid ${c.visible ? "var(--acc)" : "var(--line)"};border-radius:var(--rad);padding:16px 18px;opacity:${dragCardId === c.id ? 0.5 : 1};touch-action:pan-y`)}>
                <div style={cssx("display:flex;align-items:center;gap:8px;margin-bottom:8px")}>
                  <span onPointerDown={(e) => startCardDrag(e, c.id)} title="Drag to reorder" style={cssx("cursor:grab;color:var(--mut);font-size:17px;line-height:1;user-select:none;touch-action:none;padding:2px 2px;margin-left:-2px")}>⠿</span>
                  <span style={cssx(`background:${ch.bg};color:${ch.fg};font-size:10.5px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:4px 10px`)}>{ch.label}</span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => { actions.toggleCard(lesson.id, c.id); showToast(!c.visible ? "Card revealed to class" : "Card hidden"); }} style={cssx(`background:${c.visible ? "var(--acc)" : "var(--bg)"};color:${c.visible ? "#fff" : "var(--mut)"};border:none;border-radius:999px;padding:6px 14px;font-weight:700;font-size:12.5px;cursor:pointer`)}>{c.visible ? "Visible" : "Hidden"}</button>
                  <button onClick={() => actions.deleteCard(lesson.id, c.id)} style={cssx("background:transparent;border:1px solid var(--line);border-radius:999px;width:29px;height:29px;color:var(--mut);cursor:pointer;font-size:14px;line-height:1")}>×</button>
                </div>
                <div style={cssx("font-weight:700;font-size:16px")}>{c.title}</div>
                <div style={cssx("color:var(--mut);font-size:14px;margin-top:4px;line-height:1.55")}>{c.body}</div>
                {c.img && (
                  <ImageSlot shape="rounded" radius={12} editable placeholder="card image" src={c.imageUrl} onPick={(url) => actions.setCardImage(lesson.id, c.id, url, "img")} style={{ width: "100%", height: 150, display: "block", marginTop: 10 }} />
                )}
                {c.author && (
                  <div style={cssx("display:flex;align-items:center;gap:10px;margin-top:10px")}>
                    <ImageSlot shape="circle" editable placeholder="photo" src={c.authorImageUrl} onPick={(url) => actions.setCardImage(lesson.id, c.id, url, "author")} style={{ width: 38, height: 38, display: "block", flexShrink: 0 }} />
                    <span style={cssx("font-weight:600;font-size:13.5px;color:var(--mut)")}>{c.author}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={cssx("background:var(--soft);border-radius:var(--rad);padding:16px 18px;margin-top:14px")}>
          <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--acc);margin-bottom:10px")}>ADD FOCUS CARD</div>
          <div style={cssx("display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px")}>
            <select value={cardType} onChange={(e) => setCardType(e.target.value as CardType)} style={cssx("background:var(--card);border:1px solid var(--line);border-radius:9px;padding:8px 10px;font-size:13px;font-weight:600;color:var(--ink)")}>
              <option value="quote">Quote</option>
              <option value="scripture">Scripture</option>
              <option value="activity">Activity</option>
              <option value="image">Image</option>
            </select>
            <input value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} placeholder="Title or quote text" style={cssx("flex:1;min-width:160px;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:8px 12px;font-size:13.5px;color:var(--ink)")} />
          </div>
          <textarea value={cardBody} onChange={(e) => setCardBody(e.target.value)} placeholder="Body — instructions, question, or context" rows={2} style={cssx("width:100%;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:8px 12px;font-size:13.5px;color:var(--ink);resize:vertical;margin-bottom:8px")} />
          <div style={cssx("display:flex;gap:8px;flex-wrap:wrap")}>
            <input value={cardAuthor} onChange={(e) => setCardAuthor(e.target.value)} placeholder="Author (for quotes)" style={cssx("flex:1;min-width:150px;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:8px 12px;font-size:13.5px;color:var(--ink)")} />
            <button onClick={addCard} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer")}>Add card</button>
          </div>
        </div>
      </>
    );
  }

  function renderEngageTab() {
    if (!lesson) return null;
    const chatOn = lesson.chatOpen;
    const chatAnonOn = lesson.chatAnon;
    return (
      <div style={cssx("display:flex;flex-direction:column;gap:14px")}>
        {/* Polls */}
        <div style={card("padding:18px 20px")}>
          <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:12px")}>POLLS</div>
          {lesson.polls.map((p) => {
            const total = p.votes.reduce((a, b) => a + b, 0);
            return (
              <div key={p.id} style={cssx("border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:10px")}>
                <div style={cssx("font-weight:700;font-size:14.5px;margin-bottom:8px")}>{p.q}</div>
                <div style={cssx("display:flex;gap:6px;margin-bottom:10px")}>
                  <button onClick={() => actions.togglePollAnon(lesson.id, p.id)} style={cssx(`background:${p.anon ? "var(--soft)" : "var(--bg)"};color:${p.anon ? "var(--acc)" : "var(--mut)"};border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-weight:700;font-size:12px;cursor:pointer`)}>{p.anon ? "Anonymous" : "Public"}</button>
                  <button onClick={() => actions.togglePollOpen(lesson.id, p.id)} style={cssx(`background:${p.open ? "var(--acc)" : "var(--bg)"};color:${p.open ? "#fff" : "var(--mut)"};border:1px solid var(--line);border-radius:999px;padding:5px 12px;font-weight:700;font-size:12px;cursor:pointer`)}>{p.open ? "Open" : "Closed"}</button>
                  <span style={cssx("margin-left:auto;color:var(--mut);font-size:12.5px;font-weight:600;align-self:center")}>{total} votes</span>
                </div>
                {p.opts.map((o, i) => (
                  <div key={i} style={cssx("position:relative;border:1px solid var(--line);border-radius:9px;margin-bottom:6px;overflow:hidden")}>
                    <div style={cssx(`position:absolute;top:0;left:0;bottom:0;width:${total ? Math.round((p.votes[i] * 100) / total) : 0}%;background:var(--soft)`)} />
                    <div style={cssx("position:relative;display:flex;padding:8px 12px;font-size:13.5px")}>
                      <span style={cssx("font-weight:600;flex:1")}>{o}</span>
                      <span style={cssx("color:var(--mut);font-weight:700")}>{p.votes[i]}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <div style={cssx("background:var(--bg);border-radius:12px;padding:12px 14px")}>
            <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="New poll question" style={cssx("width:100%;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:8px 12px;font-size:13.5px;color:var(--ink);margin-bottom:7px")} />
            <input value={pollOpts} onChange={(e) => setPollOpts(e.target.value)} placeholder="Options, separated by commas" style={cssx("width:100%;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:8px 12px;font-size:13.5px;color:var(--ink);margin-bottom:8px")} />
            <div style={cssx("display:flex;gap:8px;align-items:center")}>
              <button onClick={() => setPollAnon(!pollAnon)} style={cssx(`background:${pollAnon ? "var(--soft)" : "var(--card)"};color:${pollAnon ? "var(--acc)" : "var(--mut)"};border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-weight:700;font-size:12px;cursor:pointer`)}>{pollAnon ? "Anonymous" : "Public"}</button>
              <button onClick={addPoll} style={cssx("margin-left:auto;background:var(--acc);color:#fff;border:none;border-radius:999px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer")}>Add poll</button>
            </div>
          </div>
        </div>

        {/* Chat board */}
        <div style={card("padding:18px 20px")}>
          <div style={cssx("display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap")}>
            <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);flex:1")}>CHAT BOARD</div>
            <button onClick={() => { actions.toggleChatAnon(lesson.id); showToast(!chatAnonOn ? "Chat is now anonymous" : "Chat shows names"); }} style={cssx(`background:${chatAnonOn ? "var(--soft)" : "var(--bg)"};color:${chatAnonOn ? "var(--acc)" : "var(--mut)"};border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-weight:700;font-size:12px;cursor:pointer`)}>{chatAnonOn ? "Anonymous" : "Named"}</button>
            <button onClick={() => actions.toggleChatOpen(lesson.id)} style={cssx(`background:${chatOn ? "var(--acc)" : "var(--bg)"};color:${chatOn ? "#fff" : "var(--mut)"};border:none;border-radius:999px;padding:6px 14px;font-weight:700;font-size:12.5px;cursor:pointer`)}>{chatOn ? "Open" : "Closed"}</button>
          </div>
          {lesson.posts.map((m, i) => (
            <div key={m.id || i} style={cssx("display:flex;gap:8px;padding:5px 0;font-size:13.5px")}>
              <span style={cssx("font-weight:700;flex-shrink:0")}>{m.n}</span>
              <span style={cssx("color:var(--ink);flex:1")}>{m.t}</span>
              <span style={cssx("color:var(--mut);font-size:11.5px;flex-shrink:0")}>{m.at}</span>
            </div>
          ))}
        </div>

        {/* Random groups */}
        <div style={card("padding:18px 20px")}>
          <div style={cssx("display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap")}>
            <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);flex:1")}>RANDOM GROUPS · {presentStudents.length} PRESENT</div>
            <input type="number" min={2} max={6} value={data.groups.count} onChange={(e) => actions.setGroupCount(parseInt(e.target.value))} style={cssx("width:56px;background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:7px 10px;font-size:13px;font-weight:700;color:var(--ink)")} />
            <button onClick={shuffleGroups} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer")}>Shuffle groups</button>
            <button onClick={() => actions.toggleGroupsVisible()} style={cssx(`background:${data.groups.visible ? "var(--acc)" : "var(--card)"};color:${data.groups.visible ? "#fff" : "var(--mut)"};border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-weight:700;font-size:12.5px;cursor:pointer`)}>{data.groups.visible ? "Visible to class" : "Hidden"}</button>
          </div>
          <div style={cssx("display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px")}>
            {data.groups.list.map((g, i) => (
              <div key={i} style={cssx("background:var(--bg);border-radius:12px;padding:12px 14px")}>
                <div style={cssx("font-weight:800;font-size:12px;color:var(--acc);letter-spacing:.06em;margin-bottom:6px")}>GROUP {i + 1}</div>
                <div style={cssx("font-size:13px;line-height:1.6;font-weight:500")}>{g.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStudentLesson() {
    if (!lesson) return null;
    const wasAbsent = lesson.date <= today && (lesson.att[me.id] === "a" || lesson.att[me.id] === "e");
    const visCards = lesson.cards.filter((c) => c.visible);
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <button onClick={() => go("lessons")} style={cssx("background:none;border:none;color:var(--mut);font-weight:700;font-size:13px;cursor:pointer;padding:0;margin-bottom:12px")}>← Lessons</button>
        <div style={card("overflow:hidden;margin-bottom:14px")}>
          <ImageSlot shape="rect" placeholder="lesson cover photo" src={lesson.cards.find((c) => c.type === "image")?.imageUrl} style={{ width: "100%", height: 170, display: "block" }} />
          <div style={cssx("padding:16px 20px 18px")}>
            <div style={cssx("color:var(--mut);font-size:13px;font-weight:600")}>{shortDate(lesson.date)} · {lesson.scr}</div>
            <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.01em;margin-top:2px")}>{lesson.title}</div>
          </div>
        </div>
        {lesson.prework && (
          <div style={cssx("background:var(--soft);border-radius:var(--rad);padding:14px 18px;margin-bottom:14px;font-size:14px;line-height:1.55")}><b>Prework:</b> {lesson.prework}</div>
        )}
        {wasAbsent && (
          <div style={cssx("background:var(--card);border:1px solid var(--amb);border-radius:var(--rad);padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
            <span style={cssx("font-size:14px;font-weight:600;flex:1")}>You missed this lesson — submit makeup work to keep your streak.</span>
            <button onClick={() => { setMkLesson(lesson.id); go("makeup"); }} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer")}>Do makeup work</button>
          </div>
        )}
        {visCards.length > 0 && (
          <>
            <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin:0 0 10px")}>FROM CLASS</div>
            <div style={cssx("display:flex;flex-direction:column;gap:10px")}>
              {visCards.map((c) => {
                const ch = typeChip(c.type);
                return (
                  <div key={c.id} style={card("padding:18px 20px")}>
                    <span style={cssx(`background:${ch.bg};color:${ch.fg};font-size:10.5px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:4px 10px`)}>{ch.label}</span>
                    <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:18px;margin-top:8px;line-height:1.3")}>{c.title}</div>
                    <div style={cssx("color:var(--mut);font-size:14px;margin-top:4px;line-height:1.55")}>{c.body}</div>
                    {c.img && <ImageSlot shape="rounded" radius={12} src={c.imageUrl} placeholder="card image" style={{ width: "100%", height: 170, display: "block", marginTop: 10 }} />}
                    {c.author && (
                      <div style={cssx("display:flex;align-items:center;gap:10px;margin-top:12px")}>
                        <ImageSlot shape="circle" src={c.authorImageUrl} placeholder="photo" style={{ width: 38, height: 38, display: "block", flexShrink: 0 }} />
                        <span style={cssx("font-weight:600;font-size:13.5px;color:var(--mut)")}>{c.author}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderTeach() {
    if (!lesson) return null;
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <button onClick={() => go("lesson")} style={cssx("background:none;border:none;color:var(--mut);font-weight:700;font-size:13px;cursor:pointer;padding:0;margin-bottom:12px")}>← Lesson</button>
        <div style={cssx("display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px")}>
          <div style={cssx("flex:1;min-width:200px")}>
            <div style={cssx("color:var(--mut);font-size:12.5px;font-weight:700;letter-spacing:.08em")}>TEACH MODE · {shortDate(lesson.date)}</div>
            <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:24px;margin:2px 0 0;letter-spacing:-0.02em")}>{lesson.title}</h1>
          </div>
          <button onClick={() => { actions.toggleLive(lesson.id); showToast(!lesson.live ? "Class is live — students can join" : "Class ended"); }} style={cssx(`background:${lesson.live ? "var(--bad)" : "var(--ok)"};color:#fff;border:none;border-radius:999px;padding:12px 22px;font-weight:800;font-size:14px;cursor:pointer`)}>{lesson.live ? "■ End class" : "▶ Start class"}</button>
        </div>

        <button onClick={doRevealNext} style={cssx("width:100%;background:var(--acc);color:#fff;border:none;border-radius:var(--rad);padding:15px;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:10px")}>Reveal next focus card →</button>

        <div data-hscroll style={cssx("display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;margin-bottom:12px;-webkit-overflow-scrolling:touch")}>
          {lesson.cards.map((c, i) => (
            <button key={c.id} onClick={() => actions.toggleCard(lesson.id, c.id)} style={cssx(`flex-shrink:0;width:172px;background:var(--card);border:1.5px solid ${c.visible ? "var(--acc)" : "var(--line)"};border-radius:var(--rad);padding:12px 14px;cursor:pointer;text-align:left;color:var(--ink)`)}>
              <div style={cssx("display:flex;align-items:center;gap:8px;margin-bottom:6px")}>
                <span style={cssx(`font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;color:${c.visible ? "var(--acc)" : "var(--mut)"}`)}>{i + 1}</span>
                <span style={cssx("color:var(--mut);font-size:10px;font-weight:800;letter-spacing:.06em;flex:1")}>{typeChip(c.type).label}</span>
                <span style={cssx(`background:${c.visible ? "var(--acc)" : "var(--bg)"};color:${c.visible ? "#fff" : "var(--ink)"};border-radius:999px;padding:4px 10px;font-weight:800;font-size:10.5px;white-space:nowrap`)}>{c.visible ? "LIVE" : "REVEAL"}</span>
              </div>
              <div style={cssx("font-weight:700;font-size:13px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{c.title}</div>
            </button>
          ))}
        </div>

        <div style={cssx(`display:grid;grid-template-columns:${teachGrid};gap:16px;align-items:start`)}>
          <div style={{ minWidth: 0 }}>
            <div style={card("overflow:hidden")}>
              <button onClick={() => setShowOutline(!showOutline)} style={cssx("display:flex;align-items:center;width:100%;background:none;border:none;padding:14px 18px;cursor:pointer;color:var(--ink)")}>
                <span style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);flex:1;text-align:left")}>MY OUTLINE</span>
                <span style={cssx("color:var(--acc);font-weight:800;font-size:13px")}>{showOutline ? "Hide" : "Show"}</span>
              </button>
              {showOutline &&
                (lesson.outline ? (
                  <div data-rte style={cssx("padding:0 18px 16px;font-size:14.5px;line-height:1.65")} dangerouslySetInnerHTML={{ __html: lesson.outline }} />
                ) : (
                  <div style={cssx("padding:0 18px 16px;color:var(--mut);font-size:13.5px")}>No outline yet — write one in the lesson editor&apos;s &quot;My outline&quot; tab.</div>
                ))}
            </div>
          </div>

          <div style={cssx("display:flex;flex-direction:column;gap:12px;min-width:0")}>
            <button onClick={() => go("attendance")} style={card("display:flex;align-items:center;padding:14px 16px;cursor:pointer;text-align:left;color:var(--ink)")}>
              <div style={{ flex: 1 }}>
                <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut)")}>ATTENDANCE</div>
                <div style={cssx("font-weight:700;font-size:14px;margin-top:2px")}>{attSummary}</div>
              </div>
              <span style={cssx("color:var(--acc);font-weight:800")}>→</span>
            </button>
            <div style={card("padding:14px 16px")}>
              <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:10px")}>LIVE CONTROLS</div>
              <div style={cssx("display:flex;flex-direction:column;gap:8px")}>
                <div style={cssx("display:flex;align-items:center;gap:8px")}>
                  <span style={cssx("font-weight:600;font-size:13.5px;flex:1")}>Chat board</span>
                  <button onClick={() => { actions.toggleChatAnon(lesson.id); showToast(!lesson.chatAnon ? "Chat is now anonymous" : "Chat shows names"); }} style={cssx(`background:${lesson.chatAnon ? "var(--soft)" : "var(--bg)"};color:${lesson.chatAnon ? "var(--acc)" : "var(--mut)"};border:1px solid var(--line);border-radius:999px;padding:6px 11px;font-weight:700;font-size:11.5px;cursor:pointer`)}>{lesson.chatAnon ? "Anonymous" : "Named"}</button>
                  <button onClick={() => actions.toggleChatOpen(lesson.id)} style={cssx(`background:${lesson.chatOpen ? "var(--acc)" : "var(--bg)"};color:${lesson.chatOpen ? "#fff" : "var(--mut)"};border:none;border-radius:999px;padding:6px 12px;font-weight:700;font-size:11.5px;cursor:pointer`)}>{lesson.chatOpen ? "Open" : "Closed"}</button>
                </div>
                <div style={cssx("display:flex;align-items:center;gap:8px")}>
                  <span style={cssx("font-weight:600;font-size:13.5px;flex:1")}>Random groups</span>
                  <button onClick={shuffleGroups} style={cssx("background:var(--bg);color:var(--mut);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-weight:700;font-size:11.5px;cursor:pointer")}>Shuffle</button>
                  <button onClick={() => actions.toggleGroupsVisible()} style={cssx(`background:${data.groups.visible ? "var(--acc)" : "var(--bg)"};color:${data.groups.visible ? "#fff" : "var(--mut)"};border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-weight:700;font-size:11.5px;cursor:pointer`)}>{data.groups.visible ? "Shown" : "Hidden"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderLive() {
    const liveCards =
      liveOn && liveL
        ? liveL.cards.filter((c) => c.visible).slice().reverse()
        : [];
    const livePolls = liveOn && liveL ? liveL.polls.filter((p) => p.open) : [];
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <div style={cssx("display:flex;align-items:center;gap:10px;margin:4px 0 14px")}>
          <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:26px;margin:0;flex:1;letter-spacing:-0.02em")}>Live</h1>
          {liveOn && <span style={cssx("display:flex;align-items:center;gap:6px;background:var(--soft);color:var(--acc);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:800")}><span style={cssx("width:8px;height:8px;border-radius:50%;background:var(--acc);animation:livepulse 1s ease infinite alternate")} />LIVE</span>}
        </div>

        {liveOn ? (
          <>
            {liveL && liveL.prework && (
              <div style={cssx("background:var(--soft);border-radius:var(--rad);padding:14px 18px;margin-bottom:12px;font-size:14px;line-height:1.55")}><b>Prework:</b> {liveL.prework}</div>
            )}
            {liveCards.length === 0 && livePolls.length === 0 && !(liveL && liveL.chatOpen) && (
              <div style={cssx("color:var(--mut);font-size:14px;padding:8px 0 16px")}>Waiting for your teacher to reveal the first focus card…</div>
            )}
            <div style={cssx("display:flex;flex-direction:column;gap:10px")}>
              {liveCards.map((c, i) => {
                const ch = typeChip(c.type);
                return (
                  <div key={c.id} style={cssx(`background:var(--card);border:1.5px solid ${i === 0 ? "var(--acc)" : "var(--line)"};border-radius:var(--rad);padding:20px 22px`)}>
                    <span style={cssx(`background:${ch.bg};color:${ch.fg};font-size:10.5px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:4px 10px`)}>{ch.label}</span>
                    <div style={cssx(`font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:${c.type === "scripture" || c.type === "quote" ? "24px" : "19px"};margin-top:10px;line-height:1.3`)}>{c.title}</div>
                    <div style={cssx("color:var(--mut);font-size:14.5px;margin-top:6px;line-height:1.55")}>{c.body}</div>
                    {c.img && <ImageSlot shape="rounded" radius={12} src={c.imageUrl} placeholder="image" style={{ width: "100%", height: 200, display: "block", marginTop: 12 }} />}
                    {c.author && (
                      <div style={cssx("display:flex;align-items:center;gap:10px;margin-top:12px")}>
                        <ImageSlot shape="circle" src={c.authorImageUrl} placeholder="photo" style={{ width: 40, height: 40, display: "block", flexShrink: 0 }} />
                        <span style={cssx("font-weight:700;font-size:14px")}>{c.author}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {livePolls.map((p) => {
              const total = p.votes.reduce((a, b) => a + b, 0);
              const voted = p.myVote != null;
              return (
                <div key={p.id} style={card("padding:18px 20px;margin-top:12px")}>
                  <div style={cssx("display:flex;align-items:center;gap:8px;margin-bottom:10px")}>
                    <span style={cssx("background:var(--soft);color:var(--acc);font-size:10.5px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:4px 10px")}>POLL · {p.anon ? "ANONYMOUS" : "PUBLIC"}</span>
                    <span style={cssx("margin-left:auto;color:var(--mut);font-size:12.5px;font-weight:600")}>{total} votes</span>
                  </div>
                  <div style={cssx("font-weight:700;font-size:16px;margin-bottom:10px")}>{p.q}</div>
                  {p.opts.map((o, i) => (
                    <button key={i} onClick={() => actions.votePoll(liveL!.id, p.id, i)} style={cssx(`position:relative;display:block;width:100%;border:1.5px solid ${p.myVote === i ? "var(--acc)" : "var(--line)"};border-radius:10px;margin-bottom:7px;overflow:hidden;background:var(--card);cursor:pointer;text-align:left;padding:0;color:var(--ink)`)}>
                      <span style={cssx(`position:absolute;top:0;left:0;bottom:0;width:${voted && total ? Math.round((p.votes[i] * 100) / total) : 0}%;background:var(--soft)`)} />
                      <span style={cssx("position:relative;display:flex;padding:11px 14px;font-size:14px")}>
                        <span style={cssx("font-weight:600;flex:1")}>{o}</span>
                        {voted && <span style={cssx("color:var(--mut);font-weight:700")}>{p.votes[i]}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

            {liveL && liveL.chatOpen && (
              <div style={card("padding:18px 20px;margin-top:12px")}>
                <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:10px")}>CHAT BOARD</div>
                {liveL.posts.map((m, i) => (
                  <div key={m.id || i} style={cssx("display:flex;gap:8px;padding:5px 0;font-size:14px")}>
                    <span style={cssx("font-weight:700;flex-shrink:0")}>{m.n}</span>
                    <span style={{ flex: 1 }}>{m.t}</span>
                    <span style={cssx("color:var(--mut);font-size:11.5px;flex-shrink:0")}>{m.at}</span>
                  </div>
                ))}
                <div style={cssx("display:flex;gap:8px;margin-top:10px")}>
                  <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") postChat(); }} placeholder="Share your answer…" style={cssx("flex:1;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:10px 16px;font-size:14px;color:var(--ink)")} />
                  <button onClick={postChat} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:10px 18px;font-weight:700;font-size:13.5px;cursor:pointer")}>Post</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={card("border:1px dashed var(--line);padding:48px 24px;text-align:center;margin-top:8px")}>
            <div style={cssx("width:12px;height:12px;border-radius:50%;background:var(--line);margin:0 auto 12px")} />
            <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700")}>Class isn&apos;t live right now</div>
            <div style={cssx("color:var(--mut);font-size:13.5px;margin-top:5px")}>Focus cards, polls, and the chat board will appear here when class starts.</div>
          </div>
        )}
      </div>
    );
  }

  function renderAttendance() {
    const attDefs: [AttStatus, string, string, string][] = [
      ["p", "Present", "var(--ok)", "#fff"],
      ["t", "Tardy", "var(--amb)", "#3A2E00"],
      ["a", "Absent", "var(--bad)", "#fff"],
      ["e", "Excused", "var(--mut)", "#fff"],
    ];
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <div style={cssx("display:flex;align-items:center;gap:10px;margin:4px 0 6px;flex-wrap:wrap")}>
          <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:26px;margin:0;letter-spacing:-0.02em;flex:1")}>Attendance</h1>
          <button onClick={() => { if (today_) { actions.markAllPresent(today_.id); showToast("Everyone marked present"); } }} style={cssx("background:transparent;color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:8px 15px;font-weight:700;font-size:13px;cursor:pointer")}>Mark all present</button>
        </div>
        <div style={cssx("color:var(--mut);font-size:13.5px;font-weight:600;margin-bottom:14px")}>{today_ ? longDate(today_.date) + " · " + today_.title : "No class today"}</div>
        <div style={cssx("display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap")}>
          <span style={cssx("background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:700;color:var(--ok)")}>{ap} present</span>
          <span style={cssx("background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:700;color:color-mix(in oklab, var(--amb) 60%, var(--ink))")}>{at} tardy</span>
          <span style={cssx("background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:700;color:var(--bad)")}>{aa} absent</span>
          <span style={cssx("background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:700;color:var(--mut)")}>{ae} excused · {data.students.length - marked} unmarked</span>
        </div>
        <div style={cssx("display:flex;flex-direction:column;gap:8px")}>
          {data.students.map((s) => {
            const v = today_ ? today_.att[s.id] : undefined;
            return (
              <div key={s.id} style={cssx("display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:10px 14px;flex-wrap:wrap")}>
                <div style={cssx(`width:38px;height:38px;border-radius:50%;background:${s.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13.5px;flex-shrink:0`)}>{initials(s.name)}</div>
                <div style={cssx("flex:1;min-width:110px")}>
                  <div style={cssx("font-weight:700;font-size:14px;line-height:1.2")}>{s.name}</div>
                  <div style={cssx("display:flex;align-items:center;gap:5px;margin-top:2px")}>
                    <span style={cssx("width:7px;height:7px;border-radius:2px;background:var(--amb)")} />
                    <span style={cssx("color:var(--mut);font-size:11.5px;font-weight:700")}>{streak(data, today, s)}-day streak</span>
                  </div>
                </div>
                <div style={cssx("display:flex;gap:6px;flex-wrap:wrap")}>
                  {attDefs.map(([k, label, col, fg]) => {
                    const on = v === k;
                    return (
                      <button key={k} onClick={() => { if (today_) actions.setAttendance(today_.id, s.id, k); }} style={cssx(`background:${on ? col : "transparent"};color:${on ? fg : "var(--mut)"};border:1px solid ${on ? col : "var(--line)"};border-radius:999px;padding:7px 13px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap`)}>{label}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStudents() {
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:26px;margin:4px 0 16px;letter-spacing:-0.02em")}>Students</h1>
        <div style={cssx("display:flex;flex-direction:column;gap:8px")}>
          {data.students.map((s) => (
            <button key={s.id} data-hover-acc onClick={() => go("student", { studentId: s.id })} style={cssx("display:flex;align-items:center;gap:13px;background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:12px 16px;cursor:pointer;text-align:left;color:var(--ink);width:100%")}>
              <div style={cssx(`width:40px;height:40px;border-radius:50%;background:${s.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0`)}>{initials(s.name)}</div>
              <div style={cssx("flex:1;min-width:0")}>
                <div style={cssx("font-weight:700;font-size:14.5px")}>{s.name}</div>
                <div style={cssx("color:var(--mut);font-size:12.5px;font-weight:600")}>{pct(data, today, s)}% attendance</div>
              </div>
              <div style={cssx("display:flex;align-items:center;gap:5px;flex-shrink:0")}>
                <span style={cssx("width:8px;height:8px;border-radius:2px;background:var(--amb)")} />
                <span style={cssx("font-weight:800;font-size:13.5px")}>{streak(data, today, s)}</span>
              </div>
              <span style={cssx("color:var(--mut);font-weight:700")}>›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderStudentDetail() {
    const insights = sd.insights.map((ins) => ({
      ...ins,
      lessonTitle: (L(ins.lessonId) || ({} as Lesson)).title || "Lesson",
    }));
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <button onClick={() => go("students")} style={cssx("background:none;border:none;color:var(--mut);font-weight:700;font-size:13px;cursor:pointer;padding:0;margin-bottom:12px")}>← Students</button>
        <div style={cssx("display:flex;align-items:center;gap:16px;margin-bottom:18px")}>
          <div style={cssx(`width:58px;height:58px;border-radius:50%;background:${sd.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0`)}>{initials(sd.name)}</div>
          <div style={{ flex: 1 }}>
            <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:24px;margin:0;letter-spacing:-0.02em")}>{sd.name}</h1>
            <div style={cssx("color:var(--mut);font-size:13.5px;font-weight:600;margin-top:2px")}>{streak(data, today, sd)}-day streak · {pct(data, today, sd)}% attendance</div>
          </div>
        </div>
        <div style={card("padding:16px 18px;margin-bottom:12px")}>
          <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:10px")}>ATTENDANCE HISTORY</div>
          <div style={cssx("display:flex;gap:6px;flex-wrap:wrap")}>
            {attHistory(sd.id).map((h) => (
              <div key={h.key} style={{ textAlign: "center" }}>
                <div style={cssx(`width:34px;height:34px;border-radius:9px;background:${h.bg};display:flex;align-items:center;justify-content:center;color:${h.fg};font-weight:800;font-size:12px`)}>{h.mark}</div>
                <div style={cssx("color:var(--mut);font-size:9.5px;font-weight:700;margin-top:3px")}>{h.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card("padding:16px 18px;margin-bottom:12px")}>
          <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:10px")}>INSIGHTS &amp; MAKEUP WORK</div>
          {insights.length > 0 ? (
            insights.map((ins, i) => (
              <div key={i} style={cssx("background:var(--bg);border-radius:12px;padding:13px 15px;margin-bottom:8px")}>
                <div style={cssx("font-weight:800;font-size:12.5px;color:var(--acc);margin-bottom:8px")}>{ins.lessonTitle}</div>
                <div style={cssx("font-size:13.5px;line-height:1.55;margin-bottom:6px")}><b>Stood out:</b> {ins.standout}</div>
                <div style={cssx("font-size:13.5px;line-height:1.55;margin-bottom:6px")}><b>Key details:</b> {ins.details}</div>
                <div style={cssx("font-size:13.5px;line-height:1.55;margin-bottom:6px")}><b>What I learn:</b> {ins.learn}</div>
                <div style={cssx("font-size:13.5px;line-height:1.55")}><b>How I&apos;ll apply it:</b> {ins.apply}</div>
              </div>
            ))
          ) : (
            <div style={cssx("color:var(--mut);font-size:13.5px")}>No submissions yet.</div>
          )}
        </div>
        <div style={card("padding:16px 18px")}>
          <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin-bottom:10px")}>TEACHER NOTES · PRIVATE</div>
          <textarea value={sd.notes} onChange={(e) => actions.setNote(sd.id, e.target.value)} rows={3} placeholder="Notes about this student — interests, needs, follow-ups…" style={cssx("width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 13px;font-size:13.5px;color:var(--ink);resize:vertical;line-height:1.6")} />
        </div>
      </div>
    );
  }

  function renderMakeup() {
    const mkOptions = missed.map((l) => ({ id: l.id, label: shortDate(l.date) + " — " + l.title }));
    const myInsights = me.insights.map((ins) => ({
      ...ins,
      lessonTitle: (L(ins.lessonId) || ({} as Lesson)).title || "Lesson",
    }));
    const selLesson = mkLesson || (missed[0] ? missed[0].id : "");
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:26px;margin:4px 0 4px;letter-spacing:-0.02em")}>Makeup work</h1>
        <div style={cssx("color:var(--mut);font-size:13.5px;margin-bottom:16px;line-height:1.55")}>Missed a class? Study the lesson&apos;s scripture block, then answer below to keep your streak alive.</div>
        {mkDone && (
          <div style={cssx("background:var(--soft);border-radius:var(--rad);padding:16px 18px;margin-bottom:14px;font-weight:700;font-size:14.5px;color:var(--acc)")}>Submitted — nice work. {data.cls.teacherName} will review it.</div>
        )}
        {missed.length > 0 ? (
          <div style={card("padding:18px 20px")}>
            <div style={cssx("font-size:12.5px;font-weight:700;margin-bottom:6px")}>Which lesson did you miss?</div>
            <select value={selLesson} onChange={(e) => setMkLesson(e.target.value)} style={cssx("width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:14px;font-weight:600;color:var(--ink);margin-bottom:14px")}>
              {mkOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {[
              [1, "What section or verses stood out to you?"],
              [2, "What key details did you identify?"],
              [3, "What do you learn from those details?"],
              [4, "How can you apply them to your life?"],
            ].map(([n, q]) => (
              <div key={n as number}>
                <div style={cssx("font-size:12.5px;font-weight:700;margin-bottom:6px")}>{q}</div>
                <textarea value={mk[n as number]} onChange={(e) => setMk({ ...mk, [n as number]: e.target.value })} rows={2} style={cssx("width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:14px;color:var(--ink);resize:vertical;margin-bottom:12px;line-height:1.55")} />
              </div>
            ))}
            <button onClick={submitMakeup} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:12px 24px;font-weight:800;font-size:14px;cursor:pointer")}>Submit makeup work</button>
          </div>
        ) : (
          <div style={card("border:1px dashed var(--line);padding:36px 24px;text-align:center")}>
            <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700")}>You&apos;re all caught up</div>
            <div style={cssx("color:var(--mut);font-size:13.5px;margin-top:4px")}>No missed lessons to make up. Keep the streak going.</div>
          </div>
        )}
        {myInsights.length > 0 && (
          <>
            <div style={cssx("font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--mut);margin:18px 0 8px")}>MY SUBMISSIONS</div>
            {myInsights.map((ins, i) => (
              <div key={i} style={card("padding:14px 16px;margin-bottom:8px")}>
                <div style={cssx("font-weight:800;font-size:12.5px;color:var(--acc);margin-bottom:6px")}>{ins.lessonTitle}</div>
                <div style={cssx("font-size:13.5px;line-height:1.55;color:var(--mut)")}><b style={cssx("color:var(--ink)")}>Stood out:</b> {ins.standout}</div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  function renderAnns() {
    return (
      <div style={cssx("animation:rise .35s ease both")}>
        <h1 style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-size:26px;margin:4px 0 16px;letter-spacing:-0.02em")}>Announcements</h1>
        {isTeacher && (
          <div style={cssx("background:var(--soft);border-radius:var(--rad);padding:14px 16px;margin-bottom:14px")}>
            <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Announcement title" style={cssx("width:100%;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:9px 12px;font-size:14px;font-weight:600;color:var(--ink);margin-bottom:7px")} />
            <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Details…" rows={2} style={cssx("width:100%;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:9px 12px;font-size:13.5px;color:var(--ink);resize:vertical;margin-bottom:8px")} />
            <button onClick={addAnn} style={cssx("background:var(--acc);color:#fff;border:none;border-radius:999px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer")}>Post announcement</button>
          </div>
        )}
        <div style={cssx("display:flex;flex-direction:column;gap:10px")}>
          {annSort.map((a) => (
            <div key={a.id} style={card("padding:15px 18px")}>
              <div style={cssx("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                {a.pinned && <span style={cssx("background:var(--amb);color:#3A2E00;font-size:10px;font-weight:800;letter-spacing:.08em;border-radius:999px;padding:3px 8px")}>PINNED</span>}
                <span style={cssx("font-weight:700;font-size:15px;flex:1")}>{a.title}</span>
                <span style={cssx("color:var(--mut);font-size:12px;font-weight:600")}>{monthDay(a.date)}</span>
                {isTeacher && (
                  <>
                    <button onClick={() => actions.togglePin(a.id)} style={cssx("background:transparent;border:1px solid var(--line);border-radius:999px;padding:4px 11px;font-weight:700;font-size:11.5px;color:var(--mut);cursor:pointer")}>{a.pinned ? "Unpin" : "Pin"}</button>
                    <button onClick={() => actions.deleteAnnouncement(a.id)} style={cssx("background:transparent;border:1px solid var(--line);border-radius:999px;width:26px;height:26px;color:var(--mut);cursor:pointer;font-size:13px;line-height:1")}>×</button>
                  </>
                )}
              </div>
              <div style={cssx("color:var(--mut);font-size:13.5px;margin-top:5px;line-height:1.55")}>{a.body}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
