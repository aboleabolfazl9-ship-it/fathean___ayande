/* ==========================================================================
   store.js  —  مدیریت داده‌ها، حساب‌ها، نشست، جنم و تنظیمات
   فعلاً همه‌چیز در localStorage مرورگر ذخیره می‌شود (بدون سرور).
   وقتی هاست خریدید، فقط توابع این فایل را به API وصل کنید.
   ========================================================================== */
import { CLASSES } from "./data.js";
import { EXAMS, ADMIN, LOGIN_LOCK } from "./config.js";
import { hashPassword, randomSalt, recoveryCode } from "./crypto.js";

const NS = "fatehan:v1:";
const read = (k, d) => {
  try {
    const v = localStorage.getItem(NS + k);
    return v ? JSON.parse(v) : d;
  } catch { return d; }
};
const write = (k, v) => {
  try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch { /* حافظه پر یا ممنوع */ }
};

/* ---------- دانش‌آموزان ---------- */
export const classes = CLASSES.map((c) => ({ ...c }));
export const students = [];
classes.forEach((c) => {
  c.students.forEach((s, i) => {
    students.push({
      id: `${c.id}-${i + 1}`,
      name: s.name,
      role: s.role || "",
      baseGems: Number(s.gems) || 0,
      classId: c.id,
      classLabel: c.label,
      order: students.length,
    });
  });
});
const byId = new Map(students.map((s) => [s.id, s]));
export const getStudent = (id) => byId.get(id);
export const studentsOf = (classId) => students.filter((s) => s.classId === classId);
export const getClass = (id) => classes.find((c) => c.id === id);
export const findByName = (name) => students.find((s) => s.name === name);

/* ---------- رویدادها ---------- */
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());

/* ---------- جنم ---------- */
let log = read("log", []);
let deltas = new Map();
function rebuild() {
  deltas = new Map();
  log.forEach((l) => deltas.set(l.sid, (deltas.get(l.sid) || 0) + l.delta));
}
rebuild();

export const gems = (sid) => (byId.get(sid)?.baseGems || 0) + (deltas.get(sid) || 0);
export const localDelta = (sid) => deltas.get(sid) || 0;
export const totalGems = (list = students) => list.reduce((a, s) => a + gems(s.id), 0);

export function ranking() {
  return [...students].sort((a, b) => gems(b.id) - gems(a.id) || a.order - b.order);
}
export const rankOf = (sid) => ranking().findIndex((s) => s.id === sid) + 1;

export function addGem(sid, delta, reason, silent = false) {
  if (!isAdmin() || !byId.has(sid) || !Number.isFinite(delta) || delta === 0) return false;
  log.unshift({ id: Date.now() + Math.random(), sid, delta, reason: reason || "", ts: Date.now() });
  if (log.length > 3000) log.length = 3000;
  write("log", log);
  rebuild();
  if (!silent) emit();
  return true;
}
export const notify = () => emit();
export function removeLog(id) {
  if (!isAdmin()) return;
  log = log.filter((l) => l.id !== id);
  write("log", log);
  rebuild();
  emit();
}
export const logFor = (sid) => log.filter((l) => l.sid === sid);
export const allLog = () => log;
export function clearLog() { log = []; write("log", log); rebuild(); emit(); }

/* ---------- حساب‌ها ---------- */
let accounts = read("accounts", {});
export const hasAccount = (sid) => !!accounts[sid];
export const registeredCount = () => Object.keys(accounts).length;

export function register(sid, password) {
  if (!byId.has(sid)) return { ok: false, error: "دانش‌آموز نامعتبر است." };
  if (accounts[sid]) return { ok: false, error: "برای این نام قبلاً حساب ساخته شده است." };
  const salt = randomSalt();
  const code = recoveryCode();
  accounts[sid] = {
    salt,
    hash: hashPassword(password, salt),
    rsalt: salt,
    rhash: hashPassword(code, salt),
    created: Date.now(),
  };
  write("accounts", accounts);
  setSession(sid, true);
  emit();
  return { ok: true, code };
}

/* ---------- قفل تلاش ناموفق ---------- */
let locks = read("locks", {});
function lockState(key) {
  const l = locks[key];
  if (l && l.until && l.until > Date.now()) return Math.ceil((l.until - Date.now()) / 1000);
  return 0;
}
function fail(key) {
  const l = locks[key] || { count: 0 };
  l.count = (l.until && l.until <= Date.now() ? 0 : l.count) + 1;
  if (l.count >= LOGIN_LOCK.maxAttempts) { l.until = Date.now() + LOGIN_LOCK.lockSeconds * 1000; l.count = 0; }
  locks[key] = l;
  write("locks", locks);
  return { left: LOGIN_LOCK.maxAttempts - l.count, locked: lockState(key) };
}
const success = (key) => { delete locks[key]; write("locks", locks); };

function check(key, ok, errMsg) {
  const sec = lockState(key);
  if (sec) return { ok: false, error: `به‌دلیل تلاش‌های ناموفق، ${sec} ثانیه صبر کنید.`, locked: sec };
  if (ok()) { success(key); return { ok: true }; }
  const f = fail(key);
  if (f.locked) return { ok: false, error: `ورود موقتاً قفل شد. ${f.locked} ثانیه صبر کنید.`, locked: f.locked };
  return { ok: false, error: `${errMsg} (${f.left} تلاش باقی‌مانده)` };
}

export function login(sid, password, remember) {
  const acc = accounts[sid];
  if (!acc) return { ok: false, error: "برای این نام هنوز ثبت‌نام انجام نشده است." };
  const r = check("u:" + sid, () => hashPassword(password, acc.salt) === acc.hash, "رمز عبور اشتباه است");
  if (r.ok) setSession(sid, remember);
  return r;
}

export function recover(sid, code, newPass) {
  const acc = accounts[sid];
  if (!acc) return { ok: false, error: "حسابی برای این نام وجود ندارد." };
  const norm = code.trim().toUpperCase();
  const r = check("r:" + sid, () => hashPassword(norm, acc.rsalt) === acc.rhash, "کد بازیابی اشتباه است");
  if (!r.ok) return r;
  const salt = randomSalt();
  const nc = recoveryCode();
  accounts[sid] = { ...acc, salt, hash: hashPassword(newPass, salt), rsalt: salt, rhash: hashPassword(nc, salt) };
  write("accounts", accounts);
  setSession(sid, true);
  emit();
  return { ok: true, code: nc };
}

export function changePassword(sid, oldPass, newPass) {
  const acc = accounts[sid];
  if (!acc || hashPassword(oldPass, acc.salt) !== acc.hash) return { ok: false, error: "رمز فعلی اشتباه است." };
  const salt = randomSalt();
  accounts[sid] = { ...acc, salt, hash: hashPassword(newPass, salt), rsalt: acc.rsalt };
  // کد بازیابی با نمک قبلی ساخته شده؛ نمک بازیابی جدا نگه داشته می‌شود
  write("accounts", accounts);
  return { ok: true };
}

export function deleteAccount(sid) {
  if (!isAdmin()) return;
  delete accounts[sid];
  write("accounts", accounts);
  if (getSessionId() === sid) logout();
  emit();
}

/* ---------- نشست ---------- */
export function setSession(sid, remember) {
  sessionStorage.setItem(NS + "sid", sid);
  if (remember) write("sid", sid); else localStorage.removeItem(NS + "sid");
}
export function getSessionId() {
  const s = sessionStorage.getItem(NS + "sid") || read("sid", null);
  return s && byId.has(s) && accounts[s] ? s : null;
}
export function logout() {
  sessionStorage.removeItem(NS + "sid");
  localStorage.removeItem(NS + "sid");
  emit();
}

/* ---------- مدیر ---------- */
export const isAdmin = () => sessionStorage.getItem(NS + "admin") === "1";
export function adminLogin(pass) {
  const r = check("admin", () => hashPassword(pass, ADMIN.salt) === ADMIN.hash, "رمز مدیر اشتباه است");
  if (r.ok) { sessionStorage.setItem(NS + "admin", "1"); emit(); }
  return r;
}
export function adminLogout() { sessionStorage.removeItem(NS + "admin"); emit(); }
export const makeAdminHash = (pass) => hashPassword(pass, ADMIN.salt);

/* ---------- امتحانات ---------- */
let exams = read("exams", null) || EXAMS.map((e) => ({ ...e }));
export const getExams = () => exams;
export function saveExams(list) { exams = list; write("exams", exams); emit(); }

/* ---------- تنظیمات ---------- */
const defaults = { theme: "dark", accent: "gold", motion: true, font: 100, compact: false };
let settings = { ...defaults, ...read("settings", {}) };
export const getSettings = () => settings;
export function setSetting(k, v) { settings = { ...settings, [k]: v }; write("settings", settings); }

/* ---------- پشتیبان‌گیری ---------- */
export function exportBackup() {
  return JSON.stringify({ v: 1, log, accounts, exams, settings, at: Date.now() }, null, 2);
}
export function importBackup(text) {
  try {
    const d = JSON.parse(text);
    if (!d || d.v !== 1) throw new Error("bad");
    log = d.log || []; accounts = d.accounts || {}; exams = d.exams || exams;
    write("log", log); write("accounts", accounts); write("exams", exams);
    rebuild(); emit();
    return true;
  } catch { return false; }
}
export function wipeAll() {
  Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
  location.reload();
}

/* ---------- خروجی کد data.js با جنم نهایی ---------- */
export function exportDataJs() {
  const lines = classes.map((c) => {
    const rows = studentsOf(c.id).map((s) => {
      const role = s.role ? `, role: "${s.role}"` : "";
      return `      { name: "${s.name}", gems: ${gems(s.id)}${role} },`;
    });
    return `  {\n    id: "${c.id}",\n    grade: ${c.grade},\n    title: "${c.title}",\n    label: "${c.label}",\n    students: [\n${rows.join("\n")}\n    ],\n  },`;
  });
  return `export const CLASSES = [\n${lines.join("\n")}\n];\n`;
}
