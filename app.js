/* QuarantineCare - frontend-only prototype (data saved in the browser's localStorage) */
'use strict';

// ---------------------------------------------------------------- config
const CFG = { CAPACITY: 74, FEVER: 38.0, HIGH: 39.5, LOW: 35.0, HMIN: 34.0, HMAX: 42.5, DAYS: 3, BENCH: 0.15, MINCLOSED: 10 };
const TREAT = ['Supportive care (fluids, rest)', 'Antipyretic', 'Antiviral protocol', 'Oxygen support', 'Escalated / ICU care', 'Monitoring only'];
const STATUS = { ADMITTED: 'Admitted', CLEARED: 'Cleared for discharge', DISCHARGED: 'Discharged', DECEASED: 'Deceased' };
const KEY = 'quarantinecare_v1';
const NURSES = ['Nurse Anita Rao', 'Nurse Dev Patel', 'Nurse Maria Joseph'];
const DOCTORS = ['Dr. Mehta', 'Dr. Iyer', 'Dr. Khan'];
const FIRST = ['Aarav', 'Diya', 'Rohan', 'Meera', 'Kabir', 'Isha', 'Arjun', 'Priya', 'Vikram', 'Ananya', 'Rahul', 'Sneha', 'Imran', 'Fatima', 'Joseph', 'Maria', 'Suresh', 'Lakshmi', 'Nikhil', 'Pooja', 'Farhan', 'Kavya', 'Manish', 'Riya', 'Devansh', 'Tanvi', 'Karan', 'Neha', 'Yash', 'Aisha'];
const LAST = ['Sharma', 'Patel', 'Iyer', 'Khan', 'Das', 'Nair', 'Reddy', 'Singh', 'Joshi', 'Menon', 'Gupta', 'Shah', "D'Souza", 'Kulkarni', 'Verma', 'Bose', 'Chopra', 'Pillai', 'Mehra', 'Rao'];

// ---------------------------------------------------------------- helpers
const p2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const stamp = d => `${ymd(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const pd = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const dayAdd = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diff = (a, b) => Math.round((pd(a) - pd(b)) / 864e5);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = x => (x === undefined || x === null) ? '—' : x.toFixed(1) + '°C';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = s => { const d = pd(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const uni = (r, a, b) => a + r() * (b - a);
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// ---------------------------------------------------------------- state
let S;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
function load() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
const now = () => new Date(Date.now() + S.offset * 864e5);
const today = () => ymd(now());
const isActive = p => p.status === 'ADMITTED' || p.status === 'CLEARED';
const getP = id => S.patients.find(p => p.id === id);

function seed() {
  const r = rng(11), base = new Date(), td = ymd(base);
  const users = [...NURSES.map(n => ({ name: n, role: 'Nurse' })), ...DOCTORS.map(n => ({ name: n, role: 'Doctor' })), { name: 'Admin Sunita Kulkarni', role: 'Admin' }];
  const patients = [], temps = [], visits = [], used = new Set();
  let id = 1;
  const pname = () => { for (;;) { const n = pick(r, FIRST) + ' ' + pick(r, LAST); if (!used.has(n)) { used.add(n); return n; } } };
  const lim = stamp(new Date(base.getTime() - 5 * 60000));
  const mk = (day, h, m) => { const s = `${day} ${p2(h)}:${p2(m)}`; return s > lim ? lim : s; };
  // 40 closed cases, 5 deceased = 12.5%
  for (let i = 0; i < 40; i++) {
    const cd = dayAdd(td, -ri(r, 0, 13));
    patients.push({ id: id++, name: pname(), age: ri(r, 8, 85), sex: pick(r, ['Male', 'Female']), room: null, admittedAt: dayAdd(cd, -ri(r, 6, 14)) + ' 10:00', status: i < 5 ? 'DECEASED' : 'DISCHARGED', clearedAt: null, closedAt: mk(cd, ri(r, 9, 17), 0), notes: '' });
  }
  // 74 current patients - full occupancy
  for (let room = 1; room <= CFG.CAPACITY; room++) {
    const ago = pick(r, [0, 0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11]), admDay = dayAdd(td, -ago);
    const admitted = mk(admDay, ri(r, 7, 20), pick(r, [0, 15, 30, 45]));
    const fd = ri(r, 2, 8), fb = uni(r, 38.3, 39.8);
    const p = { id: id++, name: pname(), age: ri(r, 8, 85), sex: pick(r, ['Male', 'Female']), room, admittedAt: admitted, status: 'ADMITTED', clearedAt: null, closedAt: null, notes: '' };
    patients.push(p);
    const byday = {}, vdays = new Set();
    for (let i = 0; i <= ago; i++) {
      const day = dayAdd(admDay, i), isT = day === td;
      if (isT && r() > 0.45) continue;
      if (!isT && r() < 0.04) continue;
      const temp = i < fd ? +Math.max(38.1, fb - 0.1 * i + uni(r, -0.2, 0.2)).toFixed(1) : +uni(r, 36.5, 37.4).toFixed(1);
      byday[day] = temp;
      temps.push({ pid: p.id, day, temp, at: i === 0 ? admitted : mk(day, ri(r, 7, 10), ri(r, 0, 59)), by: pick(r, NURSES), corr: '' });
      if ((!isT && r() < 0.9) || (isT && r() < 0.4)) vdays.add(day);
    }
    if (streakFrom(byday, dayAdd(td, -1)) >= CFG.DAYS && r() < 0.4) {
      vdays.add(dayAdd(td, -1)); p.status = 'CLEARED'; p.clearedAt = dayAdd(td, -1) + ' 17:00';
    }
    vdays.forEach(day => {
      const fever = (byday[day] ?? 37) >= CFG.FEVER;
      visits.push({ pid: p.id, day, doctor: pick(r, DOCTORS), treatment: pick(r, fever ? TREAT.slice(0, 5) : [TREAT[0], TREAT[5]]), notes: '', at: mk(day, ri(r, 10, 15), 0) });
    });
  }
  return { offset: 0, users, patients, temps, visits, nextId: id };
}

// ---------------------------------------------------------------- domain logic
function streakFrom(byday, end) {
  let n = 0, d = end;
  for (;;) { const v = byday[d]; if (v === undefined || v >= CFG.FEVER) return n; n++; d = dayAdd(d, -1); }
}
function tempsOf(pid) { const o = {}; S.temps.filter(t => t.pid === pid).forEach(t => { o[t.day] = t.temp; }); return o; }

function board() {
  const t = today(), byp = {};
  S.temps.forEach(x => { (byp[x.pid] = byp[x.pid] || {})[x.day] = x.temp; });
  const vis = new Set(S.visits.filter(v => v.day === t).map(v => v.pid));
  return S.patients.filter(isActive).sort((a, b) => a.room - b.room).map(p => {
    const d = byp[p.id] || {}, tt = d[t], end = tt !== undefined ? t : dayAdd(t, -1), streak = streakFrom(d, end);
    const days = Object.keys(d).sort();
    return { ...p, dayN: diff(t, p.admittedAt) + 1, tempToday: tt, measured: tt !== undefined, visited: vis.has(p.id), lastTemp: days.length ? d[days[days.length - 1]] : undefined, streak, eligible: streak >= CFG.DAYS, eligSince: streak >= CFG.DAYS ? dayAdd(end, -(streak - CFG.DAYS)) : null };
  });
}
const freeRooms = () => { const occ = new Set(S.patients.filter(isActive).map(p => p.room)); const out = []; for (let i = 1; i <= CFG.CAPACITY; i++) if (!occ.has(i)) out.push(i); return out; };

function revokeIfCleared(p, why) { if (p.status === 'CLEARED') { p.status = 'ADMITTED'; p.clearedAt = null; return ` Discharge clearance was automatically revoked (${why}).`; } return ''; }

function admit(name, age, sex, user, force) {
  if (user.role !== 'Admin') return ['error', 'Only admin staff can admit patients.'];
  name = name.trim();
  if (name.length < 2) return ['error', "Enter the patient's full name."];
  const rooms = freeRooms();
  if (!rooms.length) return ['error', `Centre is full (${CFG.CAPACITY}/${CFG.CAPACITY}). Discharge a patient before admitting.`];
  if (!force && S.patients.some(p => isActive(p) && p.name.toLowerCase() === name.toLowerCase() && p.age === age)) return ['error', 'A patient with this name and age is already admitted. Tick the box to admit anyway.'];
  S.patients.push({ id: S.nextId++, name, age, sex, room: rooms[0], admittedAt: stamp(now()), status: 'ADMITTED', clearedAt: null, closedAt: null, notes: '' });
  save();
  return ['success', `${name} admitted to Room ${rooms[0]}. They now appear in the nurses' queue.`];
}

function recordTemp(pid, c, user) {
  if (user.role !== 'Nurse') return ['error', 'Only nurses can record temperatures.'];
  const p = getP(pid);
  if (!p || !isActive(p)) return ['error', 'This patient is not currently admitted.'];
  if (!(c >= CFG.HMIN && c <= CFG.HMAX)) return ['error', `${c.toFixed(1)}°C is not a plausible body temperature. Re-check the thermometer.`];
  const day = today();
  if (S.temps.some(x => x.pid === pid && x.day === day)) return ['error', "Temperature was already recorded for this patient today. Use 'Correct a reading' if it was a mistake."];
  S.temps.push({ pid, day, temp: +c.toFixed(1), at: stamp(now()), by: user.name, corr: '' });
  let kind = 'success', msg = `Recorded ${c.toFixed(1)}°C for ${p.name} (Room ${p.room}).`;
  if (c >= CFG.HIGH) { kind = 'error'; msg += ' 🚨 HIGH FEVER - inform the doctor immediately.'; }
  else if (c >= CFG.FEVER) { kind = 'warning'; msg += ' 🌡️ Fever - fever-free streak reset to 0.'; }
  else if (c < CFG.LOW) { kind = 'warning'; msg += ' Low reading - flagged for the doctor.'; }
  if (c >= CFG.FEVER) msg += revokeIfCleared(p, 'fever recorded');
  save();
  return [kind, msg];
}

function correctTemp(pid, c, reason, user) {
  if (user.role !== 'Nurse') return ['error', 'Only nurses can correct temperatures.'];
  if (reason.trim().length < 5) return ['error', 'A reason (at least 5 characters) is required for a correction.'];
  if (!(c >= CFG.HMIN && c <= CFG.HMAX)) return ['error', `${c.toFixed(1)}°C is not a plausible body temperature.`];
  const day = today(), row = S.temps.find(x => x.pid === pid && x.day === day);
  if (!row) return ['error', "Only today's readings can be corrected."];
  row.corr = `${reason.trim()} (was ${row.temp.toFixed(1)}°C; corrected by ${user.name})`;
  row.temp = +c.toFixed(1); row.at = stamp(now());
  let msg = `Reading corrected to ${c.toFixed(1)}°C.`;
  if (c >= CFG.FEVER) msg += revokeIfCleared(getP(pid), 'corrected reading is a fever');
  if (S.visits.some(v => v.pid === pid && v.day === day)) msg += ' ⚠️ The doctor has already visited today - let them know.';
  save();
  return ['success', msg];
}

function logVisit(pid, treatment, notes, user) {
  if (user.role !== 'Doctor') return ['error', 'Only doctors can log visits.'];
  const day = today(), t = S.temps.find(x => x.pid === pid && x.day === day);
  if (!t) return ['error', "Today's temperature has not been recorded yet. A nurse must do that first."];
  if (S.visits.some(v => v.pid === pid && v.day === day)) return ['error', 'A visit is already logged for this patient today.'];
  if (t.temp >= CFG.FEVER && treatment === 'Monitoring only') return ['error', "Patient has a fever today - choose an active treatment (not 'Monitoring only')."];
  if (t.temp >= CFG.HIGH && notes.trim().length < 5) return ['error', 'High fever today - clinical notes are required.'];
  S.visits.push({ pid, day, doctor: user.name, treatment, notes: notes.trim(), at: stamp(now()) });
  save();
  return ['success', 'Visit logged.'];
}

function canApprove(pid) {
  const t = today(), d = tempsOf(pid), reasons = [];
  if (d[t] === undefined) reasons.push("today's temperature has not been recorded");
  const streak = streakFrom(d, d[t] !== undefined ? t : dayAdd(t, -1));
  if (streak < CFG.DAYS) reasons.push(`needs ${CFG.DAYS} consecutive fever-free daily readings (currently ${streak})`);
  if (!S.visits.some(v => v.pid === pid && v.day === t)) reasons.push("log today's doctor visit first");
  return { ok: !reasons.length, reasons };
}
function approve(pid, user) {
  if (user.role !== 'Doctor') return ['error', 'Only doctors can approve a discharge.'];
  const c = canApprove(pid);
  if (!c.ok) return ['error', 'Cannot approve: ' + c.reasons.join('; ') + '.'];
  const p = getP(pid);
  if (p.status !== 'ADMITTED') return ['error', 'Patient is not in an approvable state.'];
  p.status = 'CLEARED'; p.clearedAt = stamp(now()); save();
  return ['success', 'Discharge approved. Admin staff can now discharge this patient.'];
}
function revoke(pid, user) {
  if (user.role !== 'Doctor') return ['error', 'Only doctors can revoke a clearance.'];
  const p = getP(pid); if (p && p.status === 'CLEARED') { p.status = 'ADMITTED'; p.clearedAt = null; save(); }
  return ['success', 'Clearance revoked.'];
}
function recordDeath(pid, cause, user) {
  if (user.role !== 'Doctor') return ['error', 'Only doctors can record a death.'];
  if (cause.trim().length < 5) return ['error', 'Please record the clinical notes / cause (at least 5 characters).'];
  const p = getP(pid); if (!p || !isActive(p)) return ['error', 'Patient is not currently admitted.'];
  p.status = 'DECEASED'; p.closedAt = stamp(now()); p.notes = cause.trim(); save();
  return ['success', 'Recorded. The room has been released and mortality statistics updated.'];
}
function discharge(pids, user) {
  if (user.role !== 'Admin') return ['error', 'Only admin staff can discharge patients.'];
  let n = 0;
  pids.forEach(id => { const p = getP(id); if (p && p.status === 'CLEARED') { p.status = 'DISCHARGED'; p.closedAt = stamp(now()); n++; } });
  save();
  return ['success', `${n} patient(s) discharged. ${n} room(s) are now free.`];
}

// ---------------------------------------------------------------- UI state
const ui = { user: null, page: null, flash: null, loginRole: 'Nurse', roundFilter: 'Ready for visit', roundPid: null, recPid: null, unit: 'C', patStatus: ['ADMITTED', 'CLEARED'], search: '', patPid: null };
const flash = (k, m) => { ui.flash = [k, m]; };
const ROLE_PAGES = {
  Nurse: [['queue', "🌡️ Today's queue"], ['record', '➕ Record temperature'], ['patients', '👥 Patients']],
  Doctor: [['rounds', '🩺 Rounds'], ['patients', '👥 Patients']],
  Admin: [['dashboard', '📊 Dashboard'], ['admissions', '🛏️ Admissions'], ['discharges', '🚪 Discharges'], ['patients', '👥 Patients']],
};

// ---------------------------------------------------------------- view helpers
const table = (heads, rows) => rows.length ? `<div class="tw"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nothing to show.</p>';
const metric = (l, v, sub, cls) => `<div class="metric"><div class="ml">${l}</div><div class="mv">${v}</div>${sub ? `<div class="ms ${cls || ''}">${sub}</div>` : ''}</div>`;
const msg = (k, t) => `<div class="msg ${k}">${t}</div>`;
const label = p => `Room ${p.room} · ${esc(p.name)} (${p.age}${esc((p.sex || '?')[0])})`;
const tempTag = t => t === undefined ? '<span class="muted">—</span>' : t >= CFG.HIGH ? `<span class="tag fever">🚨 ${fmtT(t)}</span>` : t >= CFG.FEVER ? `<span class="tag fever">${fmtT(t)}</span>` : `<span class="tag ok">${fmtT(t)}</span>`;
const progress = (v, tot) => `<div class="progress"><div style="width:${tot ? Math.round(v / tot * 100) : 0}%"></div></div>`;

function chart(pid) {
  const d = tempsOf(pid), days = Object.keys(d).sort();
  if (!days.length) return '<p class="muted">No temperature readings yet.</p>';
  const W = 640, H = 230, L = 40, R = 14, T = 12, B = 30;
  const vals = days.map(x => d[x]);
  const lo = Math.min(35.5, Math.min(...vals) - 0.3), hi = Math.max(40.5, Math.max(...vals) + 0.3);
  const first = days[0], span = Math.max(1, diff(days[days.length - 1], first));
  const X = day => L + (diff(day, first) / span) * (W - L - R), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const pts = days.map(x => `${X(x).toFixed(1)},${Y(d[x]).toFixed(1)}`).join(' ');
  const ticks = []; for (let v = Math.ceil(lo); v <= hi; v++) ticks.push(v);
  const step = Math.ceil(days.length / 8);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:760px" role="img" aria-label="Temperature chart">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e1e6ec"/><text x="${L - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="#6b7a8a">${v}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${Y(CFG.FEVER)}" y2="${Y(CFG.FEVER)}" stroke="#c0392b" stroke-dasharray="6 4"/>
    <polyline points="${pts}" fill="none" stroke="#0b6e99" stroke-width="2"/>
    ${days.map((x, i) => `<circle cx="${X(x)}" cy="${Y(d[x])}" r="4" fill="${d[x] >= CFG.FEVER ? '#c0392b' : '#0b6e99'}"><title>${shortDay(x)}: ${d[x].toFixed(1)}°C</title></circle>${i % step === 0 ? `<text x="${X(x)}" y="${H - 10}" font-size="11" text-anchor="middle" fill="#6b7a8a">${shortDay(x)}</text>` : ''}`).join('')}
  </svg><p class="muted" style="font-size:.8rem">Red dashed line = fever threshold (${CFG.FEVER.toFixed(1)}°C)</p>`;
}

function patientPanel(pid, role) {
  const p = getP(pid); if (!p) return '';
  const t = today(), d = tempsOf(pid), active = isActive(p);
  const streak = streakFrom(d, d[t] !== undefined ? t : dayAdd(t, -1));
  const last = p.closedAt ? p.closedAt.slice(0, 10) : t;
  let h = `<h3>${esc(p.name)} · ${p.age}${esc(p.sex[0])} · ${active ? 'Room ' + p.room : STATUS[p.status]}</h3>`;
  h += `<div class="metrics">${metric('Day in centre', diff(last, p.admittedAt) + 1)}${metric("Today's reading", active ? fmtT(d[t]) : '—')}${metric('Fever-free streak', `${streak}/${CFG.DAYS}`)}${metric('Status', STATUS[p.status])}</div>`;
  h += `<div class="card">${chart(pid)}</div>`;
  const temps = S.temps.filter(x => x.pid === pid).sort((a, b) => b.day.localeCompare(a.day));
  const visits = S.visits.filter(x => x.pid === pid).sort((a, b) => b.day.localeCompare(a.day));
  h += `<h4>Temperature log</h4>${table(['Date', 'Temp', 'Recorded by', 'Correction'], temps.map(x => [x.day, tempTag(x.temp), esc(x.by), esc(x.corr)]))}`;
  h += `<h4>Doctor visits</h4>${table(['Date', 'Doctor', 'Treatment', 'Notes'], visits.map(x => [x.day, esc(x.doctor), esc(x.treatment), esc(x.notes)]))}`;
  if (role === 'Doctor' && active) h += doctorActions(p, d);
  return h;
}

function doctorActions(p, d) {
  const t = today(), temp = d[t], visit = S.visits.find(v => v.pid === p.id && v.day === t);
  let h = '<hr><h4>Today\'s visit</h4>';
  if (temp === undefined) h += msg('error', '🚫 Today\'s temperature has not been recorded. A nurse must measure it before the doctor visit (this avoids doctors spending time taking temperatures themselves).');
  else if (visit) h += msg('success', `Visit logged at ${esc(visit.at.slice(11))} by ${esc(visit.doctor)} - ${esc(visit.treatment)}`);
  else {
    h += temp >= CFG.HIGH ? msg('error', `🚨 High fever today: ${fmtT(temp)}`) : temp >= CFG.FEVER ? msg('warning', `🌡️ Fever today: ${fmtT(temp)}`) : msg('info', `Today's reading: ${fmtT(temp)} (no fever)`);
    h += `<form data-form="visit" data-id="${p.id}" class="card"><label>Treatment</label><select name="treatment">${TREAT.map(x => `<option>${esc(x)}</option>`).join('')}</select><label>Clinical notes (required for high fever ≥ ${CFG.HIGH}°C)</label><textarea name="notes"></textarea><p><button class="primary" type="submit">Log visit</button></p></form>`;
  }
  h += '<h4>Discharge decision</h4>';
  if (p.status === 'CLEARED') h += msg('success', `Approved for discharge on ${esc(p.clearedAt)}. Waiting for admin to discharge.`) + `<button data-act="revoke" data-id="${p.id}">Revoke approval</button>`;
  else {
    const c = canApprove(p.id);
    if (c.ok) h += msg('success', `✅ Meets the criterion: ${CFG.DAYS}+ consecutive fever-free days.`) + `<button class="primary" data-act="approve" data-id="${p.id}">Approve discharge</button>`;
    else h += `<button disabled>Approve discharge</button><p class="muted">Not available yet: ${esc(c.reasons.join('; '))}.</p>`;
  }
  h += `<details><summary>Record death (irreversible)</summary><form data-form="death" data-id="${p.id}"><label>Clinical notes / cause</label><textarea name="cause"></textarea><label class="inline"><input type="checkbox" name="sure"> I confirm this patient has died</label><p><button class="danger" type="submit">Record death</button></p></form></details>`;
  return h;
}

// ---------------------------------------------------------------- pages
const PAGES = {
  queue() {
    const b = board(), total = b.length, done = b.filter(x => x.measured).length, pend = b.filter(x => !x.measured);
    let h = '<h2>🌡️ Today\'s temperature queue</h2>';
    h += `<div class="metrics">${metric('Patients in centre', total)}${metric('Measured today', done)}${metric('Still to measure', total - done)}${metric('Fever today', b.filter(x => x.tempToday >= CFG.FEVER).length)}</div>${progress(done, total)}`;
    if (!pend.length) h += msg('success', '🎉 Everyone has been measured today. No repeat readings needed.');
    else h += `<p><button class="primary" data-act="nav" data-v="record">➕ Record a temperature</button></p><h3>Not yet measured (${pend.length})</h3>` + table(['Room', 'Patient', 'Age', 'Day', 'Last reading', 'Fever-free streak'], pend.map(x => [x.room, esc(x.name), x.age, x.dayN, fmtT(x.lastTemp), x.streak]));
    const m = S.temps.filter(x => x.day === today() && isActive(getP(x.pid))).sort((a, b) => getP(a.pid).room - getP(b.pid).room);
    h += `<details style="margin-top:8px"><summary style="color:var(--ink)">Measured today (${done})</summary>${table(['Room', 'Patient', 'Temp', 'Time', 'By'], m.map(x => [getP(x.pid).room, esc(getP(x.pid).name), tempTag(x.temp), x.at.slice(11), esc(x.by)]))}</details>`;
    return h;
  },

  record() {
    const b = board(), pend = b.filter(x => !x.measured);
    let h = '<h2>➕ Record temperature</h2>';
    if (!pend.length) h += msg('success', '🎉 Everyone is already measured today.');
    else {
      if (!pend.some(x => x.id === ui.recPid)) ui.recPid = pend[0].id;
      const row = pend.find(x => x.id === ui.recPid), F = ui.unit === 'F';
      h += `<div class="card"><label>Patient (${pend.length} not yet measured today)</label><select data-change="recpid">${pend.map(x => `<option value="${x.id}" ${x.id === ui.recPid ? 'selected' : ''}>${label(x)}</option>`).join('')}</select>
      <p class="muted">Day ${row.dayN} · Last reading: ${fmtT(row.lastTemp)} · Fever-free streak: ${row.streak}/${CFG.DAYS}</p>
      <label>Unit</label><label class="inline"><input type="radio" name="u" data-change="unit" value="C" ${!F ? 'checked' : ''}> °C</label><label class="inline"><input type="radio" name="u" data-change="unit" value="F" ${F ? 'checked' : ''}> °F</label>
      <form data-form="record"><label>Reading (${F ? '°F' : '°C'})</label><input name="val" type="number" step="0.1" min="${F ? 86 : 30}" max="${F ? 113 : 45}" value="${F ? '98.6' : '37.0'}" required>
      <label class="inline"><input type="checkbox" name="confirm"> Confirm unusual reading (required if &lt; ${CFG.LOW.toFixed(1)}°C or ≥ ${CFG.HIGH.toFixed(1)}°C)</label>
      <p><button class="primary" type="submit">Save reading</button></p></form></div>`;
    }
    const done = S.temps.filter(x => x.day === today() && isActive(getP(x.pid)));
    h += `<details><summary style="color:var(--ink)">✏️ Correct a reading recorded today</summary>`;
    if (!done.length) h += '<p class="muted">No readings recorded yet today.</p>';
    else h += `<form data-form="correct" class="card"><label>Patient</label><select name="pid">${done.map(x => `<option value="${x.pid}">Room ${getP(x.pid).room} · ${esc(getP(x.pid).name)} - currently ${x.temp.toFixed(1)}°C</option>`).join('')}</select><label>Corrected reading (°C)</label><input name="val" type="number" step="0.1" min="30" max="45" value="37.0" required><label>Reason for correction (required)</label><input name="reason" style="width:100%"><p><button type="submit">Save correction</button></p></form>`;
    return h + '</details>';
  },

  rounds() {
    const b = board().map(x => ({ ...x, state: x.visited ? 'Visited' : x.measured ? 'Ready' : 'Waiting' }));
    const F = ui.roundFilter, cnt = s => b.filter(x => x.state === s).length;
    let h = '<h2>🩺 Doctor rounds</h2>';
    h += `<div class="metrics">${metric('Ready for visit', cnt('Ready'))}${metric('Waiting for nurse', cnt('Waiting'))}${metric('Visited today', cnt('Visited'))}${metric('Fever today', b.filter(x => x.tempToday >= CFG.FEVER).length)}</div>`;
    const filters = ['Ready for visit', 'Waiting for temperature', 'Visited today', 'Discharge-eligible', 'All'];
    h += `<div class="chips">${filters.map(f => `<button class="chip ${f === F ? 'on' : ''}" data-act="filter" data-v="${f}">${f}</button>`).join('')}</div>`;
    let v = F === 'Ready for visit' ? b.filter(x => x.state === 'Ready') : F === 'Waiting for temperature' ? b.filter(x => x.state === 'Waiting') : F === 'Visited today' ? b.filter(x => x.visited) : F === 'Discharge-eligible' ? b.filter(x => x.eligible && x.status === 'ADMITTED') : b;
    v = v.slice().sort((a, c) => ((c.tempToday ?? 0) >= CFG.FEVER) - ((a.tempToday ?? 0) >= CFG.FEVER) || (c.tempToday ?? 0) - (a.tempToday ?? 0) || a.room - c.room);
    if (!v.length) return h + msg('success', 'Nothing here right now.');
    if (!v.some(x => x.id === ui.roundPid)) ui.roundPid = F === 'Ready for visit' ? v[0].id : null;
    const st = x => x.state === 'Visited' ? '✔ Visited' : x.state === 'Ready' ? '✅ Ready for visit' : '⏳ Waiting for temperature';
    h += table(['Room', 'Patient', 'Today', 'Streak', 'Round status', 'Discharge', ''], v.map(x => [x.room, esc(x.name), tempTag(x.tempToday), x.streak, st(x), x.status === 'CLEARED' ? '<span class="tag ok">🟢 Cleared</span>' : x.eligible ? '<span class="tag warn">✔ Eligible</span>' : '', `<button class="small" data-act="openround" data-id="${x.id}">Open chart</button>`]));
    if (ui.roundPid) h += '<hr>' + patientPanel(ui.roundPid, 'Doctor');
    return h;
  },

  dashboard() {
    const b = board(), occ = b.length, t = today();
    const closed = S.patients.filter(p => p.status === 'DISCHARGED' || p.status === 'DECEASED');
    const deaths = closed.filter(p => p.status === 'DECEASED').length, mort = closed.length ? deaths / closed.length : 0;
    const wkLim = stamp(new Date(now().getTime() - 7 * 864e5)), wk = closed.filter(p => p.closedAt >= wkLim);
    const mort7 = wk.length ? wk.filter(p => p.status === 'DECEASED').length / wk.length : 0;
    const pc = x => (x * 100).toFixed(1) + '%';
    let h = '<h2>📊 Centre dashboard</h2>';
    if (closed.length < CFG.MINCLOSED) h += msg('info', `Only ${closed.length} closed cases so far - mortality is not yet statistically meaningful.`);
    else if (mort > CFG.BENCH) h += msg('error', `🚨 Mortality rate ${pc(mort)} is ABOVE the ${pc(CFG.BENCH)} benchmark. Review treatment protocols.`);
    else if (mort > CFG.BENCH - 0.03) h += msg('warning', `⚠️ Mortality rate ${pc(mort)} is close to the ${pc(CFG.BENCH)} benchmark.`);
    else h += msg('success', `Mortality rate ${pc(mort)} is within the ${pc(CFG.BENCH)} benchmark.`);
    const dm = (mort - CFG.BENCH) * 100, ds = ((1 - mort) - (1 - CFG.BENCH)) * 100;
    h += `<div class="metrics">${metric('Occupancy', `${occ}/${CFG.CAPACITY}`, `${CFG.CAPACITY - occ} free`)}${metric('Mortality (all closed cases)', pc(mort), `${dm >= 0 ? '+' : ''}${dm.toFixed(1)} pp vs 15%`, dm > 0 ? 'bad' : 'good')}${metric('Success rate', pc(1 - mort), `${ds >= 0 ? '+' : ''}${ds.toFixed(1)} pp vs 85%`, ds < 0 ? 'bad' : 'good')}${metric('Last 7 days mortality', pc(mort7), `${wk.length} closed cases`)}</div>`;
    const waiting = b.filter(x => x.status === 'ADMITTED' && x.eligible), cleared = b.filter(x => x.status === 'CLEARED');
    const wd = waiting.map(x => diff(t, x.eligSince)), cd = cleared.map(x => diff(t, x.clearedAt));
    const all = wd.concat(cd);
    h += `<div class="metrics">${metric('Temperatures done today', `${b.filter(x => x.measured).length}/${occ}`)}${metric('Doctor visits done today', `${b.filter(x => x.visited).length}/${occ}`)}${metric('Delayed discharges', all.filter(x => x >= 1).length, `${all.reduce((a, x) => a + Math.max(0, x), 0)} bed-days lost`)}${metric('Fever today', b.filter(x => x.tempToday >= CFG.FEVER).length)}</div>`;
    const byDay = {}; closed.forEach(p => { const k = p.closedAt.slice(0, 10); (byDay[k] = byDay[k] || { d: 0, x: 0 })[p.status === 'DECEASED' ? 'x' : 'd']++; });
    const keys = Object.keys(byDay).sort(), mx = Math.max(1, ...keys.map(k => byDay[k].d + byDay[k].x));
    h += `<h3>Outcomes by day</h3><div class="card"><div class="bars">${keys.map(k => `<div class="bar"><div class="seg x" style="height:${byDay[k].x / mx * 120}px" title="Deceased"></div><div class="seg d" style="height:${byDay[k].d / mx * 120}px" title="Discharged"></div>${k.slice(8)}</div>`).join('')}</div><span class="tag ok">■ Discharged</span> <span class="tag fever">■ Deceased</span></div>`;
    const rows = [];
    waiting.forEach((x, i) => { if (wd[i] >= 1) rows.push([x.room, esc(x.name), 'Eligible - awaiting doctor approval', wd[i]]); });
    cleared.forEach((x, i) => { if (cd[i] >= 1) rows.push([x.room, esc(x.name), 'Approved - not yet discharged by admin', cd[i]]); });
    rows.sort((a, c) => c[3] - a[3]);
    h += '<h3>Needs attention: discharge delays</h3>' + (rows.length ? table(['Room', 'Patient', 'Issue', 'Days'], rows) : msg('success', 'No delayed discharges.'));
    return h;
  },

  admissions() {
    const free = freeRooms();
    let h = `<h2>🛏️ Admissions</h2><div class="metrics">${metric('Free rooms', `${free.length} of ${CFG.CAPACITY}`)}</div>`;
    if (!free.length) h += msg('error', 'Centre is at full capacity. Admissions are disabled until a patient is discharged.');
    h += `<form data-form="admit" class="card"><label>Full name</label><input name="name" style="width:100%" required><div class="row"><div><label>Age</label><input name="age" type="number" min="0" max="120" value="30"></div><div><label>Sex</label><select name="sex"><option>Female</option><option>Male</option><option>Other</option></select></div></div>
    <label class="inline"><input type="checkbox" name="dup"> Admit even if a patient with the same name &amp; age is already in the centre</label><p><button class="primary" type="submit" ${free.length ? '' : 'disabled'}>Admit patient</button></p></form>`;
    return h;
  },

  discharges() {
    const b = board(), t = today(), cleared = b.filter(x => x.status === 'CLEARED'), waiting = b.filter(x => x.status === 'ADMITTED' && x.eligible).sort((a, c) => a.eligSince.localeCompare(c.eligSince));
    let h = `<h2>🚪 Discharges</h2><h3>Approved by doctor - ready to discharge (${cleared.length})</h3>`;
    if (!cleared.length) h += msg('info', 'No patients are waiting to be discharged.');
    else h += `<form data-form="discharge" class="card">${cleared.map(x => `<label class="inline"><input type="checkbox" name="pid" value="${x.id}" checked> ${label(x)} - approved ${esc(x.clearedAt)} (${diff(t, x.clearedAt)} day(s) waiting)</label>`).join('')}<p><button class="primary" type="submit">Discharge selected</button></p></form>`;
    h += '<h3>Eligible but not yet approved by a doctor</h3>';
    h += waiting.length ? table(['Room', 'Patient', 'Eligible since', 'Days waiting'], waiting.map(x => [x.room, esc(x.name), x.eligSince, diff(t, x.eligSince)])) + '<p class="muted">Only doctors can approve a discharge.</p>' : '<p class="muted">None.</p>';
    return h;
  },

  patients() {
    let list = S.patients.filter(p => ui.patStatus.includes(p.status));
    const s = ui.search.trim().toLowerCase();
    if (s) list = list.filter(p => p.name.toLowerCase().includes(s) || String(p.room) === s);
    list = list.slice().sort((a, b) => a.status.localeCompare(b.status) || (a.room ?? 999) - (b.room ?? 999) || a.name.localeCompare(b.name));
    let h = '<h2>👥 Patients</h2><div class="card"><div class="row"><div>' + Object.keys(STATUS).map(k => `<label class="inline" style="display:inline-flex;margin-right:12px"><input type="checkbox" data-change="patstatus" value="${k}" ${ui.patStatus.includes(k) ? 'checked' : ''}> ${STATUS[k]}</label>`).join('') + `</div><div><input data-change="search" placeholder="Search name or room" value="${esc(ui.search)}"></div></div></div>`;
    h += table(['Room', 'Patient', 'Age', 'Sex', 'Status', 'Admitted', 'Closed', ''], list.map(p => [p.room ?? '—', esc(p.name), p.age, esc(p.sex), STATUS[p.status], p.admittedAt, p.closedAt || '', `<button class="small" data-act="openpat" data-id="${p.id}">Open chart</button>`]));
    if (ui.patPid && getP(ui.patPid)) h += '<hr>' + patientPanel(ui.patPid, ui.user.role);
    return h;
  },
};

// ---------------------------------------------------------------- shell
function loginView() {
  const names = S.users.filter(u => u.role === ui.loginRole).map(u => u.name);
  const mark = ['Record / correct today\'s temperature|✅|—|—', 'See today\'s temperature queue|✅|—|—', 'Log doctor visit & treatment|—|✅ (after temp)|—', 'Approve discharge / record death|—|✅|—', 'Admit patient|—|—|✅', 'Discharge patient (free the room)|—|—|✅ (after approval)', 'View dashboard & mortality KPIs|—|—|✅', 'View patient charts|✅ read-only|✅|✅ read-only'];
  return `<div class="login"><div class="card"><h1>🏥 QuarantineCare</h1><p class="muted">Temperature tracking &amp; discharge management for the virus quarantine centre - prototype</p>
  <label>I am a…</label>${['Nurse', 'Doctor', 'Admin'].map(r => `<label class="inline" style="display:inline-flex;margin-right:12px"><input type="radio" name="role" data-change="role" value="${r}" ${ui.loginRole === r ? 'checked' : ''}> ${r}</label>`).join('')}
  <label>Name</label><select id="login-name">${names.map(n => `<option>${esc(n)}</option>`).join('')}</select>
  <p><button class="primary" data-act="signin">Sign in</button></p><p class="muted" style="font-size:.8rem">Prototype: no password. Production would use SSO / PIN per staff member.</p>
  <p><button class="small" data-act="reset">Reset demo data</button></p></div>
  <div class="card"><h3>Who can do what</h3>${table(['Action', 'Nurse', 'Doctor', 'Admin'], mark.map(x => x.split('|')))}</div></div>`;
}

function shell() {
  const pages = ROLE_PAGES[ui.user.role];
  if (!pages.some(p => p[0] === ui.page)) ui.page = pages[0][0];
  const f = ui.flash; ui.flash = null;
  const body = PAGES[ui.page]();
  return `<div class="layout"><aside><div class="brand">🏥 QuarantineCare</div><div class="who"><b>${esc(ui.user.name)}</b><br>${ui.user.role}<br>📅 ${esc(stamp(now()))}${S.offset ? ` (demo day +${S.offset})` : ''}</div>
  ${pages.map(([k, l]) => `<button class="nav ${k === ui.page ? 'active' : ''}" data-act="nav" data-v="${k}">${l}</button>`).join('')}
  <div class="sub"><b>🧪 Demo tools</b><br><button class="small" data-act="advance">Advance to next day ▶</button><br><button class="small" data-act="reset">Reset demo data</button><br><button class="small" data-act="signout">Sign out</button></div></aside>
  <main>${f ? msg(f[0], f[1]) : ''}${body}</main></div>`;
}

function render() { document.getElementById('app').innerHTML = ui.user ? shell() : loginView(); }

// ---------------------------------------------------------------- events
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = Number(el.dataset.id), u = ui.user;
  if (a === 'signin') { const name = document.getElementById('login-name').value; ui.user = S.users.find(x => x.name === name); ui.page = null; }
  else if (a === 'signout') { ui.user = null; ui.page = null; }
  else if (a === 'nav') { ui.page = el.dataset.v; }
  else if (a === 'filter') { ui.roundFilter = el.dataset.v; ui.roundPid = null; }
  else if (a === 'openround') { ui.roundPid = id; }
  else if (a === 'openpat') { ui.patPid = id; }
  else if (a === 'approve') { flash(...approve(id, u)); }
  else if (a === 'revoke') { flash(...revoke(id, u)); }
  else if (a === 'advance') { S.offset++; save(); flash('info', 'Moved to the next day - everyone needs a fresh temperature reading and visit.'); }
  else if (a === 'reset') { if (!window.confirm('Reset all demo data?')) return; S = seed(); save(); ui.roundPid = ui.patPid = ui.recPid = null; flash('info', 'Demo data reset.'); }
  render();
});

document.addEventListener('change', e => {
  const el = e.target, k = el.dataset && el.dataset.change; if (!k) return;
  if (k === 'role') ui.loginRole = el.value;
  else if (k === 'recpid') ui.recPid = Number(el.value);
  else if (k === 'unit') ui.unit = el.value;
  else if (k === 'search') ui.search = el.value;
  else if (k === 'patstatus') ui.patStatus = [...document.querySelectorAll('[data-change="patstatus"]')].filter(x => x.checked).map(x => x.value);
  render();
});

document.addEventListener('submit', e => {
  const f = e.target; if (!f.dataset.form) return;
  e.preventDefault();
  const fd = new FormData(f), u = ui.user, kind = f.dataset.form;
  if (kind === 'record') {
    let c = parseFloat(fd.get('val')); if (ui.unit === 'F') c = (c - 32) / 1.8; c = Math.round(c * 10) / 10;
    if (!fd.get('confirm') && (c < CFG.LOW || c >= CFG.HIGH) && c >= CFG.HMIN && c <= CFG.HMAX) flash('error', `${c.toFixed(1)}°C is unusual. Re-check the thermometer and tick the confirmation box to save.`);
    else flash(...recordTemp(ui.recPid, c, u));
  } else if (kind === 'correct') flash(...correctTemp(Number(fd.get('pid')), parseFloat(fd.get('val')), fd.get('reason') || '', u));
  else if (kind === 'visit') flash(...logVisit(Number(f.dataset.id), fd.get('treatment'), fd.get('notes') || '', u));
  else if (kind === 'death') { if (!fd.get('sure')) flash('error', 'Tick the confirmation box.'); else flash(...recordDeath(Number(f.dataset.id), fd.get('cause') || '', u)); }
  else if (kind === 'admit') flash(...admit(fd.get('name') || '', parseInt(fd.get('age'), 10) || 0, fd.get('sex'), u, !!fd.get('dup')));
  else if (kind === 'discharge') { const ids = fd.getAll('pid').map(Number); flash(...(ids.length ? discharge(ids, u) : ['error', 'Select at least one patient.'])); }
  render();
});

S = load() || seed();
save();
render();
