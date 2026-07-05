import type { Data, Lesson, Student, AttStatus } from "./types";

// The canonical "today" for the seeded demo — keeps streaks, badges, and the
// live lesson consistent with the original prototype.
export const TODAY = "2026-07-02";

export const CLASS_NAME = "Old Testament — Job & Psalms";
export const TEACHER_NAME = "Bro. Carter";

// Faithful port of the prototype's seed() so demo mode (and the initial DB
// seed) match the design exactly.
export function seed(): Data {
  const names = [
    "Maya Holt", "Eli Sorensen", "Ava Christensen", "Jonas Peck",
    "Lily Rasmussen", "Caleb Ward", "Nora Bailey", "Owen Tanner",
    "Sadie Larsen", "Miles Draper", "Ruby Nielsen", "Asher Cole",
    "Ivy Madsen", "Levi Burton", "June Okafor",
  ];
  const cols = ["#5A50E6", "#0E8F7E", "#C2571B", "#B84A8E", "#2B7BD1", "#8A6B10", "#C33D3D"];
  const base = [11, 4, 7, 2, 9, 0, 5, 12, 3, 6, 1, 8, 2, 5, 4];

  const students: Student[] = names.map((n, i) => ({
    id: "s" + (i + 1),
    name: n,
    color: cols[i % 7],
    base: base[i],
    notes: "",
    insights: [],
  }));
  students[3].notes =
    "Loves basketball — ask about his tournament. Responds well when invited to read aloud.";
  students[3].insights = [
    {
      lessonId: "l2",
      standout: 'Job 19:25 — "I know that my redeemer liveth."',
      details:
        "Job says this right after losing everything. He has zero evidence things will get better.",
      learn: "Testimony is a choice you keep making, not a feeling that shows up.",
      apply:
        "When things go wrong, say what I DO know out loud instead of listing what I don't.",
      at: "2026-07-01",
    },
  ];
  students[6].notes =
    "Quiet in class but writes thoughtful makeup work. Try a written warm-up question.";

  const P = (skip: Record<string, AttStatus>): Record<string, AttStatus> => {
    const o: Record<string, AttStatus> = {};
    students.forEach((s) => {
      o[s.id] = skip[s.id] || "p";
    });
    return o;
  };

  const lessons: Lesson[] = [
    { id: "l1", date: "2026-06-29", title: "The Lord Gave, and the Lord Hath Taken Away", scr: "Job 1–3", prework: "Read Job 1. Find one thing Job refuses to do, even after losing everything.", outline: "", manual: "", live: false, chatOpen: false, chatAnon: false, posts: [], cards: [], polls: [], att: P({ s6: "a", s11: "e" }) },
    { id: "l2", date: "2026-06-30", title: "I Know That My Redeemer Liveth", scr: "Job 19; 23", prework: "", outline: "", manual: "", live: false, chatOpen: false, chatAnon: false, posts: [], cards: [], polls: [], att: P({ s1: "e", s4: "a", s9: "a" }) },
    { id: "l3", date: "2026-07-01", title: "Out of the Whirlwind", scr: "Job 38–42", prework: "", outline: "", manual: "", live: false, chatOpen: false, chatAnon: false, posts: [], cards: [], polls: [], att: P({ s6: "a" }) },
    {
      id: "l4", date: "2026-07-02", title: "The Lord Is My Shepherd", scr: "Psalms 22–24",
      prework: "Read Psalm 23 twice — once fast, once slowly. Mark the verbs. Come ready to share which verb surprised you.",
      outline: '<p><b>Purpose:</b> help every student trust the Savior as <i>their</i> Shepherd — personally, not abstractly.</p><ul><li><b>Hook (3 min):</b> "Who here has ever been truly lost?" Let 2–3 share.</li><li><b>Read Psalm 23 together</b> — one verse per student, slowly.</li><li>Ask: <mark>which verb did you mark in your prework?</mark></li><li><b>Reveal focus card 1</b> — verse 1. What does "I shall not want" actually promise?</li><li><b>Turn &amp; talk</b> (card 2), then reveal the painting (card 3).</li></ul><blockquote>Shepherds don’t drive sheep — they lead them. The sheep follow because they know the voice.</blockquote><ul><li>Close with the Nelson quote (card 4) + poll. Bear testimony.</li></ul>',
      manual: "", live: false, chatOpen: true, chatAnon: false,
      posts: [
        { n: "Eli Sorensen", t: 'The verb I marked was "restoreth" — He fixes what got broken', at: "6:12 AM" },
        { n: "Sadie Larsen", t: 'v4 — "through the valley," not around it', at: "6:13 AM" },
        { n: "Owen Tanner", t: '"Preparest a table" = He plans ahead for us??', at: "6:14 AM" },
      ],
      cards: [
        { id: "c1", type: "scripture", title: "Psalm 23:1", body: '"The LORD is my shepherd; I shall not want."', author: "", img: false, authorImg: false, visible: true },
        { id: "c2", type: "activity", title: "Turn & Talk", body: "With a partner: what does a shepherd actually do all day? List 3 things a shepherd does that the Savior also does for you.", author: "", img: false, authorImg: false, visible: true },
        { id: "c3", type: "image", title: "The Good Shepherd", body: "Look closely. What details stand out to you? What is the shepherd's posture saying?", author: "", img: true, authorImg: false, visible: false },
        { id: "c4", type: "quote", title: '"The Lord loves effort."', body: "What effort does a sheep actually make? What effort is the Shepherd asking of you this week?", author: "President Russell M. Nelson", img: false, authorImg: true, visible: false },
      ],
      polls: [
        { id: "p1", q: "Which verse of Psalm 23 means the most to you today?", opts: ["v1 — He is my shepherd", "v3 — He restoreth my soul", "v4 — Through the valley", "v6 — Goodness and mercy"], votes: [3, 4, 5, 1], anon: true, open: true, myVote: null },
      ],
      att: { s1: "p", s2: "p", s3: "p", s4: "p", s5: "p", s6: "a", s7: "p", s8: "p", s9: "p", s10: "p" },
    },
    { id: "l5", date: "2026-07-06", title: "Be Still, and Know That I Am God", scr: "Psalms 46; 85; 100", prework: "Read Psalm 46 and mark every promise you find. Bring one to share.", outline: "", manual: "", live: false, chatOpen: false, chatAnon: false, posts: [], cards: [], polls: [], att: {} },
    { id: "l6", date: "2026-07-07", title: "Thy Word Is a Lamp", scr: "Psalms 110; 116–119", prework: "", outline: "", manual: "", live: false, chatOpen: false, chatAnon: false, posts: [], cards: [], polls: [], att: {} },
    { id: "l7", date: "2026-07-08", title: "Praise Ye the Lord", scr: "Psalms 145–150", prework: "", outline: "", manual: "", live: false, chatOpen: false, chatAnon: false, posts: [], cards: [], polls: [], att: {} },
  ];

  const anns = [
    { id: "a1", title: "Temple trip — Friday, July 10", body: "Permission slips due to Bro. Carter by Monday. We leave the stake center at 6:00 AM sharp.", pinned: true, date: "2026-07-01" },
    { id: "a2", title: "Scripture mastery: Psalm 24:3–4", body: "Recite from memory by Friday to claim your spot on the board.", pinned: false, date: "2026-06-30" },
    { id: "a3", title: "Donut Thursday is back", body: "Full class attendance this week = donuts next Thursday. You know what to do.", pinned: false, date: "2026-06-29" },
  ];

  return {
    cls: { id: "demo", name: CLASS_NAME, teacherName: TEACHER_NAME, accent: "#5A50E6", radius: 16 },
    students,
    lessons,
    anns,
    groups: { count: 3, list: [], visible: false },
  };
}

// The seminary teacher-manual text imported by the "Import from
// churchofjesuschrist.org" action in the lesson editor.
export const MANUAL_TEXT =
  'OVERVIEW — PSALMS 22–24\nPsalm 22 prophesies of the Savior’s suffering; Psalm 23 testifies of His watchcare; Psalm 24 asks who may stand in His holy place.\n\nTEACHING SUGGESTIONS\n1. Invite students to silently read Psalm 22:1, 7–8, 16–18 and look for phrases fulfilled at the Crucifixion. Discuss: why would David be shown these things a thousand years early?\n2. Read Psalm 23 aloud as a class. Ask students to choose the image (shepherd, table, cup, house) that best matches their life right now, and why.\n3. Consider displaying an image of a shepherd. Ask: how does a shepherd’s care differ from a hired hand’s? (See John 10:11–14.)\n4. Read Psalm 24:3–4. Invite students to identify what it means to have “clean hands, and a pure heart,” and write one specific way they will seek it this week.\n5. Testify that the Lord knows His sheep by name.\n\nDOCTRINAL MASTERY CONNECTION\nPsalm 24:3–4 supports the doctrinal topic “Ordinances and Covenants.”';
