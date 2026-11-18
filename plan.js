// The plan Gemini drafted (Gemini Pro, Nov 19 2026), lightly edited: tasks kept under 30 characters.
// 7 locks hang on the SUBMIT switch. "theirs" = someone else holds the key.
// steps: [date, stamp] — a step is stamped from the day AFTER its date (on its date it is today's job).
// off: the lock comes off at the end of this day (the frame for that day still shows it, marked "off today").
const DEFAULT_PLAN = {
  goal: "Grad school applications",
  scope: "6 CS programs",
  start: "2026-11-19",
  submit: "2026-12-13",          // internal submit: the switch flips ON
  deadline: "2026-12-15",        // the real deadline (11:59 pm)
  locks: [
    { id: "ets", holder: "ETS", what: "GRE+TOEFL ×6", theirs: true, off: "2026-12-08",
      steps: [["2026-11-19", "ORDERED"], ["2026-11-24", "CHECKED"], ["2026-12-08", "CHECKED"]] },
    { id: "sop", holder: "YOU", what: "SOP ×6", theirs: false, off: "2026-12-10",
      steps: [["2026-11-25", "SOP 1/6"], ["2026-11-30", "SOP 2/6"], ["2026-12-01", "SOP 3/6"], ["2026-12-02", "SOP 4/6"],
              ["2026-12-03", "SOP 5/6"], ["2026-12-04", "SOP 6/6"], ["2026-12-09", "UPLOADED 3/6"], ["2026-12-10", "UPLOADED"]] },
    { id: "lee", holder: "PROF. LEE", what: "LETTER ×6", theirs: true, off: "2026-12-11",
      steps: [["2026-11-21", "INVITED"], ["2026-11-22", "PACKET SENT"], ["2026-11-30", "NUDGED"], ["2026-12-07", "NUDGED ×2"]] },
    { id: "oka", holder: "PROF. OKAFOR", what: "LETTER ×6", theirs: true, off: "2026-12-11",
      steps: [["2026-11-21", "INVITED"], ["2026-11-22", "PACKET SENT"], ["2026-12-01", "NUDGED"], ["2026-12-07", "NUDGED ×2"]] },
    { id: "pat", holder: "DR. PATEL", what: "LETTER ×6", theirs: true, off: "2026-12-11",
      steps: [["2026-11-21", "INVITED"], ["2026-11-22", "PACKET SENT"], ["2026-12-02", "NUDGED"], ["2026-12-08", "NUDGED ×2"]] },
    { id: "reg", holder: "REGISTRAR", what: "TRANSCRIPTS", theirs: true, off: "2026-12-12",
      steps: [["2026-11-20", "REQUESTED"], ["2026-11-24", "CHECKED"]] },
    { id: "cv", holder: "YOU", what: "CV · FORMS · FEES", theirs: false, off: "2026-12-13",
      steps: [["2026-11-23", "CV DONE"], ["2026-12-05", "FORMS 3/6"], ["2026-12-06", "FORMS 6/6"], ["2026-12-13", "SUBMITTED"]] },
  ],
  // one task a day; "locks" = the locks today's task works on
  days: {
    "2026-11-19": ["Order ETS scores to 6 schools", "ets"],
    "2026-11-20": ["Request official transcripts", "reg"],
    "2026-11-21": ["Open 6 portals, send invites", "lee oka pat"],
    "2026-11-22": ["Email packet to 3 recommenders", "lee oka pat"],
    "2026-11-23": ["Polish CV, export clean PDF", "cv"],
    "2026-11-24": ["Check ETS + registrar status", "ets reg"],
    "2026-11-25": ["Tailor SOP: school 1", "sop"],
    "2026-11-26": ["Thanksgiving: rest", ""],
    "2026-11-27": ["Light: read school 2 faculty", "sop"],
    "2026-11-28": ["Light: read school 3 faculty", "sop"],
    "2026-11-29": ["Light: check portal statuses", "lee oka pat"],
    "2026-11-30": ["Nudge Prof. Lee; SOP school 2", "lee sop"],
    "2026-12-01": ["Nudge Prof. Okafor; SOP 3", "oka sop"],
    "2026-12-02": ["Nudge Dr. Patel; SOP 4", "pat sop"],
    "2026-12-03": ["Tailor SOP: school 5", "sop"],
    "2026-12-04": ["Tailor SOP: school 6", "sop"],
    "2026-12-05": ["Fill forms: schools 1–3", "cv"],
    "2026-12-06": ["Fill forms: schools 4–6", "cv"],
    "2026-12-07": ["2nd nudge: Lee + Okafor", "lee oka"],
    "2026-12-08": ["2nd nudge Patel; check ETS", "pat ets"],
    "2026-12-09": ["Proofread + upload SOPs 1–3", "sop"],
    "2026-12-10": ["Proofread + upload SOPs 4–6", "sop"],
    "2026-12-11": ["Final nudge: missing letters", "lee oka pat"],
    "2026-12-12": ["Verify uploads + transcripts", "reg"],
    "2026-12-13": ["Pay the fees and hit submit", "cv"],
    "2026-12-14": ["Buffer: check every receipt", ""],
    "2026-12-15": ["Deadline: final portal check", ""],
  },
};
if (typeof module !== "undefined") module.exports = { DEFAULT_PLAN };
