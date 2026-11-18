// The example: grad school applications, planned backward with Gemini (Gemini Pro, Nov 19 2026).
// Each lock has a due date from Gemini's plan ("due") and, in this sample run, the day its key came back ("back").
// Your own plan: leave "back" empty until a key really comes back, then add the date and download again.
// steps: [date, stamp] — a step shows on the tag from the day AFTER its date (on its date it is today's job).
const DEFAULT_PLAN = {
  goal: "Grad school applications",
  scope: "6 PROGRAMS",
  icons: true,
  start: "2026-11-19",
  submit: "2026-12-13",          // internal submit: the switch flips ON
  deadline: "2026-12-15",        // the real deadline (11:59 pm)
  locks: [
    { id: "ets", holder: "ETS", what: "SCORES ×6", icon: "scores", theirs: true, due: "2026-12-08", back: "2026-12-02",
      steps: [["2026-11-19", "ORDERED"], ["2026-11-24", "CHECKED"]] },
    { id: "reg", holder: "REGISTRAR", what: "TRANSCRIPTS", icon: "transcript", theirs: true, due: "2026-12-10", back: "2026-12-04",
      steps: [["2026-11-20", "REQUESTED"], ["2026-11-24", "CHECKED"], ["2026-12-03", "CALLED"]] },
    { id: "sop", holder: "SOP", what: "6 VERSIONS", icon: "pen", theirs: false, due: "2026-12-10", back: "2026-12-10",
      steps: [["2026-11-25", "DRAFT 1/6"], ["2026-11-30", "DRAFT 2/6"], ["2026-12-01", "DRAFT 3/6"],
              ["2026-12-02", "DRAFT 4/6"], ["2026-12-03", "DRAFT 5/6"], ["2026-12-04", "DRAFT 6/6"], ["2026-12-09", "UPLOAD 3/6"]] },
    { id: "lee", holder: "LEE", what: "LETTER ×6", theirs: true, due: "2026-12-11", back: "2026-12-03",
      steps: [["2026-10-15", "AGREED"], ["2026-11-21", "SENT"], ["2026-11-22", "INVITED"], ["2026-11-29", "CHECKED"], ["2026-11-30", "NUDGED"]] },
    { id: "oka", holder: "OKAFOR", what: "LETTER ×6", theirs: true, due: "2026-12-11", back: "2026-12-09",
      steps: [["2026-10-15", "AGREED"], ["2026-11-21", "SENT"], ["2026-11-22", "INVITED"], ["2026-11-29", "CHECKED"], ["2026-12-01", "NUDGED"], ["2026-12-07", "NUDGED 2×"]] },
    { id: "pat", holder: "PATEL", what: "LETTER ×6", theirs: true, due: "2026-12-11", back: "2026-12-11",
      steps: [["2026-10-15", "AGREED"], ["2026-11-21", "SENT"], ["2026-11-22", "INVITED"], ["2026-11-29", "CHECKED"], ["2026-12-02", "NUDGED"], ["2026-12-08", "NUDGED 2×"]] },
    { id: "cv", holder: "FORMS", what: "CV · FEES", icon: "forms", theirs: false, due: "2026-12-13", back: "2026-12-13",
      steps: [["2026-11-23", "CV DONE"], ["2026-12-05", "FORMS 3/6"], ["2026-12-06", "FORMS 6/6"]] },
  ],
  // one task a day (Gemini's daily plan, tightened), and the locks it works on
  days: {
    "2026-11-19": ["Order ETS scores to 6 schools", "ets"],
    "2026-11-20": ["Request official transcripts", "reg"],
    "2026-11-21": ["Email packet to 3 recommenders", "lee oka pat"],
    "2026-11-22": ["Open 6 portals, send invites", "lee oka pat"],
    "2026-11-23": ["Polish CV, export clean PDF", "cv"],
    "2026-11-24": ["Check ETS + registrar status", "ets reg"],
    "2026-11-25": ["Tailor SOP for school 1", "sop"],
    "2026-11-26": ["Thanksgiving: rest", ""],
    "2026-11-27": ["Light: read school 2 faculty", "sop"],
    "2026-11-28": ["Light: read school 3 faculty", "sop"],
    "2026-11-29": ["Light: check portal statuses", "lee oka pat"],
    "2026-11-30": ["Nudge Lee; SOP for school 2", "lee sop"],
    "2026-12-01": ["Nudge Okafor; SOP for school 3", "oka sop"],
    "2026-12-02": ["Nudge Patel; SOP for school 4", "pat sop"],
    "2026-12-03": ["Call registrar; SOP for school 5", "reg sop"],
    "2026-12-04": ["Tailor SOP for school 6", "sop"],
    "2026-12-05": ["Fill forms: schools 1–3", "cv"],
    "2026-12-06": ["Fill forms: schools 4–6", "cv"],
    "2026-12-07": ["2nd nudge: Okafor", "oka"],
    "2026-12-08": ["2nd nudge: Patel", "pat"],
    "2026-12-09": ["Proofread + upload SOPs 1–3", "sop"],
    "2026-12-10": ["Proofread + upload SOPs 4–6", "sop"],
    "2026-12-11": ["Final nudge: Patel", "pat"],
    "2026-12-12": ["Verify every upload", "cv"],
    "2026-12-13": ["Pay the fees and hit submit", "cv"],
    "2026-12-14": ["Buffer: check every receipt", ""],
    "2026-12-15": ["Deadline: final portal check", ""],
  },
};
if (typeof module !== "undefined") module.exports = { DEFAULT_PLAN };
