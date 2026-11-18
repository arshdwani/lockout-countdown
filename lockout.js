// Lockout: a countdown lock screen drawn as a lockout/tagout station. Pure SVG, 1290 x 2796 design units.
// renderLockout({ plan, date, W, H, fontCSS }) -> SVG string.
// The SUBMIT switch stays OFF while any padlock hangs on the group lockout bar. Each lock's tag says who holds
// its key. Locks come off as milestones are done; when the last one is off, the switch flips ON.
(function (root) {
  const DW = 1290, DH = 2796;
  const RED = "#d4232b", YEL = "#f4bd12", GREEN = "#35c46f", INK_BLUE = "#1f4fc4", INK_RED = "#c8202a";
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const D = s => new Date(s + "T12:00:00Z");
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => iso(new Date(D(s).getTime() + n * 864e5));
  const diff = (a, b) => Math.round((D(b) - D(a)) / 864e5); // b - a in days
  const md = s => { const d = D(s); return MON[d.getUTCMonth()] + " " + d.getUTCDate(); };
  const wmd = s => { const d = D(s); return WD[d.getUTCDay()] + " " + MON[d.getUTCMonth()] + " " + d.getUTCDate(); };
  const slash = s => { const d = D(s); return (d.getUTCMonth() + 1) + "/" + d.getUTCDate(); };

  // text measuring (fonts must be loaded first)
  let ctx;
  function tw(text, size, weight = 800, stretch = "condensed", family = "Archivo") {
    if (!ctx) ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${weight} ${size}px ${family}`;
    try { ctx.fontStretch = stretch; } catch (e) {}
    return ctx.measureText(text).width;
  }
  function fit(text, max, size, min, weight, stretch, family) {
    let s = size;
    while (s > min && tw(text, s, weight, stretch, family) > max) s -= 1;
    return s;
  }
  function wrap(text, max, size, weight, stretch) {
    const words = text.split(" "), lines = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (tw(t, size, weight, stretch) <= max || !cur) cur = t; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  const T = (x, y, text, o = {}) => `<text x="${x}" y="${y}" font-family="${o.family || "Archivo"}" font-size="${o.size || 30}" font-weight="${o.weight || 800}" font-stretch="${o.stretch || "condensed"}" fill="${o.fill || "#111"}" text-anchor="${o.anchor || "start"}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.opacity != null ? ` opacity="${o.opacity}"` : ""}${o.extra || ""}>${esc(text)}</text>`;

  // ---- state for a date ----
  function stateFor(plan, date) {
    const locks = plan.locks.map((L, i) => {
      const done = (L.steps || []).filter(s => s[0] < date);
      const next = (L.steps || []).find(s => s[0] >= date);
      return { ...L, n: i + 1, off: date > L.off, offToday: date === L.off, offDate: L.off,
        last: done[done.length - 1], next, doneCount: done.length, total: (L.steps || []).length };
    });
    const day = (plan.days || {})[date] || [autoTask(plan, date)];
    let focus;
    if (day.length > 1) focus = new Set((day[1] || "").split(/\s+/).filter(Boolean));
    else {
      const low = (day[0] || "").toLowerCase();
      focus = new Set(plan.locks.filter(L => L.off === date || (L.steps || []).some(s => s[0] === date) ||
        (L.theirs && L.holder.split(/[\s.]+/).filter(w => w.length > 2).some(w => low.includes(w.toLowerCase())))).map(L => L.id));
    }
    const submitted = date > plan.submit;
    return { locks, task: day[0], focus, submitted, submitDay: date === plan.submit,
      toSubmit: diff(date, plan.submit), toDeadline: diff(date, plan.deadline),
      keysBack: locks.filter(l => l.off).length, theirs: locks.filter(l => l.theirs).length };
  }

  // a task for days the plan leaves empty (custom plans)
  function autoTask(plan, date) {
    const V = verbOf(plan);
    if (date === plan.submit) return `${cap(V)} today`;
    if (date === plan.deadline) return "Deadline: final check";
    if (date > plan.submit) return "Buffer: check every receipt";
    if (date < plan.start) return "Hang the locks";
    for (const L of plan.locks) for (const [d, w] of (L.steps || [])) if (d === date) {
      const W = w.toUpperCase().trim(), v = VERBS[W] || VERBS[W.split(" ")[0]];
      if (L.theirs) return (v ? `${v} ${title(L.holder)}` : `Follow up: ${title(L.holder)}`).slice(0, 32);
      return `${cap(L.what)}: ${w.toLowerCase()}`.slice(0, 32);
    }
    for (const L of plan.locks) if (L.off === date) return L.theirs ? `Confirm ${title(L.holder)} is done`.slice(0, 32) : `Finish ${L.what.toLowerCase()}`.slice(0, 32);
    const mine = plan.locks.filter(L => !L.theirs && L.off >= date).sort((a, b) => a.off < b.off ? -1 : 1)[0];
    return mine ? `Work on ${mine.what.toLowerCase()}`.slice(0, 32) : "Check every lock's status";
  }
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  const title = w => w.toLowerCase().replace(/(^|[\s.\-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const VERBS = { ASKED: "Ask", NUDGED: "Nudge", "NUDGED ×2": "Nudge again", BOOKED: "Book", REQUESTED: "Request", ORDERED: "Order",
    INVITED: "Invite", SENT: "Send to", CHECKED: "Check", EMAILED: "Email", CALLED: "Call", PAID: "Pay", SCHEDULED: "Schedule",
    REMINDED: "Remind", CONFIRMED: "Confirm", "PACKET SENT": "Send packet to", FOLLOWED: "Follow up:", PINGED: "Ping" };
  const verbOf = plan => (plan.verb || "SUBMIT").toUpperCase();
  const doneOf = plan => (plan.done || "SUBMITTED").toUpperCase();

  // ---- defs ----
  function defs() {
    return `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262b33"/><stop offset=".45" stop-color="#1d2128"/><stop offset="1" stop-color="#121519"/></linearGradient>
<radialGradient id="topglow" cx=".5" cy=".22" r=".5"><stop offset="0" stop-color="#3a4250" stop-opacity=".45"/><stop offset="1" stop-color="#3a4250" stop-opacity="0"/></radialGradient>
<radialGradient id="worklight" cx=".5" cy=".5" r=".5" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#ffe7b8" stop-opacity=".16"/><stop offset=".5" stop-color="#ffd890" stop-opacity=".06"/><stop offset="1" stop-color="#ffd890" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.18"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="ds" x="-30%" y="-20%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="11"/><feOffset dx="6" dy="16"/><feComponentTransfer><feFuncA type="linear" slope=".6"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="ds2" x="-30%" y="-20%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="6"/><feOffset dx="3" dy="8"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="stamp" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feTurbulence type="turbulence" baseFrequency=".05" numOctaves="1" seed="9" result="w"/><feDisplacementMap in="c" in2="w" scale="2.5"/></filter>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="18"/></filter>
<linearGradient id="steelV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f4f7"/><stop offset=".18" stop-color="#c3c9d0"/><stop offset=".55" stop-color="#8b939c"/><stop offset=".8" stop-color="#6b737c"/><stop offset="1" stop-color="#4a5058"/></linearGradient>
<linearGradient id="steelH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d646c"/><stop offset=".3" stop-color="#eef2f5"/><stop offset=".55" stop-color="#a7aeb6"/><stop offset="1" stop-color="#454b52"/></linearGradient>
<radialGradient id="screw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f6f8fa"/><stop offset=".5" stop-color="#a3aab2"/><stop offset="1" stop-color="#4c5259"/></radialGradient>
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd335"/><stop offset=".5" stop-color="#f6c112"/><stop offset="1" stop-color="#dfa506"/></linearGradient>
<linearGradient id="handle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a52"/><stop offset=".35" stop-color="#e3262c"/><stop offset=".75" stop-color="#b3151c"/><stop offset="1" stop-color="#7d0c12"/></linearGradient>
<radialGradient id="hub" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ff6d63"/><stop offset=".45" stop-color="#d81f27"/><stop offset="1" stop-color="#7a0b10"/></radialGradient>
<linearGradient id="bodyRed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f0f15"/><stop offset=".14" stop-color="#d7232b"/><stop offset=".42" stop-color="#ef3a3f"/><stop offset=".78" stop-color="#c81b23"/><stop offset="1" stop-color="#7d0b11"/></linearGradient>
<linearGradient id="bodyYel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a87a00"/><stop offset=".14" stop-color="#efb70b"/><stop offset=".42" stop-color="#ffd23a"/><stop offset=".78" stop-color="#e8ad05"/><stop offset="1" stop-color="#9a6e00"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".12" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
<radialGradient id="spot" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".34"/><stop offset=".55" stop-color="#ffd25a" stop-opacity=".1"/><stop offset="1" stop-color="#ffd25a" stop-opacity="0"/></radialGradient>
<radialGradient id="lampOn" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#eaffef"/><stop offset=".35" stop-color="#5bf08f"/><stop offset="1" stop-color="#138a45"/></radialGradient>
<radialGradient id="lampOff" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5f7a68"/><stop offset=".5" stop-color="#20382a"/><stop offset="1" stop-color="#0c1711"/></radialGradient>
<linearGradient id="flip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f47"/><stop offset=".5" stop-color="#2a2e35"/><stop offset=".5" stop-color="#202328"/><stop offset="1" stop-color="#2c3037"/></linearGradient>
<pattern id="peg" width="64.5" height="64.5" patternUnits="userSpaceOnUse" x="0" y="10"><circle cx="32" cy="32" r="6.5" fill="#07080a" opacity=".75"/><path d="M26 34 a6.5 6.5 0 0 0 12 0" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="2"/></pattern>
<linearGradient id="pegfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a3a"/><stop offset=".3" stop-color="#4a4a4a"/><stop offset=".4" stop-color="#fff"/><stop offset=".93" stop-color="#fff"/><stop offset="1" stop-color="#777"/></linearGradient>
<mask id="pegmask"><rect width="${DW}" height="${DH}" fill="url(#pegfade)"/></mask>
<pattern id="hazard" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="56" height="56" fill="#16181c"/><rect width="28" height="56" fill="${YEL}"/></pattern>
</defs>`;
  }

  // ---- background ----
  function background() {
    return `<rect width="${DW}" height="${DH}" fill="url(#bg)"/>
<rect width="${DW}" height="${DH}" fill="url(#topglow)"/>
<rect width="${DW}" height="${DH}" fill="url(#peg)" mask="url(#pegmask)"/>
<rect width="${DW}" height="${DH}" fill="#fff" filter="url(#grain)" opacity=".07"/>
<ellipse cx="645" cy="1560" rx="900" ry="820" fill="url(#worklight)"/>
<rect width="${DW}" height="${DH}" fill="url(#vig)"/>`;
  }

  const screw = (x, y, a = 30, r = 14) => `<g transform="translate(${x},${y}) rotate(${a})"><circle r="${r + 3}" fill="#000" opacity=".25" transform="translate(1.5,2.5)"/><circle r="${r}" fill="url(#screw)"/><rect x="${-r * .75}" y="-2.6" width="${r * 1.5}" height="5.2" rx="2" fill="#3b4047"/></g>`;

  // ---- the switch ----
  function switchPlate(st, plan) {
    const cx = 645, cy = 1190, S = 420, x0 = cx - S / 2, y0 = cy - S / 2;
    const on = st.submitted;
    const ang = on ? -90 : 0;
    let s = `<g filter="url(#ds)">`;
    // lockout tab (behind plate, sticks out at the bottom)
    s += `<rect x="${cx - 38}" y="${y0 + S - 40}" width="76" height="96" rx="14" fill="url(#steelH)"/>`;
    s += `<circle cx="${cx}" cy="${y0 + S + 30}" r="16" fill="#0b0d10"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${S}" height="${S}" rx="36" fill="url(#plate)"/>`;
    s += `</g>`;
    s += `<rect x="${x0 + 4}" y="${y0 + 4}" width="${S - 8}" height="${S - 8}" rx="32" fill="none" stroke="#fff6c8" stroke-opacity=".55" stroke-width="3"/>`;
    s += `<rect x="${x0 + 18}" y="${y0 + 18}" width="${S - 36}" height="${S - 36}" rx="22" fill="none" stroke="#1a1600" stroke-opacity=".85" stroke-width="5"/>`;
    s += screw(x0 + 44, y0 + 44, 20) + screw(x0 + S - 44, y0 + 44, 70) + screw(x0 + 44, y0 + S - 44, 110) + screw(x0 + S - 44, y0 + S - 44, 160);
    // markings
    s += T(x0 + S - 74, y0 + 112, "ON", { size: 34, weight: 900, stretch: "expanded", anchor: "middle", fill: "#141100", ls: 1 });
    s += T(x0 + S - 74, y0 + 76, "I", { size: 34, weight: 900, stretch: "expanded", anchor: "middle", fill: "#141100" });
    s += T(x0 + S - 74, cy + 104, "OFF", { size: 34, weight: 900, stretch: "expanded", anchor: "middle", fill: "#141100", ls: 1 });
    s += T(x0 + S - 74, cy + 68, "O", { size: 34, weight: 900, stretch: "expanded", anchor: "middle", fill: "#141100" });
    const lbl = "MAIN " + verbOf(plan);
    s += T(cx, y0 + S - 50, lbl, { size: fit(lbl, S - 120, 27, 16, 900, "expanded"), weight: 900, stretch: "expanded", anchor: "middle", fill: "#141100", ls: 3 });
    // pilot lamp
    const lx = x0 + 90, ly = y0 + 94;
    s += `<circle cx="${lx}" cy="${ly}" r="33" fill="#1c1d1f"/><circle cx="${lx}" cy="${ly}" r="33" fill="none" stroke="url(#steelH)" stroke-width="6"/>`;
    if (on) s += `<circle cx="${lx}" cy="${ly}" r="46" fill="${GREEN}" opacity=".85" filter="url(#glow)"/>`;
    s += `<circle cx="${lx}" cy="${ly}" r="25" fill="url(#${on ? "lampOn" : "lampOff"})"/><ellipse cx="${lx - 7}" cy="${ly - 9}" rx="9" ry="5" fill="#fff" opacity=".5"/>`;
    // collar + handle
    s += `<circle cx="${cx}" cy="${cy}" r="126" fill="#141619"/><circle cx="${cx}" cy="${cy}" r="126" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="118" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="3"/>`;
    s += `<g transform="rotate(${ang} ${cx} ${cy})" filter="url(#ds2)">`;
    s += `<path d="M${cx - 70} ${cy - 30} L${cx + 150} ${cy - 40} Q${cx + 205} ${cy - 40} ${cx + 205} ${cy} Q${cx + 205} ${cy + 40} ${cx + 150} ${cy + 40} L${cx - 70} ${cy + 30} Q${cx - 96} ${cy} ${cx - 70} ${cy - 30} Z" fill="url(#handle)"/>`;
    s += `<path d="M${cx - 50} ${cy - 22} L${cx + 150} ${cy - 31}" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="72" fill="url(#hub)"/><circle cx="${cx}" cy="${cy}" r="72" fill="none" stroke="#5e080c" stroke-width="3"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="22" fill="url(#screw)"/><circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="#5e080c" stroke-opacity=".6" stroke-width="2"/>`;
    s += `</g>`;
    return s;
  }

  // ---- bar, cables, locks, tags ----
  const BAR_Y = 1585, BAR_H = 54, LOCK_Y = 1690, BODY_W = 112, BODY_H = 136, TAG_Y = 1846, TAG_W = 152, TAG_H = 236;
  const lockX = (i, n) => 645 + (i - (n - 1) / 2) * Math.min(164, 1120 / Math.max(1, n - 1));

  function barSpan(n) {
    const a = Math.min(lockX(0, n) - 93, 645 - 260), b = Math.max(lockX(n - 1, n) + 93, 645 + 260);
    return [a, b];
  }
  function cables(n) {
    const tx = 645, ty = 1190 + 210 + 30;
    const [a, b] = barSpan(n);
    const L = [n >= 4 ? (lockX(0, n) + lockX(1, n)) / 2 : a + 40, BAR_Y - 6], R = [n >= 4 ? (lockX(n - 2, n) + lockX(n - 1, n)) / 2 : b - 40, BAR_Y - 6];
    const path = `M${L[0]} ${L[1]} L${tx} ${ty} L${R[0]} ${R[1]}`;
    return `<path d="${path}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="12" transform="translate(5,12)" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#2b3036" stroke-width="12" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#a9b1ba" stroke-width="7" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#eef2f6" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 5" stroke-linejoin="round"/>
${[L, R].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="10" fill="none" stroke="#2b3036" stroke-width="9"/><circle cx="${p[0]}" cy="${p[1]}" r="10" fill="none" stroke="url(#steelH)" stroke-width="5"/>`).join("")}
<circle cx="${tx}" cy="${ty}" r="21" fill="none" stroke="#2b3036" stroke-width="12"/><circle cx="${tx}" cy="${ty}" r="21" fill="none" stroke="url(#steelH)" stroke-width="8"/>`;
  }

  function bar(n) {
    const [a, b] = barSpan(n), bw = b - a;
    let s = `<g filter="url(#ds2)"><rect x="${a}" y="${BAR_Y}" width="${bw}" height="${BAR_H}" rx="18" fill="url(#steelV)"/></g>`;
    s += `<rect x="${a}" y="${BAR_Y}" width="${bw}" height="${BAR_H}" rx="18" fill="none" stroke="#2b3036" stroke-width="2"/>`;
    for (let k = 0; k < 9; k++) s += `<line x1="${a + 20}" x2="${b - 20}" y1="${BAR_Y + 10 + k * 4.4}" y2="${BAR_Y + 10 + k * 4.4}" stroke="#fff" stroke-opacity="${.05 + (k % 3) * .02}" stroke-width="1"/>`;
    for (let i = 0; i < n; i++) {
      const x = lockX(i, n);
      s += `<ellipse cx="${x}" cy="${BAR_Y + 27}" rx="19" ry="17" fill="#0b0d10"/><path d="M${x - 19} ${BAR_Y + 27} a19 17 0 0 0 38 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`;
    }
    return s;
  }

  function shackle(x, open) {
    const top = BAR_Y + 27, r = 30, lift = open ? 46 : 0;
    const d = `M${x - r} ${LOCK_Y + 12} V${top - lift} a${r} ${r} 0 0 1 ${2 * r} 0 V${LOCK_Y + 12 - (open ? 0 : 0)}`;
    return `<path d="${d}" fill="none" stroke="#24282d" stroke-width="20" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#steelH)" stroke-width="15" stroke-linecap="round"/>`;
  }

  function lockBody(x, L, today) {
    const x0 = x - BODY_W / 2, y0 = LOCK_Y;
    const yours = !L.theirs;
    let s = `<g filter="url(#ds2)">`;
    s += shackle(x, false);
    s += `<rect x="${x0}" y="${y0}" width="${BODY_W}" height="${BODY_H}" rx="16" fill="url(#${yours ? "bodyYel" : "bodyRed"})"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${BODY_W}" height="${BODY_H}" rx="16" fill="url(#gloss)"/>`;
    s += `</g>`;
    s += `<rect x="${x0 + 8}" y="${y0 + 7}" width="${BODY_W - 16}" height="7" rx="3.5" fill="#fff" opacity=".35"/>`;
    s += T(x, y0 + 82, String(L.n), { size: 66, weight: 900, stretch: "normal", anchor: "middle", fill: yours ? "#1d1600" : "#fff", opacity: .92 });
    s += `<circle cx="${x}" cy="${y0 + 112}" r="11" fill="#2a2d31"/><circle cx="${x}" cy="${y0 + 112}" r="7.5" fill="url(#screw)"/><rect x="${x - 1.6}" y="${y0 + 106}" width="3.2" height="12" fill="#2a2d31"/>`;
    return s;
  }

  function stampSvg(cx, cy, text, sub, color, rot) {
    const size = fit(text, 118, 23, 15, 600, "normal", "IBM Plex Mono");
    const w = Math.min(TAG_W - 18, tw(text, size, 600, "normal", "IBM Plex Mono") + 22);
    return `<g transform="translate(${cx},${cy}) rotate(${rot})" filter="url(#stamp)" opacity=".9">
<rect x="${-w / 2}" y="-24" width="${w}" height="${sub ? 54 : 40}" rx="6" fill="none" stroke="${color}" stroke-width="3.5"/>
${T(0, 3, text, { family: "IBM Plex Mono", size, weight: 600, stretch: "normal", anchor: "middle", fill: color })}
${sub ? T(0, 23, sub, { family: "IBM Plex Mono", size: 16, weight: 600, stretch: "normal", anchor: "middle", fill: color }) : ""}
</g>`;
  }

  function tag(x, L, st, date, i) {
    const x0 = x - TAG_W / 2, y0 = TAG_Y, rot = [-2.2, 1.6, -1.2, 2.0, -1.8, 1.2, -2.6][i % 7];
    const yours = !L.theirs;
    let s = `<path d="M${x} ${LOCK_Y + BODY_H - 4} L${x} ${y0 + 22}" stroke="#15171a" stroke-width="6" stroke-linecap="round"/>`;
    s += `<g transform="rotate(${rot} ${x} ${y0 + 20})"><g filter="url(#ds2)"><rect x="${x0}" y="${y0}" width="${TAG_W}" height="${TAG_H}" rx="12" fill="#f5f2ea"/></g>`;
    s += `<rect x="${x0}" y="${y0 + 40}" width="${TAG_W}" height="40" fill="${yours ? YEL : RED}"/>`;
    s += T(x, y0 + 69, yours ? "YOUR KEY" : "THEIR KEY", { size: 25, weight: 900, stretch: "condensed", anchor: "middle", fill: yours ? "#1d1600" : "#fff", ls: 1.5 });
    s += `<circle cx="${x}" cy="${y0 + 20}" r="12" fill="#c9a24a"/><circle cx="${x}" cy="${y0 + 20}" r="12" fill="none" stroke="#7d6020" stroke-width="2"/><circle cx="${x}" cy="${y0 + 20}" r="6.5" fill="#24262a"/>`;
    const ns = fit(L.holder, TAG_W - 20, 34, 20, 900, "extra-condensed");
    s += T(x, y0 + 116, L.holder, { size: ns, weight: 900, stretch: "extra-condensed", anchor: "middle", fill: "#121212" });
    const ws = fit(L.what, TAG_W - 18, 22, 15, 700, "condensed");
    s += T(x, y0 + 142, L.what, { size: ws, weight: 700, stretch: "condensed", anchor: "middle", fill: "#4a4a4a" });
    // state
    if (L.offToday) s += stampSvg(x, y0 + 182, "OFF TODAY", null, "#178a46", -6);
    else if (L.last) {
      const nudge = /NUDGE/.test(L.last[1]);
      s += stampSvg(x, y0 + 180, L.last[1], slash(L.last[0]), nudge ? INK_RED : (yours ? "#1d1d1d" : INK_BLUE), [-7, 5, -4, 6, -6, 4, -5][i % 7]);
    } else if (L.next && L.next[0] === date) {
      s += stampSvg(x, y0 + 182, "START TODAY", null, "#b26a00", -5);
    } else if (L.next) {
      s += T(x, y0 + 178, "STARTS", { family: "IBM Plex Mono", size: 17, weight: 600, stretch: "normal", anchor: "middle", fill: "#8a8a8a", ls: 1 });
      s += T(x, y0 + 200, md(L.next[0]), { family: "IBM Plex Mono", size: 19, weight: 600, stretch: "normal", anchor: "middle", fill: "#8a8a8a" });
    }
    s += `<line x1="${x0 + 12}" x2="${x0 + TAG_W - 12}" y1="${y0 + 210}" y2="${y0 + 210}" stroke="#d8d3c6" stroke-width="2"/>`;
    s += T(x, y0 + 229, "OFF BY " + md(L.offDate), { family: "IBM Plex Mono", size: 17, weight: 600, stretch: "normal", anchor: "middle", fill: "#2a2a2a" });
    s += `</g>`;
    return s;
  }

  function ghost(x, L, i, done) {
    const x0 = x - BODY_W / 2;
    const top = BAR_Y + 27, r = 30;
    let s = `<g opacity=".9">`;
    if (!done) s += `<path d="M${x - r} ${LOCK_Y + 8} V${top} a${r} ${r} 0 0 1 ${2 * r} 0 V${LOCK_Y + 8}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-dasharray="9 8"/>`;
    s += `<rect x="${x0}" y="${LOCK_Y}" width="${BODY_W}" height="${BODY_H}" rx="16" fill="#fff" fill-opacity=".03" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-dasharray="12 9"/>`;
    s += `<circle cx="${x}" cy="${LOCK_Y + 68}" r="38" fill="${GREEN}" fill-opacity=".14" stroke="${GREEN}" stroke-width="5"/>`;
    s += `<path d="M${x - 17} ${LOCK_Y + 69} l12 13 l24 -27" fill="none" stroke="${GREEN}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<rect x="${x - TAG_W / 2}" y="${TAG_Y}" width="${TAG_W}" height="${TAG_H}" rx="12" fill="#fff" fill-opacity=".03" stroke="#fff" stroke-opacity=".16" stroke-width="3" stroke-dasharray="10 8"/>`;
    s += T(x, TAG_Y + 58, "KEY BACK", { size: 25, weight: 900, stretch: "condensed", anchor: "middle", fill: GREEN, ls: 1.5 });
    const ns = fit(L.holder, TAG_W - 20, 30, 18, 900, "extra-condensed");
    s += T(x, TAG_Y + 112, L.holder, { size: ns, weight: 900, stretch: "extra-condensed", anchor: "middle", fill: "#e9edf1", opacity: .8 });
    s += T(x, TAG_Y + 140, L.what, { size: fit(L.what, TAG_W - 18, 22, 15, 700, "condensed"), weight: 700, stretch: "condensed", anchor: "middle", fill: "#e9edf1", opacity: .55 });
    s += T(x, TAG_Y + 229, "OFF " + md(L.offDate), { family: "IBM Plex Mono", size: 18, weight: 600, stretch: "normal", anchor: "middle", fill: GREEN });
    s += `</g>`;
    return s;
  }

  function todayFlag(x) {
    const y = BAR_Y - 44;
    return `<g filter="url(#ds2)"><rect x="${x - 60}" y="${y - 22}" width="120" height="40" rx="6" fill="${YEL}"/></g>
${T(x, y + 8, "TODAY", { size: 25, weight: 900, stretch: "expanded", anchor: "middle", fill: "#1b1500", ls: 2 })}
<path d="M${x - 10} ${y + 18} L${x} ${y + 30} L${x + 10} ${y + 18} Z" fill="${YEL}"/>`;
  }

  function locksRow(st, date) {
    const n = st.locks.length;
    let back = "", front = "";
    st.locks.forEach((L, i) => {
      const x = lockX(i, n);
      const today = !st.submitted && (st.focus.has(L.id) || L.offToday) && !L.off;
      if (today) back += `<ellipse cx="${x}" cy="${(LOCK_Y + TAG_Y + TAG_H) / 2}" rx="150" ry="330" fill="url(#spot)"/>`;
      if (L.off) front += ghost(x, L, i, st.submitted);
      else { front += tag(x, L, st, date, i) + lockBody(x, L, today); if (today) front += todayFlag(x); }
    });
    return back + front;
  }

  // ---- board ----
  function flipDigits(x, y, str) {
    const cw = 118, ch = 176, gap = 12;
    let s = "";
    [...str].forEach((c, k) => {
      const cx = x + k * (cw + gap);
      s += `<g filter="url(#ds2)"><rect x="${cx}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="url(#flip)"/></g>`;
      s += T(cx + cw / 2, y + ch / 2 + 54, c, { size: 150, weight: 800, stretch: "condensed", anchor: "middle", fill: "#f7f7f2" });
      s += `<rect x="${cx}" y="${y + ch / 2 - 2}" width="${cw}" height="4" fill="#0c0d0f"/>`;
      s += `<circle cx="${cx + 5}" cy="${y + ch / 2}" r="3" fill="#6d737b"/><circle cx="${cx + cw - 5}" cy="${y + ch / 2}" r="3" fill="#6d737b"/>`;
    });
    return { svg: s, w: str.length * cw + (str.length - 1) * gap };
  }

  function board(st, plan, date) {
    const x0 = 56, y0 = 2104, w = 1178, h = 344;
    const on = st.submitted;
    let s = `<g filter="url(#ds)"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="24" fill="#0f1114"/></g>`;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="24" fill="none" stroke="url(#steelV)" stroke-width="6"/>`;
    // header band
    s += `<path d="M${x0 + 3} ${y0 + 72} V${y0 + 24} a21 21 0 0 1 21 -21 H${x0 + w - 24} a21 21 0 0 1 21 21 V${y0 + 72} Z" fill="${on ? "#0f5e33" : "#050506"}"/>`;
    if (on) {
      s += `<path d="M${x0 + 40} ${y0 + 38} l14 15 l28 -30" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += T(x0 + 100, y0 + 54, `${doneOf(plan)} ${wmd(plan.submit)}`, { size: 36, weight: 900, stretch: "expanded", fill: "#fff", ls: 1.5 });
      s += T(x0 + w - 28, y0 + 54, "SWITCH ON", { family: "IBM Plex Mono", size: 22, weight: 600, stretch: "normal", anchor: "end", fill: "#bff2d2", ls: 1 });
    } else {
      s += `<ellipse cx="${x0 + 136}" cy="${y0 + 38}" rx="118" ry="27" fill="${RED}"/>`;
      s += T(x0 + 136, y0 + 50, "DANGER", { size: 33, weight: 900, stretch: "expanded", anchor: "middle", fill: "#fff", ls: 2 });
      const msg = st.locks.length === 1 ? `DO NOT ${verbOf(plan)} UNTIL THE LOCK IS OFF` : `DO NOT ${verbOf(plan)} UNTIL ALL ${st.locks.length} LOCKS ARE OFF`;
      s += T(x0 + 274, y0 + 50, msg, { size: fit(msg, w - 300, 31, 20, 800, "condensed"), weight: 800, stretch: "condensed", fill: "#fff", ls: 1 });
    }
    // digits
    const by = y0 + 98;
    let num, caption;
    if (on) { const early = diff(plan.submit, plan.deadline); num = String(early); caption = early === 1 ? "DAY EARLY" : "DAYS EARLY"; }
    else if (st.submitDay) { num = "0"; caption = verbOf(plan) + " TODAY"; }
    else if (st.toSubmit < 0) { num = "0"; caption = "PAST " + verbOf(plan) + " DATE"; }
    else { num = String(st.toSubmit); caption = (st.toSubmit === 1 ? "DAY TO " : "DAYS TO ") + verbOf(plan); }
    const fd = flipDigits(x0 + 34, by, num.padStart(2, "0"));
    s += fd.svg;
    s += T(x0 + 34 + fd.w / 2, by + 214, caption, { family: "IBM Plex Mono", size: 21, weight: 600, stretch: "normal", anchor: "middle", fill: YEL, ls: 1.5 });
    // divider
    const tx = x0 + 34 + fd.w + 40;
    s += `<line x1="${tx - 20}" x2="${tx - 20}" y1="${by}" y2="${by + 220}" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>`;
    // today + task
    s += T(tx, by + 22, "TODAY · " + wmd(date), { family: "IBM Plex Mono", size: 23, weight: 600, stretch: "normal", fill: YEL, ls: 1.5 });
    const maxW = x0 + w - 30 - tx;
    let size = 60, lines = wrap(st.task, maxW, size, 800, "condensed");
    while ((lines.length > 2 || lines.some(l => tw(l, size, 800, "condensed") > maxW)) && size > 36) { size -= 2; lines = wrap(st.task, maxW, size, 800, "condensed"); }
    const ly = lines.length === 1 ? by + 104 : by + 82;
    lines.forEach((l, k) => { s += T(tx, ly + k * (size * 1.02), l, { size, weight: 800, stretch: "condensed", fill: "#fff" }); });
    const nd = addDays(date, 1), tmr = (plan.days || {})[nd] || (nd <= plan.deadline ? [autoTask(plan, nd)] : null);
    if (lines.length === 1 && tmr && tmr[0]) {
      const nt = "NEXT · " + tmr[0];
      s += T(tx, by + 160, nt, { family: "IBM Plex Mono", size: fit(nt, maxW, 22, 15, 600, "normal", "IBM Plex Mono"), weight: 600, stretch: "normal", fill: "#c9d1d9", opacity: .75 });
    }
    // footer
    const theirsLeft = st.locks.filter(l => l.theirs && !l.off).length, yoursLeft = st.locks.filter(l => !l.theirs && !l.off).length;
    let foot;
    if (on) foot = `ALL ${st.locks.length} KEYS BACK · DEADLINE ${wmd(plan.deadline)}`;
    else foot = `STILL ON: ${theirsLeft} THEIRS, ${yoursLeft} YOURS · DEADLINE ${wmd(plan.deadline)}`;
    s += T(tx, by + 216, foot, { family: "IBM Plex Mono", size: fit(foot, maxW, 21, 15, 600, "normal", "IBM Plex Mono"), weight: 600, stretch: "normal", fill: "#9aa3ad", ls: .5 });
    return s;
  }

  function renderLockout({ plan, date, W = DW, H = DH, fontCSS = "" }) {
    const st = stateFor(plan, date);
    const n = st.locks.length;
    let body = background();
    if (!st.submitted) body += cables(n);
    body += switchPlate(st, plan);
    if (!st.submitted) body += bar(n);
    body += locksRow(st, date);
    body += board(st, plan, date);
    const style = fontCSS ? `<style>${fontCSS}</style>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${DW} ${DH}" preserveAspectRatio="xMidYMid slice">${style}${defs()}${body}</svg>`;
  }

  root.renderLockout = renderLockout;
  root.lockoutState = stateFor;
  root.lockoutUtil = { addDays, diff, md, wmd, iso };
})(typeof window !== "undefined" ? window : globalThis);
