// Lockout: a countdown lock screen drawn as a lockout/tagout station. Pure SVG, 1290 x 2796 design units.
// renderLockout({ plan, date, W, H, fontCSS }) -> SVG string.
// The SUBMIT switch stays OFF while any padlock hangs on the group lockout bar. Each lock's tag says whose key it
// is. A lock comes off only when its key comes back ("back" date); on its due date it reads DUE TODAY, after that
// OVERDUE. When every lock is off and you submit, the switch flips ON.
(function (root) {
  const DW = 1290, DH = 2796;
  const RED = "#d4232b", YEL = "#f4bd12", GREEN = "#35c46f", AMBER = "#c46a00", INK_BLUE = "#1f4fc4", INK_RED = "#c8202a";
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const D = s => new Date(s + "T12:00:00Z");
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => iso(new Date(D(s).getTime() + n * 864e5));
  const diff = (a, b) => Math.round((D(b) - D(a)) / 864e5); // b - a in days
  const md = s => { const d = D(s); return MON[d.getUTCMonth()] + " " + d.getUTCDate(); };
  const wmd = s => { const d = D(s); return WD[d.getUTCDay()] + " " + MON[d.getUTCMonth()] + " " + d.getUTCDate(); };

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

  const verbOf = plan => (plan.verb || "SUBMIT").toUpperCase();
  const doneOf = plan => (plan.done || "SUBMITTED").toUpperCase();
  const ruleOf = (plan, n) => plan.rule ? plan.rule.replace("{n}", n) : n === 1 ? `DO NOT ${verbOf(plan)} UNTIL THE LOCK IS OFF` : `DO NOT ${verbOf(plan)} UNTIL ALL ${n} LOCKS ARE OFF`;
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  const title = w => w.toLowerCase().replace(/(^|[\s.\-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const VERBS = { ASKED: "Ask", NUDGED: "Nudge", "NUDGED 2×": "Nudge again", "NUDGED ×2": "Nudge again", BOOKED: "Book", REQUESTED: "Request", ORDERED: "Order",
    INVITED: "Invite", SENT: "Send to", CHECKED: "Check", EMAILED: "Email", CALLED: "Call", PAID: "Pay", SCHEDULED: "Schedule",
    REMINDED: "Remind", CONFIRMED: "Confirm", "PACKET SENT": "Send packet to", PINGED: "Ping", AGREED: "Ask" };

  // ---- state for a date ----
  function lockState(L, date, plan) {
    const due = L.due || L.off;
    let back = L.back || null, assumed = false;
    if (!back && plan.assumeOnTime) { back = due; assumed = true; }
    const done = (L.steps || []).filter(s => s[0] < date);
    const next = (L.steps || []).find(s => s[0] >= date);
    const off = !!back && (L.theirs ? date >= back : date > back);
    const dueToday = !off && date === due;
    const overdue = !off && date > due;
    return { ...L, due, back, assumed, off, dueToday, overdue, last: done[done.length - 1], next };
  }
  function stateFor(plan, date) {
    const locks = plan.locks.map((L, i) => ({ ...lockState(L, date, plan), n: i + 1 }));
    const day = (plan.days || {})[date] || [autoTask(plan, date)];
    let focus;
    if (day.length > 1) focus = new Set((day[1] || "").split(/\s+/).filter(Boolean));
    else {
      const low = (day[0] || "").toLowerCase();
      focus = new Set(locks.filter(L => (L.steps || []).some(s => s[0] === date) ||
        L.holder.split(/[\s.]+/).filter(w => w.length > 2).some(w => low.includes(w.toLowerCase()))).map(L => L.id));
    }
    locks.forEach(L => { if (L.dueToday || L.overdue) focus.add(L.id); });
    const allBack = locks.every(L => L.back && L.back <= plan.submit);
    const submitted = date > plan.submit && allBack;
    const blocked = date >= plan.submit && !allBack && locks.some(L => !L.off);
    const open = locks.filter(L => !L.off).length;
    const task = blocked && day.length === 1 ? `Chase the ${open} open lock${open === 1 ? "" : "s"}` : day[0];
    return { locks, task, focus, submitted, blocked, submitDay: date === plan.submit && !blocked,
      deadlineDay: date === plan.deadline, toSubmit: diff(date, plan.submit), toDeadline: diff(date, plan.deadline) };
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
      return `${cap(L.holder)}: ${w.toLowerCase()}`.slice(0, 32);
    }
    for (const L of plan.locks) if ((L.due || L.off) === date) return L.theirs ? `Confirm ${title(L.holder)} is in`.slice(0, 32) : `Finish ${L.holder.toLowerCase()}`.slice(0, 32);
    const mine = plan.locks.filter(L => !L.theirs && (L.due || L.off) >= date).sort((a, b) => (a.due || a.off) < (b.due || b.off) ? -1 : 1)[0];
    return mine ? `Work on ${mine.holder.toLowerCase()}`.slice(0, 32) : "Check every lock's status";
  }

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
<radialGradient id="lampRed" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffe2dc"/><stop offset=".35" stop-color="#ff4a3d"/><stop offset="1" stop-color="#8a0d0b"/></radialGradient>
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
  const CX = 645, CY = 1190, PW = 500, PH = 420, TAB_Y = CY + PH / 2 + 30;
  function stationPlate(plan) {
    const t = ("LOCKOUT STATION · " + (plan.goal || "")).toUpperCase();
    const size = fit(t, 820, 28, 18, 800, "expanded");
    const w = tw(t, size, 800, "expanded") + 2 * t.length + 120, x0 = CX - w / 2, y0 = 872;
    return `<g filter="url(#ds2)"><rect x="${x0}" y="${y0}" width="${w}" height="58" rx="10" fill="#2a2f37"/></g>
<rect x="${x0}" y="${y0}" width="${w}" height="58" rx="10" fill="none" stroke="#454c56" stroke-width="2"/>
${screw(x0 + 26, y0 + 29, 40, 9)}${screw(x0 + w - 26, y0 + 29, 120, 9)}
${T(CX, y0 + 39, t, { size, weight: 800, stretch: "expanded", anchor: "middle", fill: "#d9dee4", ls: 2 })}`;
  }
  function switchPlate(st, plan) {
    const x0 = CX - PW / 2, y0 = CY - PH / 2;
    const on = st.submitted;
    const ang = on ? -90 : 0;
    const ink = "#141100";
    let s = `<g filter="url(#ds)">`;
    s += `<rect x="${CX - 38}" y="${y0 + PH - 40}" width="76" height="96" rx="14" fill="url(#steelH)"/>`;
    s += `<circle cx="${CX}" cy="${TAB_Y}" r="16" fill="#0b0d10"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${PW}" height="${PH}" rx="36" fill="url(#plate)"/>`;
    s += `</g>`;
    s += `<rect x="${x0 + 4}" y="${y0 + 4}" width="${PW - 8}" height="${PH - 8}" rx="32" fill="none" stroke="#fff6c8" stroke-opacity=".55" stroke-width="3"/>`;
    s += `<rect x="${x0 + 18}" y="${y0 + 18}" width="${PW - 36}" height="${PH - 36}" rx="22" fill="none" stroke="#1a1600" stroke-opacity=".85" stroke-width="5"/>`;
    s += screw(x0 + 42, y0 + 42, 20) + screw(x0 + PW - 42, y0 + 42, 70) + screw(x0 + 42, y0 + PH - 42, 110) + screw(x0 + PW - 42, y0 + PH - 42, 160);
    // ON at 12 o'clock, OFF at 3 o'clock: the handle points at the word
    s += T(CX, y0 + 56, "ON", { size: 34, weight: 900, stretch: "expanded", anchor: "middle", fill: ink, ls: 2, opacity: on ? 1 : .5 });
    s += T(CX + 184, CY + 11, "OFF", { size: 29, weight: 900, stretch: "expanded", anchor: "middle", fill: ink, opacity: on ? .5 : 1 });
    const lbl = verbOf(plan) + (plan.scope ? " · " + plan.scope : "");
    s += T(CX, y0 + PH - 54, lbl, { size: fit(lbl, PW - 210, 26, 16, 900, "expanded"), weight: 900, stretch: "expanded", anchor: "middle", fill: ink, ls: 2 });
    // pilot lamp: red = locked out, green = on
    const lx = x0 + 78, ly = y0 + 92;
    s += `<circle cx="${lx}" cy="${ly}" r="33" fill="#1c1d1f"/><circle cx="${lx}" cy="${ly}" r="33" fill="none" stroke="url(#steelH)" stroke-width="6"/>`;
    s += `<circle cx="${lx}" cy="${ly}" r="44" fill="${on ? GREEN : "#ff3b30"}" opacity="${on ? .85 : .55}" filter="url(#glow)"/>`;
    s += `<circle cx="${lx}" cy="${ly}" r="25" fill="url(#${on ? "lampOn" : "lampRed"})"/><ellipse cx="${lx - 7}" cy="${ly - 9}" rx="9" ry="5" fill="#fff" opacity=".55"/>`;
    s += T(lx, ly + 60, on ? "LIVE" : "LOCKED", { size: 18, weight: 900, stretch: "expanded", anchor: "middle", fill: ink, ls: 1.5 });
    // collar + handle
    s += `<circle cx="${CX}" cy="${CY}" r="118" fill="#141619"/><circle cx="${CX}" cy="${CY}" r="118" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="4"/><circle cx="${CX}" cy="${CY}" r="110" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="3"/>`;
    s += `<g transform="rotate(${ang} ${CX} ${CY})" filter="url(#ds2)">`;
    s += `<path d="M${CX - 66} ${CY - 28} L${CX + 96} ${CY - 36} Q${CX + 134} ${CY - 36} ${CX + 134} ${CY} Q${CX + 134} ${CY + 36} ${CX + 96} ${CY + 36} L${CX - 66} ${CY + 28} Q${CX - 90} ${CY} ${CX - 66} ${CY - 28} Z" fill="url(#handle)"/>`;
    s += `<path d="M${CX - 48} ${CY - 20} L${CX + 96} ${CY - 28}" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M${CX + 110} ${CY - 14} L${CX + 126} ${CY} L${CX + 110} ${CY + 14}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="66" fill="url(#hub)"/><circle cx="${CX}" cy="${CY}" r="66" fill="none" stroke="#5e080c" stroke-width="3"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="21" fill="url(#screw)"/>`;
    s += `</g>`;
    return s;
  }

  // ---- bar, cables, locks, tags ----
  const BAR_Y = 1570, BAR_H = 54, HOLE_Y = BAR_Y + 27, LOCK_Y = 1668, BODY_W = 112, BODY_H = 134, TAG_Y = 1818, TAG_W = 154, TAG_H = 252;
  const lockX = (i, n) => 645 + (i - (n - 1) / 2) * Math.min(164, 1120 / Math.max(1, n - 1));
  function barSpan(n) { return [Math.min(lockX(0, n) - 93, 645 - 260), Math.max(lockX(n - 1, n) + 93, 645 + 260)]; }

  function cables(n) {
    const [a, b] = barSpan(n);
    const L = [n >= 4 ? (lockX(0, n) + lockX(1, n)) / 2 : a + 40, BAR_Y - 6], R = [n >= 4 ? (lockX(n - 2, n) + lockX(n - 1, n)) / 2 : b - 40, BAR_Y - 6];
    const path = `M${L[0]} ${L[1]} L${CX} ${TAB_Y} L${R[0]} ${R[1]}`;
    return `<path d="${path}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="12" transform="translate(5,12)" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#2b3036" stroke-width="12" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#a9b1ba" stroke-width="7" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#eef2f6" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 5" stroke-linejoin="round"/>
${[L, R].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="10" fill="none" stroke="#2b3036" stroke-width="9"/><circle cx="${p[0]}" cy="${p[1]}" r="10" fill="none" stroke="url(#steelH)" stroke-width="5"/>`).join("")}
<circle cx="${CX}" cy="${TAB_Y}" r="21" fill="none" stroke="#2b3036" stroke-width="12"/><circle cx="${CX}" cy="${TAB_Y}" r="21" fill="none" stroke="url(#steelH)" stroke-width="8"/>`;
  }

  function bar(n) {
    const [a, b] = barSpan(n), bw = b - a;
    let s = `<g filter="url(#ds2)"><rect x="${a}" y="${BAR_Y}" width="${bw}" height="${BAR_H}" rx="18" fill="url(#steelV)"/></g>`;
    s += `<rect x="${a}" y="${BAR_Y}" width="${bw}" height="${BAR_H}" rx="18" fill="none" stroke="#2b3036" stroke-width="2"/>`;
    for (let k = 0; k < 9; k++) s += `<line x1="${a + 20}" x2="${b - 20}" y1="${BAR_Y + 10 + k * 4.4}" y2="${BAR_Y + 10 + k * 4.4}" stroke="#fff" stroke-opacity="${.05 + (k % 3) * .02}" stroke-width="1"/>`;
    for (let i = 0; i < n; i++) {
      const x = lockX(i, n);
      s += `<ellipse cx="${x}" cy="${HOLE_Y}" rx="19" ry="17" fill="#0b0d10"/><path d="M${x - 19} ${HOLE_Y} a19 17 0 0 0 38 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`;
    }
    return s;
  }

  function shackle(x) {
    const r = 30, d = `M${x - r} ${LOCK_Y + 12} V${HOLE_Y} a${r} ${r} 0 0 1 ${2 * r} 0 V${LOCK_Y + 12}`;
    return `<path d="${d}" fill="none" stroke="#24282d" stroke-width="20" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#steelH)" stroke-width="15" stroke-linecap="round"/>`;
  }

  // what the lock guards, as a glanceable icon
  function iconOf(L) {
    if (L.icon) return L.icon;
    const t = (L.what + " " + L.holder).toUpperCase();
    if (/LETTER|REC|REFER/.test(t)) return "letter";
    if (/TRANSCRIPT|RECORD/.test(t)) return "transcript";
    if (/SCORE|TEST|GRE|TOEFL|EXAM/.test(t)) return "scores";
    if (/SOP|ESSAY|STATEMENT|WRIT|DRAFT|RESUME|CV\b/.test(t)) return "pen";
    if (/FORM|FEE|PAY|APPLICATION/.test(t)) return "forms";
    return null;
  }
  function icon(kind, x, y, c) {
    const st = `fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;
    switch (kind) {
      case "letter": return `<rect x="${x - 30}" y="${y - 21}" width="60" height="42" rx="6" ${st}/><path d="M${x - 28} ${y - 17} L${x} ${y + 4} L${x + 28} ${y - 17}" ${st}/>`;
      case "transcript": return `<path d="M${x - 21} ${y - 28} H${x + 8} L${x + 22} ${y - 14} V${y + 28} H${x - 21} Z" ${st}/><path d="M${x + 8} ${y - 28} V${y - 14} H${x + 22}" ${st}/><path d="M${x - 11} ${y - 1} H${x + 12} M${x - 11} ${y + 13} H${x + 12}" ${st}/>`;
      case "scores": return `<path d="M${x - 28} ${y + 26} H${x + 28}" ${st}/><path d="M${x - 18} ${y + 18} V${y + 4} M${x} ${y + 18} V${y - 10} M${x + 18} ${y + 18} V${y - 24}" ${st} stroke-width="11" stroke-linecap="butt"/>`;
      case "pen": return `<path d="M${x - 22} ${y + 24} L${x - 18} ${y + 8} L${x + 14} ${y - 24} L${x + 26} ${y - 12} L${x - 6} ${y + 20} Z" ${st}/><path d="M${x + 6} ${y - 16} L${x + 18} ${y - 4}" ${st}/>`;
      case "forms": return `<rect x="${x - 22}" y="${y - 24}" width="44" height="54" rx="6" ${st}/><rect x="${x - 10}" y="${y - 31}" width="20" height="12" rx="3" fill="${c}"/><path d="M${x - 11} ${y - 2} l5 5 l9 -10 M${x - 11} ${y + 16} l5 5 l9 -10" ${st}/>`;
    }
    return "";
  }

  function lockBody(x, L, today) {
    const x0 = x - BODY_W / 2, y0 = LOCK_Y, yours = !L.theirs;
    const ink = yours ? "#1d1600" : "#fff";
    let s = `<g filter="url(#ds2)">${shackle(x)}`;
    s += `<rect x="${x0}" y="${y0}" width="${BODY_W}" height="${BODY_H}" rx="16" fill="url(#${yours ? "bodyYel" : "bodyRed"})"/>`;
    s += `<rect x="${x0}" y="${y0}" width="${BODY_W}" height="${BODY_H}" rx="16" fill="url(#gloss)"/></g>`;
    s += `<rect x="${x0 + 8}" y="${y0 + 7}" width="${BODY_W - 16}" height="7" rx="3.5" fill="#fff" opacity=".35"/>`;
    const k = iconOf(L);
    if (k) s += `<g opacity=".93">${icon(k, x, y0 + 56, ink)}</g>`;
    else s += T(x, y0 + 80, String(L.n), { size: 66, weight: 900, stretch: "normal", anchor: "middle", fill: ink, opacity: .92 });
    if (today) {
      s += `<g transform="rotate(-7 ${x} ${y0 + 112})" filter="url(#ds2)"><rect x="${x - 66}" y="${y0 + 94}" width="132" height="38" rx="4" fill="${yours ? "#111" : YEL}"/>
${T(x, y0 + 122, "TODAY", { size: 26, weight: 900, stretch: "expanded", anchor: "middle", fill: yours ? YEL : "#1b1500", ls: 2 })}</g>`;
    } else {
      s += `<circle cx="${x}" cy="${y0 + 112}" r="11" fill="#2a2d31"/><circle cx="${x}" cy="${y0 + 112}" r="7.5" fill="url(#screw)"/><rect x="${x - 1.6}" y="${y0 + 106}" width="3.2" height="12" fill="#2a2d31"/>`;
    }
    return s;
  }

  function stampSvg(cx, cy, text, color, rot) {
    const size = fit(text, TAG_W - 30, 30, 22, 800, "condensed");
    const w = Math.min(TAG_W - 10, tw(text, size, 800, "condensed") + 22);
    return `<g transform="translate(${cx},${cy}) rotate(${rot})" filter="url(#stamp)" opacity=".93">
<rect x="${-w / 2}" y="-23" width="${w}" height="46" rx="6" fill="none" stroke="${color}" stroke-width="4"/>
${T(0, size * .36, text, { size, weight: 800, stretch: "condensed", anchor: "middle", fill: color, ls: .5 })}</g>`;
  }

  function stamp2(cx, cy, lines, color, rot) {
    if (lines.length === 1) return stampSvg(cx, cy, lines[0], color, rot);
    const size = Math.min(...lines.map(l => fit(l, TAG_W - 34, 28, 20, 800, "condensed")));
    const w = Math.min(TAG_W - 10, Math.max(...lines.map(l => tw(l, size, 800, "condensed"))) + 24);
    return `<g transform="translate(${cx},${cy}) rotate(${rot})" filter="url(#stamp)" opacity=".93">
<rect x="${-w / 2}" y="-31" width="${w}" height="62" rx="6" fill="none" stroke="${color}" stroke-width="4"/>
${T(0, -4, lines[0], { size, weight: 800, stretch: "condensed", anchor: "middle", fill: color, ls: .5 })}${T(0, size - 2, lines[1], { size, weight: 800, stretch: "condensed", anchor: "middle", fill: color, ls: .5 })}</g>`;
  }
  const tagHeader = (x, y0, text, bg, fg) => `<rect x="${x - TAG_W / 2}" y="${y0 + 32}" width="${TAG_W}" height="44" fill="${bg}"/>` +
    T(x, y0 + 65, text, { size: fit(text, TAG_W - 12, 30, 22, 900, "condensed"), weight: 900, stretch: "condensed", anchor: "middle", fill: fg, ls: 1 });
  const NAME_SIZE = 44;
  const tagNameT = (x, y0, L, fill, op = 1) => {
    const max = TAG_W - 12, w = tw(L.holder, NAME_SIZE, 900, "extra-condensed");
    return T(x, y0 + 128, L.holder, { size: NAME_SIZE, weight: 900, stretch: "extra-condensed", anchor: "middle", fill, opacity: op,
      extra: w > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : "" });
  };
  const bigDate = (x, y, text, color) => T(x, y, text, { size: fit(text, TAG_W - 16, 44, 30, 900, "condensed"), weight: 900, stretch: "condensed", anchor: "middle", fill: color });

  function tag(x, L, st, date, i, plan) {
    const x0 = x - TAG_W / 2, y0 = TAG_Y, rot = [-2.2, 1.6, -1.2, 2.0, -1.8, 1.2, -2.6][i % 7];
    const yours = !L.theirs;
    let s = `<path d="M${x} ${LOCK_Y + BODY_H - 4} L${x} ${y0 + 22}" stroke="#15171a" stroke-width="6" stroke-linecap="round"/>`;
    s += `<g transform="rotate(${rot} ${x} ${y0 + 20})"><g filter="url(#ds2)"><rect x="${x0}" y="${y0}" width="${TAG_W}" height="${TAG_H}" rx="12" fill="#f5f2ea"/></g>`;
    s += tagHeader(x, y0, yours ? "YOUR KEY" : "THEIR KEY", yours ? YEL : RED, yours ? "#1d1600" : "#fff");
    s += `<circle cx="${x}" cy="${y0 + 16}" r="11" fill="#c9a24a"/><circle cx="${x}" cy="${y0 + 16}" r="11" fill="none" stroke="#7d6020" stroke-width="2"/><circle cx="${x}" cy="${y0 + 16}" r="6" fill="#24262a"/>`;
    s += tagNameT(x, y0, L, "#121212");
    const sy = y0 + 170, srot = [-6, 5, -4, 6, -5, 4, -6][i % 7];
    if (L.last) s += stampSvg(x, sy, L.last[1], /NUDGE|CALLED/.test(L.last[1]) ? INK_RED : (yours ? "#262626" : INK_BLUE), srot);
    else if (L.next && L.next[0] === date) s += stampSvg(x, sy, "START", AMBER, srot);
    else if (L.next) s += T(x, sy + 10, "FROM " + md(L.next[0]), { size: 26, weight: 800, stretch: "condensed", anchor: "middle", fill: "#6f6f6f" });
    s += `<line x1="${x0 + 12}" x2="${x0 + TAG_W - 12}" y1="${y0 + 202}" y2="${y0 + 202}" stroke="#d8d3c6" stroke-width="2"/>`;
    if (L.overdue) s += bigDate(x, y0 + 240, "OVERDUE", INK_RED);
    else if (L.dueToday) s += bigDate(x, y0 + 240, "DUE TODAY", AMBER);
    else s += bigDate(x, y0 + 240, md(L.due), "#141414");
    s += `</g>`;
    return s;
  }

  function ghost(x, L, i, cleared) {
    const x0 = x - BODY_W / 2, r = 30, yours = !L.theirs;
    let s = `<g opacity=".92">`;
    if (!cleared) s += `<path d="M${x - r} ${LOCK_Y + 8} V${HOLE_Y} a${r} ${r} 0 0 1 ${2 * r} 0 V${LOCK_Y + 8}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-dasharray="9 8"/>`;
    s += `<rect x="${x0}" y="${LOCK_Y}" width="${BODY_W}" height="${BODY_H}" rx="16" fill="#fff" fill-opacity=".03" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-dasharray="12 9"/>`;
    s += `<circle cx="${x}" cy="${LOCK_Y + 67}" r="38" fill="${GREEN}" fill-opacity=".14" stroke="${GREEN}" stroke-width="5"/>`;
    s += `<path d="M${x - 17} ${LOCK_Y + 68} l12 13 l24 -27" fill="none" stroke="${GREEN}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<rect x="${x - TAG_W / 2}" y="${TAG_Y}" width="${TAG_W}" height="${TAG_H}" rx="12" fill="#fff" fill-opacity=".04" stroke="#fff" stroke-opacity=".2" stroke-width="3" stroke-dasharray="10 8"/>`;
    s += tagHeader(x, TAG_Y, L.assumed ? "PLANNED" : yours ? "DONE" : "KEY BACK", "rgba(53,196,111,.18)", GREEN);
    s += tagNameT(x, TAG_Y, L, "#eef1f4", .9);
    const dd = diff(L.back, L.due);
    const tl = L.assumed ? ["ON PLAN"] : dd > 0 ? [`${dd} DAY${dd === 1 ? "" : "S"}`, "EARLY"] : dd < 0 ? [`${-dd} DAY${dd === -1 ? "" : "S"}`, "LATE"] : ["ON TIME"];
    s += stamp2(x, TAG_Y + 170, tl, dd < 0 ? AMBER : GREEN, [-6, 5, -4, 6, -5, 4, -6][i % 7]);
    s += bigDate(x, TAG_Y + 240, md(L.back), GREEN);
    s += `</g>`;
    return s;
  }

  function locksRow(st, date, plan) {
    const n = st.locks.length;
    let back = "", front = "";
    st.locks.forEach((L, i) => {
      const x = lockX(i, n);
      const today = !st.submitted && st.focus.has(L.id) && !L.off;
      if (today) back += `<ellipse cx="${x}" cy="${(LOCK_Y + TAG_Y + TAG_H) / 2}" rx="150" ry="330" fill="url(#spot)"/>`;
      if (L.off) front += ghost(x, L, i, st.submitted);
      else front += tag(x, L, st, date, i, plan) + lockBody(x, L, today);
    });
    return back + front;
  }

  function clearedBanner(n) {
    const y = 1556;
    return `<g opacity=".95">${T(645, y, "LOCKOUT CLEARED", { size: 74, weight: 900, stretch: "expanded", anchor: "middle", fill: GREEN, ls: 3 })}
${T(645, y + 52, `ALL ${n} LOCKS OFF · SWITCH ON`, { size: 28, weight: 800, stretch: "expanded", anchor: "middle", fill: "#cfe9d9", ls: 3 })}</g>`;
  }

  // ---- board ----
  function flipDigits(x, y, str) {
    const cw = 116, ch = 168, gap = 12;
    let s = "";
    [...str].forEach((c, k) => {
      const cx = x + k * (cw + gap);
      s += `<g filter="url(#ds2)"><rect x="${cx}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="url(#flip)"/></g>`;
      s += T(cx + cw / 2, y + ch / 2 + 52, c, { size: 146, weight: 800, stretch: "condensed", anchor: "middle", fill: "#f7f7f2" });
      s += `<rect x="${cx}" y="${y + ch / 2 - 2}" width="${cw}" height="4" fill="#0c0d0f"/>`;
      s += `<circle cx="${cx + 5}" cy="${y + ch / 2}" r="3" fill="#6d737b"/><circle cx="${cx + cw - 5}" cy="${y + ch / 2}" r="3" fill="#6d737b"/>`;
    });
    return { svg: s, w: str.length * cw + (str.length - 1) * gap };
  }

  function rail(st, plan, date, x1, x2, y) {
    const N = diff(plan.start, plan.deadline), X = d => x1 + (x2 - x1) * Math.max(0, Math.min(1, diff(plan.start, d) / N));
    const tx = X(date), day = Math.max(1, Math.min(N + 1, diff(plan.start, date) + 1));
    let s = `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="#3a4049" stroke-width="8" stroke-linecap="round"/>`;
    s += `<line x1="${x1}" x2="${tx}" y1="${y}" y2="${y}" stroke="${st.submitted ? GREEN : YEL}" stroke-width="8" stroke-linecap="round"/>`;
    const seen = {};
    st.locks.forEach(L => { const k = seen[L.due] = (seen[L.due] || 0) + 1; const yy = y - 16 * (k - 1);
      s += `<circle cx="${X(L.due)}" cy="${yy}" r="9" fill="${L.off ? GREEN : L.theirs ? RED : YEL}" stroke="#0f1114" stroke-width="3"/>`; });
    const sx = X(plan.submit);
    s += `<path d="M${sx} ${y - 22} V${y + 14}" stroke="${GREEN}" stroke-width="4"/><path d="M${sx} ${y - 22} h22 l-6 7 l6 7 h-22 Z" fill="${GREEN}"/>`;
    s += `<rect x="${x2 - 4}" y="${y - 16}" width="8" height="32" rx="3" fill="${RED}"/>`;
    s += `<circle cx="${tx}" cy="${y}" r="17" fill="none" stroke="#0f1114" stroke-width="9"/><circle cx="${tx}" cy="${y}" r="17" fill="none" stroke="#fff" stroke-width="5"/>`;
    s += T(x1, y + 48, md(plan.start), { family: "IBM Plex Mono", size: 25, weight: 600, stretch: "normal", fill: "#8b949e" });
    const dl = "DEADLINE " + md(plan.deadline), dlw = tw(dl, 25, 600, "normal", "IBM Plex Mono");
    s += T(x2, y + 48, dl, { family: "IBM Plex Mono", size: 25, weight: 600, stretch: "normal", anchor: "end", fill: "#ff8f95" });
    s += T(x2 - dlw - 22, y + 48, (plan.submitLabel || verbOf(plan)) + " " + md(plan.submit) + " ·", { family: "IBM Plex Mono", size: 25, weight: 600, stretch: "normal", anchor: "end", fill: "#7fdca4" });
    return s;
  }

  function board(st, plan, date) {
    const x0 = 56, y0 = 2090, w = 1178, h = 392;
    const on = st.submitted, V = verbOf(plan);
    const left = st.locks.filter(l => !l.off), theirsLeft = left.filter(l => l.theirs).length;
    let s = `<g filter="url(#ds)"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="24" fill="#0f1114"/></g>`;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="24" fill="none" stroke="url(#steelV)" stroke-width="6"/>`;
    s += `<path d="M${x0 + 3} ${y0 + 72} V${y0 + 24} a21 21 0 0 1 21 -21 H${x0 + w - 24} a21 21 0 0 1 21 21 V${y0 + 72} Z" fill="${on ? "#0f5e33" : st.blocked ? "#5a0b0f" : "#050506"}"/>`;
    if (on) {
      s += `<path d="M${x0 + 40} ${y0 + 38} l14 15 l28 -30" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
      const early = diff(plan.submit, plan.deadline);
      const head = st.deadlineDay ? `${doneOf(plan)} SINCE ${md(plan.submit)} · DEADLINE TONIGHT` : `${doneOf(plan)} ${wmd(plan.submit)}${early > 0 ? ` · ${early} DAY${early === 1 ? "" : "S"} EARLY` : ""}`;
      s += T(x0 + 100, y0 + 52, head, { size: fit(head, w - 140, 34, 22, 900, "expanded"), weight: 900, stretch: "expanded", fill: "#fff", ls: 1.5 });
    } else {
      s += `<ellipse cx="${x0 + 136}" cy="${y0 + 38}" rx="118" ry="27" fill="${RED}"/>`;
      s += T(x0 + 136, y0 + 50, "DANGER", { size: 33, weight: 900, stretch: "expanded", anchor: "middle", fill: "#fff", ls: 2 });
      let msg;
      if (st.blocked) msg = `${V} BLOCKED: ${left.length} LOCK${left.length === 1 ? "" : "S"} STILL ON`;
      else if (left.length && theirsLeft === 0 && st.submitDay) msg = plan.lastLock || `LAST LOCK IS YOURS: FINISH, THEN ${V}`;
      else if (left.length && theirsLeft === 0) msg = `ALL THEIR KEYS ARE BACK · FINISH YOURS`;
      else msg = ruleOf(plan, st.locks.length);
      s += T(x0 + 274, y0 + 50, msg, { size: fit(msg, w - 300, 32, 20, 800, "condensed"), weight: 800, stretch: "condensed", fill: "#fff", ls: 1 });
    }
    const by = y0 + 92;
    let num, caption;
    if (on) { num = String(Math.max(0, st.toDeadline)); caption = st.toDeadline <= 0 ? "DEADLINE TONIGHT" : st.toDeadline === 1 ? "DAY TO DEADLINE" : "DAYS TO DEADLINE"; }
    else if (st.submitDay) { num = "0"; caption = V + " TODAY"; }
    else if (st.toSubmit < 0) { num = String(Math.max(0, st.toDeadline)); caption = "TO DEADLINE"; }
    else { num = String(st.toSubmit); caption = (st.toSubmit === 1 ? "DAY TO " : "DAYS TO ") + V; }
    const fd = flipDigits(x0 + 34, by, num.padStart(2, "0"));
    s += fd.svg;
    s += T(x0 + 34 + fd.w / 2, by + 204, caption, { size: fit(caption, fd.w + 16, 27, 18, 800, "condensed"), weight: 800, stretch: "condensed", anchor: "middle", fill: YEL, ls: 1.5 });
    const tx = x0 + 34 + fd.w + 40;
    s += `<line x1="${tx - 20}" x2="${tx - 20}" y1="${by}" y2="${by + 210}" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>`;
    const dayN = Math.max(1, diff(plan.start, date) + 1), dayT = diff(plan.start, plan.deadline) + 1;
    s += T(tx, by + 26, `TODAY · ${wmd(date)} · DAY ${dayN}/${dayT}`, { family: "IBM Plex Mono", size: fit(`TODAY · ${wmd(date)} · DAY ${dayN}/${dayT}`, x0 + w - 30 - tx, 29, 20, 600, "normal", "IBM Plex Mono"), weight: 600, stretch: "normal", fill: YEL, ls: 1 });
    const maxW = x0 + w - 30 - tx;
    let size = 62, lines = wrap(st.task, maxW, size, 800, "condensed");
    while ((lines.length > 2 || lines.some(l => tw(l, size, 800, "condensed") > maxW)) && size > 36) { size -= 2; lines = wrap(st.task, maxW, size, 800, "condensed"); }
    const ly = lines.length === 1 ? by + 100 : by + 84;
    lines.forEach((l, k) => { s += T(tx, ly + k * (size * 1.02), l, { size, weight: 800, stretch: "condensed", fill: "#fff" }); });
    const nd = addDays(date, 1), tmr = (plan.days || {})[nd] || (nd <= plan.deadline ? [autoTask(plan, nd)] : null);
    if (lines.length === 1) {
      const nt = tmr && tmr[0] ? "NEXT · " + tmr[0] : date >= plan.deadline ? "NEXT · Rest. You're done." : "";
      if (nt) s += T(tx, by + 166, nt, { family: "IBM Plex Mono", size: fit(nt, maxW, 28, 18, 600, "normal", "IBM Plex Mono"), weight: 600, stretch: "normal", fill: "#d5dbe1" });
    }
    s += rail(st, plan, date, x0 + 60, x0 + w - 60, y0 + 318);
    return s;
  }

  function renderLockout({ plan, date, W = DW, H = DH, fontCSS = "" }) {
    const st = stateFor(plan, date);
    const n = st.locks.length;
    let body = background();
    body += stationPlate(plan);
    if (!st.submitted) body += cables(n);
    body += switchPlate(st, plan);
    if (!st.submitted) body += bar(n); else body += clearedBanner(n);
    body += locksRow(st, date, plan);
    body += board(st, plan, date);
    const style = fontCSS ? `<style>${fontCSS}</style>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${DW} ${DH}" preserveAspectRatio="xMidYMid slice">${style}${defs()}${body}</svg>`;
  }

  root.renderLockout = renderLockout;
  root.lockoutState = stateFor;
  root.lockoutUtil = { addDays, diff, md, wmd, iso };
})(typeof window !== "undefined" ? window : globalThis);
